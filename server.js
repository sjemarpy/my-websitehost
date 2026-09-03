const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { GridFSBucket, ObjectId } = require("mongodb");

const app = express();

/* =========================================================
   CONFIG
========================================================= */

const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI;

// Render-এ ADMIN_PASS না দিলেও server crash করবে না.
// Production-এ অবশ্যই নিজের password দিয়ে ADMIN_PASS সেট করবে।
const ADMIN_PASS = process.env.ADMIN_PASS || "py.py.php";

const USER_DAILY_LIMIT = 5;
const GLOBAL_DAILY_LIMIT = 250;

const USER_MAX_BYTES = 1 * 1024 * 1024;       // 1MB
const ADMIN_MAX_BYTES = 50 * 1024 * 1024;     // 50MB

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing.");
  process.exit(1);
}

/* =========================================================
   EXPRESS
========================================================= */

app.disable("x-powered-by");

app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

/* =========================================================
   RATE LIMIT
========================================================= */

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "অনেক বেশি request। কিছুক্ষণ পরে চেষ্টা করুন।"
  }
});

app.use("/api/", apiLimiter);

/* =========================================================
   DATABASE SCHEMAS
========================================================= */

const pageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 80
  },

  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  sizeBytes: {
    type: Number,
    required: true
  },

  ownerKey: {
    type: String,
    required: true,
    index: true
  },

  ownerType: {
    type: String,
    enum: ["user", "admin"],
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },

  description: {
    type: String,
    default: "",
    maxlength: 500
  },

  link: {
    type: String,
    default: "",
    maxlength: 1000
  },

  badge: {
    type: String,
    default: "",
    maxlength: 40
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const usageSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },

  date: {
    type: String,
    required: true,
    index: true
  },

  ownerKey: {
    type: String,
    required: true,
    index: true
  },

  count: {
    type: Number,
    default: 0
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const banSchema = new mongoose.Schema({
  ownerKey: {
    type: String,
    required: true,
    unique: true
  },

  reason: {
    type: String,
    default: ""
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Page = mongoose.model("Page", pageSchema);
const Task = mongoose.model("Task", taskSchema);
const DailyUsage = mongoose.model("DailyUsage", usageSchema);
const BannedUser = mongoose.model("BannedUser", banSchema);

let bucket = null;

/* =========================================================
   HELPERS
========================================================= */

function getDateKey() {
  const d = new Date();

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function getClientIP(req) {
  return String(
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown"
  )
    .split(",")[0]
    .trim();
}

function getUserKey(req) {
  return crypto
    .createHash("sha256")
    .update(`sjemar:${getClientIP(req)}`)
    .digest("hex");
}

function cleanSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 80);
}

function isAdmin(req) {
  return req.get("x-admin-pass") === ADMIN_PASS;
}

async function isBanned(req) {
  const key = getUserKey(req);

  return Boolean(
    await BannedUser.exists({
      ownerKey: key
    })
  );
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({
      error: "Admin password ভুল।"
    });
  }

  next();
}

/* =========================================================
   DAILY COUNTER
========================================================= */

async function increaseUsage(
  key,
  ownerKey,
  limit
) {
  const date = getDateKey();

  try {
    const result = await DailyUsage.findOneAndUpdate(
      {
        key,
        count: {
          $lt: limit
        }
      },
      {
        $inc: {
          count: 1
        },

        $set: {
          updatedAt: new Date(),
          date,
          ownerKey
        },

        $setOnInsert: {
          key
        }
      },
      {
        new: true,
        upsert: true
      }
    ).lean();

    return Boolean(result);

  } catch (error) {

    // Concurrent request হলে duplicate key হতে পারে
    if (error && error.code === 11000) {
      return false;
    }

    throw error;
  }
}

async function decreaseUsage(
  key
) {
  try {
    await DailyUsage.findOneAndUpdate(
      {
        key,
        count: {
          $gt: 0
        }
      },
      {
        $inc: {
          count: -1
        },

        $set: {
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error("Usage rollback error:", error);
  }
}

/* =========================================================
   QUOTA
========================================================= */

async function consumeQuota(req) {

  const owner = getUserKey(req);
  const date = getDateKey();

  const userKey = `${date}:user:${owner}`;
  const globalKey = `${date}:global`;

  const userAllowed = await increaseUsage(
    userKey,
    owner,
    USER_DAILY_LIMIT
  );

  if (!userAllowed) {
    return {
      ok: false,
      reason: "user"
    };
  }

  const globalAllowed = await increaseUsage(
    globalKey,
    "GLOBAL",
    GLOBAL_DAILY_LIMIT
  );

  if (!globalAllowed) {

    await decreaseUsage(userKey);

    return {
      ok: false,
      reason: "global"
    };
  }

  return {
    ok: true
  };
}

async function rollbackQuota(req) {

  const owner = getUserKey(req);
  const date = getDateKey();

  await decreaseUsage(
    `${date}:user:${owner}`
  );

  await decreaseUsage(
    `${date}:global`
  );
}

/* =========================================================
   GRIDFS SAVE HTML
========================================================= */

async function uploadHTML(
  slug,
  html,
  ownerKey,
  ownerType
) {

  if (!bucket) {
    throw new Error("Storage is not ready.");
  }

  const buffer = Buffer.from(
    html,
    "utf8"
  );

  const fileId = new ObjectId();

  await new Promise((resolve, reject) => {

    const uploadStream =
      bucket.openUploadStreamWithId(
        fileId,
        `page-${slug}.html`,
        {
          contentType:
            "text/html; charset=utf-8",

          metadata: {
            slug,
            ownerKey,
            ownerType
          }
        }
      );

    uploadStream.on(
      "error",
      reject
    );

    uploadStream.on(
      "finish",
      resolve
    );

    uploadStream.end(buffer);
  });

  return {
    fileId,
    sizeBytes: buffer.byteLength
  };
}

/* =========================================================
   SAVE / UPDATE PAGE
========================================================= */

async function savePage(
  slug,
  html,
  ownerKey,
  ownerType
) {

  const existing =
    await Page.findOne({
      slug
    });

  /*
    Normal user cannot overwrite
    another user's page.
  */

  if (
    existing &&
    ownerType === "user" &&
    existing.ownerKey !== ownerKey
  ) {

    const error = new Error(
      "এই site name অন্য user ব্যবহার করছে।"
    );

    error.status = 409;

    throw error;
  }

  /*
    Upload new file FIRST.
    Old file will be deleted only
    after successful upload.
  */

  const uploaded =
    await uploadHTML(
      slug,
      html,
      ownerKey,
      ownerType
    );

  if (existing) {

    const oldFileId =
      existing.fileId;

    await Page.updateOne(
      {
        _id: existing._id
      },
      {
        $set: {
          fileId: uploaded.fileId,
          sizeBytes: uploaded.sizeBytes,
          ownerKey,
          ownerType,
          updatedAt: new Date()
        }
      }
    );

    /*
      Delete old GridFS file.
    */

    try {

      if (oldFileId) {
        await bucket.delete(
          new ObjectId(
            String(oldFileId)
          )
        );
      }

    } catch (error) {
      console.warn(
        "Old GridFS file delete warning:",
        error.message
      );
    }

  } else {

    await Page.create({
      slug,
      fileId: uploaded.fileId,
      sizeBytes: uploaded.sizeBytes,
      ownerKey,
      ownerType
    });
  }

  return {
    slug,
    sizeBytes: uploaded.sizeBytes
  };
}

/* =========================================================
   READ HTML
========================================================= */

async function readHTML(fileId) {

  return new Promise(
    (resolve, reject) => {

      const chunks = [];

      const stream =
        bucket.openDownloadStream(
          new ObjectId(
            String(fileId)
          )
        );

      stream.on(
        "data",
        chunk => chunks.push(chunk)
      );

      stream.on(
        "error",
        reject
      );

      stream.on(
        "end",
        () => {

          const buffer =
            Buffer.concat(chunks);

          resolve(
            buffer.toString("utf8")
          );
        }
      );
    }
  );
}

/* =========================================================
   USER CREATE
   MAX 1MB
========================================================= */

app.post(
  "/api/create",

  express.json({
    limit: "1mb",
    strict: true
  }),

  async (req, res) => {

    try {

      if (await isBanned(req)) {

        return res.status(403).json({
          error:
            "আপনাকে ban করা হয়েছে।"
        });
      }

      const slug =
        cleanSlug(
          req.body?.slug
        );

      const html =
        typeof req.body?.htmlContent ===
        "string"
          ? req.body.htmlContent
          : "";

      if (!slug) {

        return res.status(400).json({
          error:
            "Valid site name দিন।"
        });
      }

      if (!html) {

        return res.status(400).json({
          error:
            "HTML code দিন।"
        });
      }

      const bytes =
        Buffer.byteLength(
          html,
          "utf8"
        );

      if (bytes > USER_MAX_BYTES) {

        return res.status(413).json({
          error:
            "User HTML সর্বোচ্চ 1MB।"
        });
      }

      /*
        Check quota
      */

      const quota =
        await consumeQuota(req);

      if (!quota.ok) {

        if (quota.reason === "user") {

          return res.status(429).json({
            error:
              "আজকের 5টি site limit শেষ।"
          });
        }

        return res.status(429).json({
          error:
            "আজকের global 250 site limit শেষ।"
        });
      }

      try {

        const result =
          await savePage(
            slug,
            html,
            getUserKey(req),
            "user"
          );

        return res.json({
          ok: true,
          url: `/${result.slug}`,
          sizeBytes:
            result.sizeBytes
        });

      } catch (error) {

        /*
          Save failed হলে quota
          ফেরত দেওয়া হবে।
        */

        await rollbackQuota(req);

        throw error;
      }

    } catch (error) {

      console.error(
        "User create error:",
        error
      );

      if (
        error.type ===
        "entity.too.large"
      ) {

        return res.status(413).json({
          error:
            "User HTML সর্বোচ্চ 1MB।"
        });
      }

      return res.status(
        error.status || 500
      ).json({
        error:
          error.message ||
          "Server error."
      });
    }
  }
);

/* =========================================================
   QUOTA API
========================================================= */

app.get(
  "/api/quota",
  async (req, res) => {

    try {

      const date =
        getDateKey();

      const owner =
        getUserKey(req);

      const [
        userUsage,
        globalUsage,
        banned
      ] = await Promise.all([

        DailyUsage.findOne({
          key:
            `${date}:user:${owner}`
        }).lean(),

        DailyUsage.findOne({
          key:
            `${date}:global`
        }).lean(),

        BannedUser.exists({
          ownerKey: owner
        })
      ]);

      res.json({

        userUsed:
          userUsage?.count || 0,

        userLimit:
          USER_DAILY_LIMIT,

        globalUsed:
          globalUsage?.count || 0,

        globalLimit:
          GLOBAL_DAILY_LIMIT,

        banned:
          Boolean(banned)
      });

    } catch (error) {

      console.error(
        "Quota error:",
        error
      );

      res.status(500).json({
        error:
          "Quota unavailable."
      });
    }
  }
);

/* =========================================================
   TASKS
========================================================= */

app.get(
  "/api/tasks",
  async (req, res) => {

    try {

      const tasks =
        await Task.find()
          .sort({
            createdAt: -1
          })
          .lean();

      res.json(tasks);

    } catch (error) {

      res.status(500).json({
        error:
          "Tasks unavailable."
      });
    }
  }
);

/* =========================================================
   PUBLIC PAGES
========================================================= */

app.get(
  "/api/pages-public",
  async (req, res) => {

    try {

      const pages =
        await Page.find()
          .sort({
            updatedAt: -1
          })
          .select(
            "slug sizeBytes ownerType createdAt updatedAt"
          )
          .lean();

      res.json(
        pages.map(page => ({
          ...page,
          url:
            `/${page.slug}`
        }))
      );

    } catch (error) {

      res.status(500).json({
        error:
          "Pages unavailable."
      });
    }
  }
);

/* =========================================================
   ADMIN VERIFY
========================================================= */

app.post(
  "/api/admin/verify",
  (req, res) => {

    res.json({
      ok:
        isAdmin(req)
    });
  }
);

/* =========================================================
   ADMIN CREATE
   MAX 50MB
========================================================= */

app.post(
  "/api/admin/create",

  requireAdmin,

  express.json({
    limit: "50mb",
    strict: true
  }),

  async (req, res) => {

    try {

      const slug =
        cleanSlug(
          req.body?.slug
        );

      const html =
        typeof req.body?.htmlContent ===
        "string"
          ? req.body.htmlContent
          : "";

      if (!slug) {

        return res.status(400).json({
          error:
            "Valid site name দিন।"
        });
      }

      if (!html) {

        return res.status(400).json({
          error:
            "HTML code দিন।"
        });
      }

      const bytes =
        Buffer.byteLength(
          html,
          "utf8"
        );

      if (
        bytes >
        ADMIN_MAX_BYTES
      ) {

        return res.status(413).json({
          error:
            "Admin HTML সর্বোচ্চ 50MB।"
        });
      }

      const result =
        await savePage(
          slug,
          html,
          "ADMIN",
          "admin"
        );

      res.json({
        ok: true,
        url:
          `/${result.slug}`,
        sizeBytes:
          result.sizeBytes
      });

    } catch (error) {

      console.error(
        "Admin create error:",
        error
      );

      if (
        error.type ===
        "entity.too.large"
      ) {

        return res.status(413).json({
          error:
            "Admin HTML সর্বোচ্চ 50MB।"
        });
      }

      res.status(
        error.status || 500
      ).json({
        error:
          error.message ||
          "Admin create failed."
      });
    }
  }
);

/* =========================================================
   ADMIN ADD TASK
========================================================= */

app.post(
  "/api/admin/task/add",

  requireAdmin,

  express.json({
    limit: "100kb"
  }),

  async (req, res) => {

    try {

      const title =
        String(
          req.body?.title || ""
        ).trim();

      const description =
        String(
          req.body?.description || ""
        );

      const link =
        String(
          req.body?.link || ""
        );

      const badge =
        String(
          req.body?.badge || ""
        );

      if (!title) {

        return res.status(400).json({
          error:
            "Task title required."
        });
      }

      const task =
        await Task.create({
          title,
          description,
          link,
          badge
        });

      res.json({
        ok: true,
        task
      });

    } catch (error) {

      console.error(
        "Task add error:",
        error
      );

      res.status(500).json({
        error:
          "Task add failed."
      });
    }
  }
);

/* =========================================================
   ADMIN DELETE TASK
========================================================= */

app.delete(
  "/api/admin/task/:id",

  requireAdmin,

  async (req, res) => {

    try {

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {

        return res.status(400).json({
          error:
            "Invalid task id."
        });
      }

      await Task.findByIdAndDelete(
        req.params.id
      );

      res.json({
        ok: true
      });

    } catch (error) {

      res.status(500).json({
        error:
          "Task delete failed."
      });
    }
  }
);

/* =========================================================
   ADMIN ALL PAGES
========================================================= */

app.get(
  "/api/admin/all-pages",

  requireAdmin,

  async (req, res) => {

    try {

      const pages =
        await Page.find()
          .sort({
            updatedAt: -1
          })
          .lean();

      res.json(pages);

    } catch (error) {

      res.status(500).json({
        error:
          "Pages unavailable."
      });
    }
  }
);

/* =========================================================
   ADMIN DELETE PAGE
========================================================= */

app.delete(
  "/api/admin/page/:id",

  requireAdmin,

  async (req, res) => {

    try {

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {

        return res.status(400).json({
          error:
            "Invalid page id."
        });
      }

      const page =
        await Page.findById(
          req.params.id
        );

      if (!page) {

        return res.status(404).json({
          error:
            "Page not found."
        });
      }

      /*
        Delete GridFS file
      */

      try {

        if (page.fileId) {

          await bucket.delete(
            new ObjectId(
              String(page.fileId)
            )
          );
        }

      } catch (error) {

        console.warn(
          "GridFS delete warning:",
          error.message
        );
      }

      await Page.deleteOne({
        _id: page._id
      });

      res.json({
        ok: true
      });

    } catch (error) {

      console.error(
        "Delete page error:",
        error
      );

      res.status(500).json({
        error:
          "Page delete failed."
      });
    }
  }
);

/* =========================================================
   ADMIN USERS
========================================================= */

app.get(
  "/api/admin/users",

  requireAdmin,

  async (req, res) => {

    try {

      const users =
        await Page.aggregate([

          {
            $match: {
              ownerType: "user"
            }
          },

          {
            $group: {
              _id: "$ownerKey",

              sites: {
                $sum: 1
              },

              lastCreated: {
                $max: "$updatedAt"
              }
            }
          },

          {
            $sort: {
              lastCreated: -1
            }
          }

        ]);

      const bans =
        await BannedUser.find()
          .lean();

      const banMap =
        new Map(
          bans.map(
            ban => [
              ban.ownerKey,
              ban
            ]
          )
        );

      res.json(

        users.map(
          user => ({

            ownerKey:
              user._id,

            sites:
              user.sites,

            lastCreated:
              user.lastCreated,

            banned:
              banMap.has(
                user._id
              ),

            reason:
              banMap.get(
                user._id
              )?.reason || ""
          })
        )

      );

    } catch (error) {

      console.error(
        "Users error:",
        error
      );

      res.status(500).json({
        error:
          "Users unavailable."
      });
    }
  }
);

/* =========================================================
   ADMIN BAN
========================================================= */

app.post(
  "/api/admin/user/ban",

  requireAdmin,

  express.json({
    limit: "20kb"
  }),

  async (req, res) => {

    try {

      const ownerKey =
        String(
          req.body?.ownerKey || ""
        );

      const reason =
        String(
          req.body?.reason || ""
        ).slice(0, 300);

      if (
        !/^[a-f0-9]{64}$/.test(
          ownerKey
        )
      ) {

        return res.status(400).json({
          error:
            "Invalid user key."
        });
      }

      await BannedUser.updateOne(

        {
          ownerKey
        },

        {
          $set: {
            reason,
            createdAt:
              new Date()
          }
        },

        {
          upsert: true
        }

      );

      res.json({
        ok: true
      });

    } catch (error) {

      console.error(
        "Ban error:",
        error
      );

      res.status(500).json({
        error:
          "Ban failed."
      });
    }
  }
);

/* =========================================================
   ADMIN UNBAN
========================================================= */

app.post(
  "/api/admin/user/unban",

  requireAdmin,

  express.json({
    limit: "20kb"
  }),

  async (req, res) => {

    try {

      const ownerKey =
        String(
          req.body?.ownerKey || ""
        );

      await BannedUser.deleteOne({
        ownerKey
      });

      res.json({
        ok: true
      });

    } catch (error) {

      res.status(500).json({
        error:
          "Unban failed."
      });
    }
  }
);

/* =========================================================
   ADMIN STATS
========================================================= */

app.get(
  "/api/admin/stats",

  requireAdmin,

  async (req, res) => {

    try {

      const date =
        getDateKey();

      const [
        sites,
        tasks,
        banned,
        usage
      ] = await Promise.all([

        Page.countDocuments(),

        Task.countDocuments(),

        BannedUser.countDocuments(),

        DailyUsage.find({
          date
        }).lean()

      ]);

      const globalUsage =
        usage.find(
          item =>
            item.ownerKey ===
            "GLOBAL"
        );

      res.json({

        sites,

        tasks,

        banned,

        today:
          globalUsage?.count || 0,

        todayLimit:
          GLOBAL_DAILY_LIMIT

      });

    } catch (error) {

      res.status(500).json({
        error:
          "Stats unavailable."
      });
    }
  }
);

/* =========================================================
   HOME UI
========================================================= */

const INDEX_HTML = `
<!DOCTYPE html>
<html lang="bn">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"
>

<title>SJEMAR</title>

<style>

*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
}

html,body{
  margin:0;
  padding:0;
  min-height:100%;
}

body{

  background:
    radial-gradient(
      circle at 10% 0%,
      #20202b,
      transparent 35%
    ),
    radial-gradient(
      circle at 100% 100%,
      #1b1521,
      transparent 35%
    ),
    #050507;

  color:#f7f7fa;

  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  overflow-x:hidden;
}

body::before{

  content:"";

  position:fixed;

  inset:0;

  pointer-events:none;

  background:
    linear-gradient(
      120deg,
      transparent,
      rgba(255,255,255,.025),
      transparent
    );

}

.container{

  width:min(100%,1000px);

  margin:auto;

  padding:16px;

}

.glass{

  position:relative;

  background:
    rgba(16,16,21,.72);

  border:
    1px solid
    rgba(255,255,255,.10);

  border-radius:24px;

  backdrop-filter:
    blur(24px);

  -webkit-backdrop-filter:
    blur(24px);

  box-shadow:
    0 25px 80px
    rgba(0,0,0,.45);

  overflow:hidden;

}

.glass::before{

  content:"";

  position:absolute;

  inset:0;

  border-radius:inherit;

  padding:1px;

  background:
    conic-gradient(
      from var(--angle),
      #fff0,
      #ffffff55,
      #fff0,
      #ffffff44,
      #fff0
    );

  -webkit-mask:
    linear-gradient(#000 0 0)
    content-box,
    linear-gradient(#000 0 0);

  -webkit-mask-composite:xor;

  mask-composite:exclude;

  animation:
    rotateBorder 5s linear infinite;

  pointer-events:none;

}

@property --angle{

  syntax:"<angle>";

  initial-value:0deg;

  inherits:false;

}

@keyframes rotateBorder{

  to{
    --angle:360deg;
  }

}

header{

  padding:22px;

  display:flex;

  align-items:center;

  justify-content:space-between;

  gap:15px;

}

.logo{

  font-size:25px;

  font-weight:900;

  letter-spacing:-1px;

}

.subtitle{

  color:#8f8f99;

  font-size:13px;

  margin-top:4px;

}

.status{

  padding:8px 12px;

  border-radius:999px;

  border:
    1px solid
    #303039;

  background:#0d0d11;

  color:#aaa;

  font-size:12px;

}

.tabs{

  margin-top:12px;

  padding:8px;

  display:flex;

  gap:8px;

  overflow:auto;

}

.tab{

  flex:1;

  min-width:80px;

  border:0;

  border-radius:15px;

  padding:12px;

  background:#101014;

  color:#999;

  cursor:pointer;

}

.tab.active{

  background:#fff;

  color:#000;

  font-weight:700;

}

.panel{

  display:none;

  margin-top:12px;

  padding:22px;

}

.panel.active{

  display:block;

}

h1,h2,h3{

  margin-top:0;

}

h2{

  font-size:22px;

}

label{

  display:block;

  color:#a2a2ab;

  margin:
    14px
    0
    7px;

  font-size:13px;

}

input,
textarea{

  width:100%;

  color:#fff;

  background:#09090d;

  border:
    1px solid
    #303038;

  outline:none;

  border-radius:15px;

  padding:14px;

  font-size:14px;

}

input:focus,
textarea:focus{

  border-color:#777;

}

textarea{

  min-height:320px;

  resize:vertical;

  line-height:1.5;

}

button{

  border:0;

  cursor:pointer;

}

.primary{

  background:#fff;

  color:#000;

  padding:13px 18px;

  border-radius:14px;

  font-weight:800;

}

.secondary{

  background:#15151a;

  color:#fff;

  border:
    1px solid
    #303038;

  padding:11px 15px;

  border-radius:13px;

}

.stats{

  display:grid;

  grid-template-columns:
    repeat(3,1fr);

  gap:10px;

  margin:
    15px 0;

}

.stat{

  padding:16px;

  border-radius:17px;

  background:#0b0b0f;

  border:
    1px solid
    #292930;

}

.stat span{

  display:block;

  color:#85858e;

  font-size:12px;

  margin-bottom:7px;

}

.stat b{

  font-size:20px;

}

.row{

  display:grid;

  grid-template-columns:
    1fr 1fr;

  gap:12px;

}

.list{

  display:grid;

  gap:10px;

  margin-top:15px;

}

.item{

  padding:15px;

  border-radius:17px;

  background:#0b0b0f;

  border:
    1px solid
    #292930;

}

.item-title{

  font-weight:800;

}

.item-meta{

  color:#888892;

  font-size:12px;

  margin-top:5px;

}

.item a{

  display:inline-block;

  margin-top:10px;

  color:#fff;

}

.danger{

  color:#ff7474;

}

.success{

  color:#74e0a4;

}

.muted{

  color:#888892;

}

hr{

  border:0;

  border-top:
    1px solid
    #292930;

  margin:25px 0;

}

.loader{

  position:fixed;

  inset:0;

  z-index:999;

  display:grid;

  place-items:center;

  background:#050507;

  transition:
    opacity .4s,
    visibility .4s;

}

.loader.hide{

  opacity:0;

  visibility:hidden;

}

.loader-title{

  font-size:30px;

  font-weight:900;

  animation:
    pulse 1s
    ease-in-out
    infinite alternate;

}

@keyframes pulse{

  to{
    opacity:.35;
    transform:scale(1.04);
  }

}

.admin-only{

  display:none;

}

@media(max-width:700px){

  .container{
    padding:10px;
  }

  .row{
    grid-template-columns:1fr;
  }

  .stats{
    grid-template-columns:1fr;
  }

  .panel{
    padding:16px;
  }

  header{
    padding:18px;
  }

}

</style>

</head>

<body>

<div
id="loader"
class="loader"
>
<div class="loader-title">
SJEMAR
</div>
</div>

<div class="container">

<header class="glass">

<div>

<div class="logo">
SJEMAR
</div>

<div class="subtitle">
HTML Hosting Platform
</div>

</div>

<div
id="status"
class="status"
>
Online
</div>

</header>


<div class="tabs glass">

<button
class="tab active"
data-tab="host"
>
Host
</button>

<button
class="tab"
data-tab="tasks"
>
Tasks
</button>

<button
class="tab"
data-tab="links"
>
Links
</button>

<button
class="tab"
data-tab="admin"
>
Admin
</button>

</div>


<!-- HOST -->

<section
id="host"
class="panel glass active"
>

<h2>
Create Site
</h2>

<div class="stats">

<div class="stat">

<span>
Your daily sites
</span>

<b>
<span
id="userUsed"
style="display:inline"
>
-
</span>
/
5
</b>

</div>

<div class="stat">

<span>
Global today
</span>

<b>
<span
id="globalUsed"
style="display:inline"
>
-
</span>
/
250
</b>

</div>

<div class="stat">

<span>
Maximum HTML
</span>

<b>
1MB
</b>

</div>

</div>


<div class="row">

<div>

<label>
Site name
</label>

<input
id="slug"
placeholder="my-site"
/>

</div>


<div>

<label>
HTML file
</label>

<input
id="htmlFile"
type="file"
accept=".html,.htm,text/html"
/>

</div>

</div>


<label>
HTML code
</label>

<textarea
id="htmlCode"
placeholder="<!doctype html>
<html>
...
</html>"
></textarea>


<br>

<button
id="createBtn"
class="primary"
>
Create Site
</button>

<span
id="createMsg"
class="muted"
style="margin-left:10px"
></span>

</section>


<!-- TASKS -->

<section
id="tasks"
class="panel glass"
>

<h2>
Tasks
</h2>

<div
id="taskList"
class="list"
>
Loading...
</div>

</section>


<!-- LINKS -->

<section
id="links"
class="panel glass"
>

<h2>
Public Sites
</h2>

<div
id="linksList"
class="list"
>
Loading...
</div>

</section>


<!-- ADMIN -->

<section
id="admin"
class="panel glass"
>

<h2>
Admin Panel
</h2>


<div
id="loginBox"
>

<label>
Admin password
</label>

<input
id="adminPassword"
type="password"
placeholder="Password"
/>

<br><br>

<button
id="loginBtn"
class="primary"
>
Login
</button>

</div>


<div
id="adminPanel"
style="display:none"
>

<div class="stats">

<div class="stat">

<span>
Total sites
</span>

<b id="adminSites">
0
</b>

</div>

<div class="stat">

<span>
Tasks
</span>

<b id="adminTasks">
0
</b>

</div>

<div class="stat">

<span>
Banned users
</span>

<b id="adminBanned">
0
</b>

</div>

</div>


<h3>
Create Admin Site
</h3>

<input
id="adminSlug"
placeholder="admin-site"
/>

<br><br>

<textarea
id="adminHTML"
placeholder="Admin HTML — maximum 50MB"
></textarea>

<br>

<button
id="adminCreateBtn"
class="primary"
>
Create Admin Site
</button>


<hr>


<h3>
Add Task
</h3>

<input
id="taskTitle"
placeholder="Task title"
/>

<br><br>

<input
id="taskLink"
placeholder="https://example.com"
/>

<br><br>

<input
id="taskBadge"
placeholder="NEW"
/>

<br><br>

<textarea
id="taskDescription"
style="min-height:120px"
placeholder="Task description"
></textarea>

<br>

<button
id="addTaskBtn"
class="secondary"
>
Add Task
</button>


<hr>


<h3>
All Pages
</h3>

<div
id="adminPages"
class="list"
>
</div>


<hr>


<h3>
Users
</h3>

<div
id="adminUsers"
class="list"
>
</div>

</div>

</section>

</div>


<script>

const $ =
id =>
document.getElementById(id);

let adminPass = "";


/* =====================================================
   API
===================================================== */

async function api(
  url,
  options = {}
){

  const response =
    await fetch(
      url,
      options
    );

  const data =
    await response
      .json()
      .catch(
        () => ({
          error:
            "Invalid server response."
        })
      );

  if (!response.ok){

    throw new Error(
      data.error ||
      "Request failed."
    );
  }

  return data;
}


/* =====================================================
   TABS
===================================================== */

document
  .querySelectorAll(".tab")
  .forEach(
    button => {

      button.onclick =
        () => {

          document
            .querySelectorAll(".tab")
            .forEach(
              x =>
                x.classList
                  .remove("active")
            );

          document
            .querySelectorAll(".panel")
            .forEach(
              x =>
                x.classList
                  .remove("active")
            );

          button.classList
            .add("active");

          $(
            button.dataset.tab
          ).classList
            .add("active");
        };

    }
  );


/* =====================================================
   ESCAPE
===================================================== */

function escapeHTML(
  value
){

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    char => ({

      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"

    })[char]
  );
}


/* =====================================================
   FILE TO HTML
===================================================== */

$("htmlFile").onchange =
  async event => {

    const file =
      event.target.files[0];

    if (!file) return;

    if (
      file.size >
      1024 * 1024
    ){

      alert(
        "HTML file সর্বোচ্চ 1MB।"
      );

      event.target.value = "";

      return;
    }

    try {

      $("htmlCode").value =
        await file.text();

    } catch {

      alert(
        "File read করা যায়নি।"
      );
    }
  };


/* =====================================================
   USER CREATE
===================================================== */

$("createBtn").onclick =
  async () => {

    const message =
      $("createMsg");

    message.textContent =
      "Creating...";

    message.className =
      "muted";

    try {

      const html =
        $("htmlCode").value;

      const bytes =
        new Blob([
          html
        ]).size;

      if (
        bytes >
        1024 * 1024
      ){

        throw new Error(
          "HTML সর্বোচ্চ 1MB।"
        );
      }

      const result =
        await api(
          "/api/create",
          {

            method:"POST",

            headers:{
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({

                slug:
                  $("slug").value,

                htmlContent:
                  html

              })

          }
        );

      message.textContent =
        "Created: " +
        location.origin +
        result.url;

      message.className =
        "success";

      await loadQuota();
      await loadLinks();

    } catch(error){

      message.textContent =
        error.message;

      message.className =
        "danger";
    }
  };


/* =====================================================
   QUOTA
===================================================== */

async function loadQuota(){

  try {

    const data =
      await api(
        "/api/quota"
      );

    $("userUsed")
      .textContent =
      data.userUsed;

    $("globalUsed")
      .textContent =
      data.globalUsed;

    if (data.banned){

      $("status")
        .textContent =
        "BANNED";

      $("status")
        .className =
        "status danger";

    } else {

      $("status")
        .textContent =
        "Online";

    }

  } catch {

    $("status")
      .textContent =
      "Offline";
  }
}


/* =====================================================
   TASKS
===================================================== */

async function loadTasks(){

  try {

    const tasks =
      await api(
        "/api/tasks"
      );

    if (!tasks.length){

      $("taskList").innerHTML =
        '<div class="muted">No tasks.</div>';

      return;
    }

    $("taskList").innerHTML =
      tasks
        .map(
          task => `

<div class="item">

<div class="item-title">
${escapeHTML(task.title)}
</div>

<div class="item-meta">
${escapeHTML(
  task.badge || ""
)}
</div>

<div class="item-meta">
${escapeHTML(
  task.description || ""
)}
</div>

${
task.link
?
`
<a
href="${escapeHTML(task.link)}"
target="_blank"
rel="noopener"
>
Open Task →
</a>
`
:
""
}

</div>

`
        )
        .join("");

  } catch(error){

    $("taskList").innerHTML =
      '<div class="danger">Tasks load failed.</div>';
  }
}


/* =====================================================
   LINKS
===================================================== */

async function loadLinks(){

  try {

    const pages =
      await api(
        "/api/pages-public"
      );

    if (!pages.length){

      $("linksList").innerHTML =
        '<div class="muted">No sites yet.</div>';

      return;
    }

    $("linksList").innerHTML =
      pages
        .map(
          page => `

<div class="item">

<div class="item-title">
/${escapeHTML(
  page.slug
)}
</div>

<div class="item-meta">

${Math.ceil(
  page.sizeBytes / 1024
)} KB

·

${escapeHTML(
  page.ownerType
)}

</div>

<a
href="/${encodeURIComponent(page.slug)}"
target="_blank"
rel="noopener"
>
Open Site →
</a>

</div>

`
        )
        .join("");

  } catch(error){

    $("linksList").innerHTML =
      '<div class="danger">Sites load failed.</div>';
  }
}


/* =====================================================
   ADMIN LOGIN
===================================================== */

$("loginBtn").onclick =
  async () => {

    const password =
      $("adminPassword").value;

    if (!password){

      alert(
        "Admin password দিন।"
      );

      return;
    }

    try {

      const result =
        await api(
          "/api/admin/verify",
          {

            method:"POST",

            headers:{
              "x-admin-pass":
                password
            }

          }
        );

      if (!result.ok){

        throw new Error(
          "Wrong admin password."
        );
      }

      adminPass =
        password;

      sessionStorage.setItem(
        "SJEMAR_ADMIN",
        password
      );

      $("loginBox")
        .style.display =
        "none";

      $("adminPanel")
        .style.display =
        "block";

      await loadAdmin();

    } catch(error){

      alert(
        error.message
      );
    }
  };


/* =====================================================
   ADMIN CREATE
===================================================== */

$("adminCreateBtn").onclick =
  async () => {

    try {

      const html =
        $("adminHTML").value;

      const bytes =
        new Blob([
          html
        ]).size;

      if (
        bytes >
        50 * 1024 * 1024
      ){

        throw new Error(
          "Admin HTML সর্বোচ্চ 50MB।"
        );
      }

      const result =
        await api(
          "/api/admin/create",
          {

            method:"POST",

            headers:{

              "Content-Type":
                "application/json",

              "x-admin-pass":
                adminPass

            },

            body:
              JSON.stringify({

                slug:
                  $("adminSlug").value,

                htmlContent:
                  html

              })

          }
        );

      alert(
        "Admin site created: " +
        result.url
      );

      $("adminSlug")
        .value = "";

      $("adminHTML")
        .value = "";

      await loadAdmin();
      await loadLinks();

    } catch(error){

      alert(
        error.message
      );
    }
  };


/* =====================================================
   ADMIN ADD TASK
===================================================== */

$("addTaskBtn").onclick =
  async () => {

    try {

      await api(
        "/api/admin/task/add",
        {

          method:"POST",

          headers:{

            "Content-Type":
              "application/json",

            "x-admin-pass":
              adminPass

          },

          body:
            JSON.stringify({

              title:
                $("taskTitle").value,

              description:
                $("taskDescription").value,

              link:
                $("taskLink").value,

              badge:
                $("taskBadge").value

            })

        }
      );

      alert(
        "Task added."
      );

      $("taskTitle").value =
        "";

      $("taskDescription").value =
        "";

      $("taskLink").value =
        "";

      $("taskBadge").value =
        "";

      await loadTasks();
      await loadAdmin();

    } catch(error){

      alert(
        error.message
      );
    }
  };


/* =====================================================
   ADMIN LOAD
===================================================== */

async function loadAdmin(){

  const headers = {
    "x-admin-pass":
      adminPass
  };

  try {

    const [
      stats,
      pages,
      users
    ] = await Promise.all([

      api(
        "/api/admin/stats",
        { headers }
      ),

      api(
        "/api/admin/all-pages",
        { headers }
      ),

      api(
        "/api/admin/users",
        { headers }
      )

    ]);


    $("adminSites")
      .textContent =
      stats.sites;

    $("adminTasks")
      .textContent =
      stats.tasks;

    $("adminBanned")
      .textContent =
      stats.banned;


    /* Pages */

    if (!pages.length){

      $("adminPages").innerHTML =
        '<div class="muted">No pages.</div>';

    } else {

      $("adminPages").innerHTML =
        pages
          .map(
            page => `

<div class="item">

<div class="item-title">

/${escapeHTML(
  page.slug
)}

</div>

<div class="item-meta">

${Math.ceil(
  page.sizeBytes / 1024
)} KB

·

${escapeHTML(
  page.ownerType
)}

</div>

<br>

<button
class="secondary"
onclick="deletePage('${page._id}')"
>
Delete
</button>

</div>

`
          )
          .join("");
    }


    /* Users */

    if (!users.length){

      $("adminUsers").innerHTML =
        '<div class="muted">No users found.</div>';

    } else {

      $("adminUsers").innerHTML =
        users
          .map(
            user => `

<div class="item">

<div class="item-title">

User
${escapeHTML(
  user.ownerKey.slice(
    0,
    16
  )
)}...

</div>

<div class="item-meta">

Sites:
${user.sites}

<br>

Status:
${
user.banned
?
'<span class="danger">BANNED</span>'
:
'<span class="success">ACTIVE</span>'
}

</div>

<br>

<button
class="secondary"
onclick="toggleBan(
'${user.ownerKey}',
${user.banned}
)"
>

${
user.banned
?
"Unban"
:
"Ban"
}

</button>

</div>

`
          )
          .join("");
    }

  } catch(error){

    alert(
      error.message
    );
  }
}


/* =====================================================
   DELETE PAGE
===================================================== */

window.deletePage =
  async function(id){

    if (
      !confirm(
        "এই site delete করবেন?"
      )
    ){

      return;
    }

    try {

      await api(
        "/api/admin/page/" +
        id,
        {

          method:"DELETE",

          headers:{
            "x-admin-pass":
              adminPass
          }

        }
      );

      await loadAdmin();
      await loadLinks();

    } catch(error){

      alert(
        error.message
      );
    }
  };


/* =====================================================
   BAN / UNBAN
===================================================== */

window.toggleBan =
  async function(
    ownerKey,
    banned
  ){

    try {

      await api(
        "/api/admin/user/" +
        (
          banned
          ? "unban"
          : "ban"
        ),
        {

          method:"POST",

          headers:{

            "Content-Type":
              "application/json",

            "x-admin-pass":
              adminPass

          },

          body:
            JSON.stringify({
              ownerKey
            })

        }
      );

      await loadAdmin();

    } catch(error){

      alert(
        error.message
      );
    }
  };


/* =====================================================
   RESTORE ADMIN SESSION
===================================================== */

async function restoreAdmin(){

  const saved =
    sessionStorage.getItem(
      "SJEMAR_ADMIN"
    );

  if (!saved) return;

  try {

    const result =
      await api(
        "/api/admin/verify",
        {

          method:"POST",

          headers:{
            "x-admin-pass":
              saved
          }

        }
      );

    if (!result.ok) return;

    adminPass =
      saved;

    $("loginBox")
      .style.display =
      "none";

    $("adminPanel")
      .style.display =
      "block";

    await loadAdmin();

  } catch {

    sessionStorage.removeItem(
      "SJEMAR_ADMIN"
    );
  }
}


/* =====================================================
   START
===================================================== */

(async function(){

  try {

    await Promise.all([
      loadQuota(),
      loadTasks(),
      loadLinks(),
      restoreAdmin()
    ]);

  } finally {

    setTimeout(
      () => {

        $("loader")
          .classList
          .add("hide");

      },
      450
    );
  }

})();

</script>

</body>

</html>
`;


/* =========================================================
   HOME
========================================================= */

app.get(
  "/",
  (req, res) => {

    res
      .status(200)
      .type("html")
      .send(INDEX_HTML);
  }
);


/* =========================================================
   SERVE USER / ADMIN HTML
========================================================= */

app.get(
  "/:slug",
  async (req, res, next) => {

    /*
      Do not catch files such as favicon.ico
    */

    if (
      req.params.slug.includes(".")
    ) {

      return next();
    }

    try {

      const slug =
        cleanSlug(
          req.params.slug
        );

      if (!slug) {

        return res
          .status(404)
          .send("Not Found");
      }

      const page =
        await Page.findOne({
          slug
        }).lean();

      if (!page) {

        return res
          .status(404)
          .type("html")
          .send(`
<!doctype html>
<html>
<head>
<title>404</title>
<style>
body{
background:#050507;
color:white;
font-family:system-ui;
display:grid;
place-items:center;
min-height:100vh;
}
</style>
</head>
<body>
<h1>404 — Site Not Found</h1>
</body>
</html>
`);
      }

      const html =
        await readHTML(
          page.fileId
        );

      res
        .status(200)
        .type("html")
        .send(html);

    } catch(error) {

      console.error(
        "Page serve error:",
        error
      );

      res
        .status(500)
        .type("html")
        .send(
          "<h1>Site unavailable</h1>"
        );
    }
  }
);


/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {

    if (
      req.path.startsWith("/api/")
    ) {

      return res.status(404).json({
        error:
          "API endpoint not found."
      });
    }

    res
      .status(404)
      .type("html")
      .send(`
<!doctype html>
<html>
<head>
<title>404</title>
</head>
<body style="
background:#050507;
color:white;
font-family:system-ui;
padding:40px;
">
<h1>404</h1>
<p>Page not found.</p>
</body>
</html>
`);
  }
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {

    console.error(
      "Unhandled error:",
      error
    );

    if (
      error.type ===
      "entity.too.large"
    ) {

      return res.status(413).json({
        error:
          "Upload size limit exceeded."
      });
    }

    if (
      error instanceof SyntaxError &&
      "body" in error
    ) {

      return res.status(400).json({
        error:
          "Invalid JSON."
      });
    }

    res.status(500).json({
      error:
        "Internal server error."
    });
  }
);


/* =========================================================
   DATABASE + START SERVER
========================================================= */

mongoose
  .connect(
    MONGO_URI,
    {
      serverSelectionTimeoutMS:
        10000
    }
  )

  .then(() => {

    console.log(
      "✅ MongoDB Connected"
    );

    bucket =
      new GridFSBucket(
        mongoose.connection.db,
        {
          bucketName:
            "sjemarPages"
        }
      );

    app.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log(
          `🚀 SJEMAR running on port ${PORT}`
        );

      }
    );

  })

  .catch(error => {

    console.error(
      "❌ MongoDB connection failed:",
      error
    );

    process.exit(1);
  });


/* =========================================================
   PROCESS ERRORS
========================================================= */

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "Unhandled Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {

    console.error(
      "Uncaught Exception:",
      error
    );
  }
);  createdAt: {
    type: Date,
    default: Date.now
  }
});

const BannedUser = mongoose.model(
  "BannedUser",
  bannedSchema
);

/* =========================================================
   HELPERS
========================================================= */

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}


function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
}


function hashIP(ip) {
  return crypto
    .createHash("sha256")
    .update(ip)
    .digest("hex");
}


function getUserKey(req) {
  return hashIP(getClientIP(req));
}


function cleanSlug(slug) {
  return String(slug || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 80);
}


function getByteSize(str) {
  return Buffer.byteLength(
    String(str || ""),
    "utf8"
  );
}


function isAdmin(req) {
  return req.headers["x-admin-pass"] === ADMIN_PASS;
}


function adminOnly(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}


async function isBanned(req) {
  const key = getUserKey(req);

  return !!await BannedUser.findOne({
    key
  }).lean();
}


async function getUsage(ownerKey) {
  const date = getDateKey();

  const usage = await DailyUsage.findOne({
    date,
    ownerKey
  }).lean();

  return usage ? usage.count : 0;
}


async function incrementUsage(ownerKey) {
  const date = getDateKey();

  return DailyUsage.findOneAndUpdate(
    {
      date,
      ownerKey
    },
    {
      $inc: {
        count: 1
      },
      $set: {
        updatedAt: new Date()
      }
    },
    {
      upsert: true,
      new: true
    }
  );
}


/*
  Atomic-ish quota check.

  This is designed to prevent normal concurrent requests
  from simply bypassing the quota.
*/

async function consumeQuota(userKey) {

  const date = getDateKey();

  const global = await DailyUsage.findOneAndUpdate(
    {
      date,
      ownerKey: "GLOBAL",
      count: {
        $lt: GLOBAL_DAILY_LIMIT
      }
    },
    {
      $inc: {
        count: 1
      },
      $set: {
        updatedAt: new Date()
      }
    },
    {
      upsert: false,
      new: true
    }
  );

  if (!global) {
    const existingGlobal = await DailyUsage.findOne({
      date,
      ownerKey: "GLOBAL"
    });

    if (existingGlobal &&
        existingGlobal.count >= GLOBAL_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: "GLOBAL"
      };
    }

    await DailyUsage.create({
      date,
      ownerKey: "GLOBAL",
      count: 1
    }).catch(() => {});

  }

  const user = await DailyUsage.findOneAndUpdate(
    {
      date,
      ownerKey: userKey,
      count: {
        $lt: USER_DAILY_LIMIT
      }
    },
    {
      $inc: {
        count: 1
      },
      $set: {
        updatedAt: new Date()
      }
    },
    {
      upsert: false,
      new: true
    }
  );

  if (!user) {

    const existingUser = await DailyUsage.findOne({
      date,
      ownerKey: userKey
    });

    if (existingUser &&
        existingUser.count >= USER_DAILY_LIMIT) {

      // Roll back global counter.
      await DailyUsage.findOneAndUpdate(
        {
          date,
          ownerKey: "GLOBAL",
          count: { $gt: 0 }
        },
        {
          $inc: { count: -1 }
        }
      );

      return {
        allowed: false,
        reason: "USER"
      };
    }

    try {

      await DailyUsage.create({
        date,
        ownerKey: userKey,
        count: 1
      });

    } catch {

      const retry = await DailyUsage.findOneAndUpdate(
        {
          date,
          ownerKey: userKey,
          count: {
            $lt: USER_DAILY_LIMIT
          }
        },
        {
          $inc: {
            count: 1
          }
        },
        {
          new: true
        }
      );

      if (!retry) {

        await DailyUsage.findOneAndUpdate(
          {
            date,
            ownerKey: "GLOBAL",
            count: { $gt: 0 }
          },
          {
            $inc: { count: -1 }
          }
        );

        return {
          allowed: false,
          reason: "USER"
        };
      }
    }
  }

  return {
    allowed: true
  };
}


/* =========================================================
   HEALTH
========================================================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "SJEMAR",
    time: new Date().toISOString()
  });
});


/* =========================================================
   PUBLIC: CREATE PAGE
========================================================= */

app.post("/api/create", async (req, res) => {

  try {

    if (await isBanned(req)) {
      return res.status(403).json({
        error: "আপনার access বন্ধ করা হয়েছে।"
      });
    }

    const { slug, htmlContent } = req.body;

    if (!slug || !htmlContent) {
      return res.status(400).json({
        error: "Slug এবং HTML code দিন।"
      });
    }

    const clean = cleanSlug(slug);

    if (!clean || clean.length < 2) {
      return res.status(400).json({
        error: "Valid slug দিন।"
      });
    }

    const size = getByteSize(htmlContent);

    if (size > USER_MAX_BYTES) {
      return res.status(413).json({
        error: "User HTML maximum 1MB।"
      });
    }

    /*
      Admin bypasses all daily limits.
    */

    if (!isAdmin(req)) {

      const quota = await consumeQuota(
        getUserKey(req)
      );

      if (!quota.allowed) {

        if (quota.reason === "USER") {
          return res.status(429).json({
            error:
              "আজকের 5টি site creation limit শেষ। আগামীকাল আবার চেষ্টা করুন।"
          });
        }

        return res.status(429).json({
          error:
            "আজকের global 250 site limit শেষ।"
        });
      }
    }

    /*
      User can overwrite own page only.
      Admin can overwrite anyone's page.
    */

    const ownerKey = isAdmin()
      ? "ADMIN"
      : getUserKey(req);

    const ownerType = isAdmin()
      ? "admin"
      : "user";

    const existing = await Page.findOne({
      slug: clean
    });

    if (existing) {

      if (
        !isAdmin(req) &&
        existing.ownerKey !== ownerKey
      ) {

        return res.status(409).json({
          error:
            "এই slug ইতিমধ্যে অন্য user ব্যবহার করছে। অন্য নাম দিন।"
        });
      }

      existing.htmlContent = htmlContent;
      existing.sizeBytes = size;
      existing.ownerKey = ownerKey;
      existing.ownerType = ownerType;

      await existing.save();

    } else {

      await Page.create({
        slug: clean,
        htmlContent,
        ownerKey,
        ownerType,
        sizeBytes: size
      });
    }

    const fullUrl =
      req.protocol +
      "://" +
      req.get("host") +
      "/" +
      clean;

    res.json({
      success: true,
      slug: clean,
      sizeBytes: size,
      fullUrl
    });

  } catch (err) {

    console.error(err);

    if (err.code === 11000) {
      return res.status(409).json({
        error: "এই slug already exists।"
      });
    }

    res.status(500).json({
      error: "Server error"
    });
  }
});


/* =========================================================
   PUBLIC TASKS
========================================================= */

app.get("/api/tasks", async (req, res) => {

  try {

    const tasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(tasks);

  } catch {

    res.json([]);
  }
});


/* =========================================================
   PUBLIC RECENT PAGES
========================================================= */

app.get("/api/pages-public", async (req, res) => {

  try {

    const pages = await Page.find()
      .select("slug createdAt sizeBytes ownerType")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json(pages);

  } catch {

    res.json([]);
  }
});


/* =========================================================
   USER QUOTA
========================================================= */

app.get("/api/quota", async (req, res) => {

  try {

    if (isAdmin(req)) {
      return res.json({
        admin: true,
        used: 0,
        limit: null,
        remaining: null
      });
    }

    const used = await getUsage(
      getUserKey(req)
    );

    const global = await getUsage("GLOBAL");

    res.json({
      admin: false,
      used,
      limit: USER_DAILY_LIMIT,
      remaining: Math.max(
        0,
        USER_DAILY_LIMIT - used
      ),
      globalUsed: global,
      globalLimit: GLOBAL_DAILY_LIMIT,
      globalRemaining: Math.max(
        0,
        GLOBAL_DAILY_LIMIT - global
      )
    });

  } catch {

    res.status(500).json({
      error: "Quota error"
    });
  }
});


/* =========================================================
   ADMIN VERIFY
========================================================= */

app.post("/api/admin/verify", (req, res) => {

  const { pass } = req.body;

  if (
    typeof pass === "string" &&
    pass === ADMIN_PASS
  ) {
    return res.json({
      success: true
    });
  }

  res.status(401).json({
    error: "Invalid Passcode"
  });
});


/* =========================================================
   ADMIN CREATE - 50MB
========================================================= */

app.post(
  "/api/admin/create",
  adminOnly,
  async (req, res) => {

    try {

      const {
        slug,
        htmlContent
      } = req.body;

      if (!slug || !htmlContent) {
        return res.status(400).json({
          error: "Slug এবং HTML দিন।"
        });
      }

      const clean = cleanSlug(slug);

      if (!clean) {
        return res.status(400).json({
          error: "Invalid slug"
        });
      }

      const size = getByteSize(
        htmlContent
      );

      if (size > ADMIN_MAX_BYTES) {
        return res.status(413).json({
          error: "Admin HTML maximum 50MB।"
        });
      }

      await Page.findOneAndUpdate(
        {
          slug: clean
        },
        {
          slug: clean,
          htmlContent,
          sizeBytes: size,
          ownerKey: "ADMIN",
          ownerType: "admin"
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );

      const fullUrl =
        req.protocol +
        "://" +
        req.get("host") +
        "/" +
        clean;

      res.json({
        success: true,
        fullUrl,
        slug: clean,
        sizeBytes: size
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: "Admin create error"
      });
    }
  }
);


/* =========================================================
   ADMIN TASK ADD
========================================================= */

app.post(
  "/api/admin/task/add",
  adminOnly,
  async (req, res) => {

    try {

      const {
        title,
        description,
        link,
        badge
      } = req.body;

      if (
        !title ||
        !description ||
        !link
      ) {
        return res.status(400).json({
          error: "সব তথ্য দিন।"
        });
      }

      const task = await Task.create({
        title: String(title).slice(0, 150),
        description: String(description).slice(0, 1000),
        link: String(link).slice(0, 2000),
        badge:
          String(badge || "VERIFIED")
            .slice(0, 40)
      });

      res.json({
        success: true,
        task
      });

    } catch (err) {

      res.status(500).json({
        error: err.message
      });
    }
  }
);


/* =========================================================
   ADMIN TASK DELETE
========================================================= */

app.delete(
  "/api/admin/task/:id",
  adminOnly,
  async (req, res) => {

    try {

      await Task.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true
      });

    } catch {

      res.status(500).json({
        error: "Delete failed"
      });
    }
  }
);


/* =========================================================
   ADMIN ALL PAGES
========================================================= */

app.get(
  "/api/admin/all-pages",
  adminOnly,
  async (req, res) => {

    try {

      const pages = await Page.find()
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();

      res.json(pages);

    } catch {

      res.json([]);
    }
  }
);


/* =========================================================
   ADMIN DELETE PAGE
========================================================= */

app.delete(
  "/api/admin/page/:id",
  adminOnly,
  async (req, res) => {

    try {

      await Page.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true
      });

    } catch {

      res.status(500).json({
        error: "Delete failed"
      });
    }
  }
);


/* =========================================================
   ADMIN USERS / IP HASHES
========================================================= */

app.get(
  "/api/admin/users",
  adminOnly,
  async (req, res) => {

    try {

      const date = getDateKey();

      const users = await DailyUsage.find({
        date,
        ownerKey: {
          $ne: "GLOBAL"
        }
      })
        .sort({ count: -1 })
        .limit(1000)
        .lean();

      const banned = await BannedUser.find()
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();

      res.json({
        users,
        banned
      });

    } catch {

      res.status(500).json({
        error: "Users error"
      });
    }
  }
);


/* =========================================================
   ADMIN BAN USER
========================================================= */

app.post(
  "/api/admin/user/ban",
  adminOnly,
  async (req, res) => {

    try {

      const {
        key,
        reason
      } = req.body;

      if (!key) {
        return res.status(400).json({
          error: "User key required"
        });
      }

      await BannedUser.findOneAndUpdate(
        {
          key
        },
        {
          key,
          reason:
            String(reason || "Banned by admin")
        },
        {
          upsert: true,
          new: true
        }
      );

      res.json({
        success: true
      });

    } catch {

      res.status(500).json({
        error: "Ban failed"
      });
    }
  }
);


/* =========================================================
   ADMIN UNBAN
========================================================= */

app.post(
  "/api/admin/user/unban",
  adminOnly,
  async (req, res) => {

    try {

      const { key } = req.body;

      await BannedUser.deleteOne({
        key
      });

      res.json({
        success: true
      });

    } catch {

      res.status(500).json({
        error: "Unban failed"
      });
    }
  }
);


/* =========================================================
   ADMIN STATS
========================================================= */

app.get(
  "/api/admin/stats",
  adminOnly,
  async (req, res) => {

    try {

      const today = getDateKey();

      const [
        totalPages,
        totalTasks,
        totalBanned,
        todayUsage,
        globalUsage
      ] = await Promise.all([

        Page.countDocuments(),

        Task.countDocuments(),

        BannedUser.countDocuments(),

        DailyUsage.countDocuments({
          date: today,
          ownerKey: {
            $ne: "GLOBAL"
          }
        }),

        getUsage("GLOBAL")
      ]);

      res.json({
        totalPages,
        totalTasks,
        totalBanned,
        activeToday: todayUsage,
        todayCreated: globalUsage,
        globalLimit: GLOBAL_DAILY_LIMIT
      });

    } catch {

      res.status(500).json({
        error: "Stats failed"
      });
    }
  }
);


/* =========================================================
   ADMIN DELETE TASK
========================================================= */

app.delete(
  "/api/admin/task/:id",
  adminOnly,
  async (req, res) => {

    try {

      await Task.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true
      });

    } catch {

      res.status(500).json({
        error: "Delete task failed"
      });
    }
  }
);


/* =========================================================
   MAIN UI
========================================================= */

app.get("/", (req, res) => {

  res.type("html").send(`<!DOCTYPE html>

<html lang="bn">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
>

<title>SJEMAR • Web Studio</title>

<link
href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
rel="stylesheet"
>

<style>

*{
box-sizing:border-box;
margin:0;
padding:0;
font-family:
'Plus Jakarta Sans',
-apple-system,
BlinkMacSystemFont,
sans-serif;
-webkit-tap-highlight-color:transparent;
}

:root{

--bg:#02040a;

--card:
rgba(15,23,42,.64);

--border:
rgba(255,255,255,.09);

--text:#f8fafc;

--muted:#94a3b8;

--blue:#3b82f6;

--purple:#8b5cf6;

--danger:#ef4444;

}

body{

min-height:100vh;

background:
radial-gradient(
circle at 0% 0%,
rgba(37,99,235,.16),
transparent 30%
),
radial-gradient(
circle at 100% 100%,
rgba(124,58,237,.13),
transparent 30%
),
#02040a;

color:var(--text);

overflow-x:hidden;

padding-bottom:100px;

}

body:before{

content:"";

position:fixed;

inset:0;

pointer-events:none;

background:
linear-gradient(
rgba(255,255,255,.012) 1px,
transparent 1px
);

background-size:
100% 4px;

opacity:.2;

}

.loader{

position:fixed;

inset:0;

background:#02040a;

z-index:9999;

display:flex;

align-items:center;

justify-content:center;

flex-direction:column;

transition:.4s;

}

.loader-logo{

font-size:28px;

font-weight:800;

background:
linear-gradient(
135deg,
#60a5fa,
#a78bfa
);

-webkit-background-clip:text;

-webkit-text-fill-color:transparent;

}

.spinner{

width:34px;

height:34px;

border:3px solid
rgba(255,255,255,.1);

border-top-color:#60a5fa;

border-radius:50%;

animation:spin .8s linear infinite;

margin-top:18px;

}

@keyframes spin{

to{
transform:rotate(360deg);
}

}

.header{

position:sticky;

top:0;

z-index:50;

padding:
16px 18px;

display:flex;

justify-content:space-between;

align-items:center;

background:
rgba(2,4,10,.72);

backdrop-filter:
blur(25px);

-webkit-backdrop-filter:
blur(25px);

border-bottom:
1px solid var(--border);

}

.logo{

font-size:19px;

font-weight:800;

letter-spacing:.5px;

background:
linear-gradient(
135deg,
#60a5fa,
#a78bfa
);

-webkit-background-clip:text;

-webkit-text-fill-color:transparent;

}

.status{

font-size:10px;

font-weight:800;

padding:
5px 10px;

border-radius:30px;

color:#86efac;

background:
rgba(34,197,94,.1);

border:
1px solid
rgba(34,197,94,.25);

}

.container{

width:100%;

max-width:520px;

margin:auto;

padding:
20px 16px;

}

.tab{

display:none;

animation:
fade .25s ease;

}

.tab.active{

display:block;

}

@keyframes fade{

from{

opacity:0;

transform:
translateY(8px);

}

to{

opacity:1;

transform:
translateY(0);

}

}

.card{

position:relative;

background:
linear-gradient(
145deg,
rgba(255,255,255,.055),
rgba(255,255,255,.018)
);

border:
1px solid var(--border);

border-radius:25px;

padding:21px;

margin-bottom:17px;

backdrop-filter:
blur(30px);

-webkit-backdrop-filter:
blur(30px);

box-shadow:
0 25px 70px
rgba(0,0,0,.5);

overflow:hidden;

}

.card:before{

content:"";

position:absolute;

inset:-2px;

z-index:-1;

border-radius:27px;

background:
conic-gradient(
from 0deg,
transparent,
rgba(59,130,246,.5),
transparent,
rgba(139,92,246,.5),
transparent
);

animation:
rotateBorder 6s linear infinite;

}

@keyframes rotateBorder{

to{
transform:rotate(360deg);
}

}

.card-inner{

background:
rgba(4,7,14,.8);

border-radius:22px;

}

.title{

font-size:18px;

font-weight:800;

margin-bottom:5px;

}

.sub{

font-size:12px;

line-height:1.55;

color:var(--muted);

margin-bottom:18px;

}

label{

font-size:10px;

font-weight:800;

letter-spacing:.7px;

text-transform:uppercase;

color:#94a3b8;

display:block;

margin:
0 0 7px;

}

input,
textarea{

width:100%;

background:
rgba(0,0,0,.42);

border:
1px solid
rgba(255,255,255,.08);

border-radius:15px;

padding:
14px 15px;

outline:none;

color:white;

font-size:13px;

margin-bottom:13px;

transition:.2s;

}

input:focus,
textarea:focus{

border-color:
rgba(96,165,250,.7);

box-shadow:
0 0 0 4px
rgba(59,130,246,.09);

}

textarea{

font-family:
ui-monospace,
SFMono-Regular,
monospace;

resize:vertical;

min-height:170px;

}

.btn{

width:100%;

border:0;

border-radius:15px;

padding:14px;

font-weight:800;

font-size:13px;

cursor:pointer;

color:white;

background:
linear-gradient(
135deg,
#2563eb,
#7c3aed
);

box-shadow:
0 12px 35px
rgba(37,99,235,.25);

transition:.2s;

}

.btn:active{

transform:scale(.98);

}

.btn-danger{

background:
linear-gradient(
135deg,
#dc2626,
#991b1b
);

}

.btn-secondary{

background:
rgba(255,255,255,.07);

box-shadow:none;

}

.quota{

display:flex;

gap:9px;

margin-bottom:16px;

}

.quota-box{

flex:1;

padding:12px;

border:
1px solid
var(--border);

border-radius:15px;

background:
rgba(255,255,255,.025);

}

.quota-num{

font-size:18px;

font-weight:800;

}

.quota-label{

font-size:9px;

color:var(--muted);

margin-top:2px;

}

.item{

padding:15px;

border:
1px solid
var(--border);

border-radius:17px;

background:
rgba(255,255,255,.025);

margin-bottom:10px;

}

.item-top{

display:flex;

justify-content:space-between;

gap:10px;

align-items:flex-start;

}

.item-title{

font-size:13px;

font-weight:800;

}

.badge{

font-size:9px;

font-weight:800;

padding:
4px 8px;

border-radius:8px;

color:#93c5fd;

background:
rgba(59,130,246,.12);

border:
1px solid
rgba(59,130,246,.18);

}

.item-desc{

font-size:11px;

color:var(--muted);

line-height:1.5;

margin:
7px 0 11px;

}

.small-btn{

display:inline-flex;

align-items:center;

justify-content:center;

padding:
7px 11px;

border-radius:9px;

border:0;

font-size:10px;

font-weight:800;

text-decoration:none;

color:white;

background:#2563eb;

}

.link-row{

display:flex;

justify-content:space-between;

align-items:center;

gap:10px;

padding:13px;

border:
1px solid var(--border);

border-radius:14px;

margin-bottom:8px;

background:
rgba(255,255,255,.025);

}

.link-name{

font-size:12px;

font-weight:700;

word-break:break-all;

}

.nav{

position:fixed;

z-index:100;

left:50%;

bottom:17px;

transform:translateX(-50%);

width:
calc(100% - 28px);

max-width:430px;

padding:
8px;

display:flex;

justify-content:space-around;

background:
rgba(8,12,22,.82);

border:
1px solid
rgba(255,255,255,.1);

border-radius:28px;

backdrop-filter:
blur(30px);

-webkit-backdrop-filter:
blur(30px);

box-shadow:
0 25px 70px
rgba(0,0,0,.8);

}

.nav button{

border:0;

background:transparent;

color:#64748b;

padding:
8px 12px;

border-radius:20px;

font-size:9px;

font-weight:800;

cursor:pointer;

}

.nav button.active{

color:#60a5fa;

background:
rgba(59,130,246,.13);

}

.nav svg{

width:19px;

height:19px;

display:block;

margin:auto auto 3px;

stroke:currentColor;

fill:none;

stroke-width:2;

stroke-linecap:round;

stroke-linejoin:round;

}

.modal{

position:fixed;

inset:0;

z-index:500;

display:none;

align-items:center;

justify-content:center;

padding:20px;

background:
rgba(0,0,0,.82);

backdrop-filter:
blur(22px);

}

.modal.show{

display:flex;

}

.modal-box{

width:100%;

max-width:390px;

padding:22px;

border:
1px solid var(--border);

border-radius:24px;

background:
#080d18;

box-shadow:
0 30px 90px
rgba(0,0,0,.8);

}

.toast{

position:fixed;

left:50%;

bottom:95px;

transform:
translate(-50%,20px);

z-index:1000;

padding:
11px 16px;

border-radius:14px;

font-size:11px;

font-weight:700;

background:
rgba(15,23,42,.92);

border:
1px solid
rgba(255,255,255,.1);

opacity:0;

pointer-events:none;

transition:.25s;

}

.toast.show{

opacity:1;

transform:
translate(-50%,0);

}

.stats{

display:grid;

grid-template-columns:
1fr 1fr;

gap:9px;

}

.stat{

padding:14px;

border:
1px solid var(--border);

border-radius:16px;

background:
rgba(255,255,255,.025);

}

.stat b{

display:block;

font-size:20px;

margin-bottom:3px;

}

.stat span{

font-size:9px;

color:var(--muted);

}

</style>

</head>

<body>

<div class="loader" id="loader">

<div class="loader-logo">SJEMAR</div>

<div class="spinner"></div>

<div style="
margin-top:12px;
font-size:10px;
color:#64748b;
">

INITIALIZING STUDIO...

</div>

</div>


<header class="header">

<div class="logo">SJEMAR</div>

<div class="status">● ONLINE</div>

</header>


<main class="container">

<!-- HOST -->

<section
id="tab-host"
class="tab active"
>

<div class="card">

<div class="title">
Host HTML
</div>

<div class="sub">
HTML, CSS এবং JavaScript একসাথে দিয়ে
লাইভ website তৈরি করুন।
User limit: 5 sites/day • Max 1MB
</div>

<div class="quota">

<div class="quota-box">

<div
class="quota-num"
id="remaining"
>
-
</div>

<div class="quota-label">
YOUR REMAINING
</div>

</div>

<div class="quota-box">

<div
class="quota-num"
id="globalRemaining"
>
-
</div>

<div class="quota-label">
GLOBAL REMAINING
</div>

</div>

</div>

<label>
Site Name
</label>

<input
id="slugInput"
maxlength="80"
placeholder="my-site"
/>

<label>
HTML Code
</label>

<textarea
id="htmlInput"
placeholder="<!DOCTYPE html>
<html>
...
</html>"
></textarea>

<div
style="
font-size:10px;
color:#64748b;
margin-bottom:12px;
"
>
Maximum file size: 1MB
</div>

<button
class="btn"
onclick="createPage()"
>
CREATE LIVE SITE
</button>

<div
id="result"
style="
display:none;
margin-top:14px;
padding:14px;
border-radius:15px;
background:rgba(34,197,94,.08);
border:1px solid rgba(34,197,94,.2);
"
>

<div
style="
font-size:9px;
color:#86efac;
font-weight:800;
margin-bottom:5px;
"
>
LIVE WEBSITE
</div>

<a
id="resultLink"
target="_blank"
style="
color:white;
font-size:11px;
font-weight:700;
word-break:break-all;
"
></a>

</div>

</div>

</section>


<!-- TASK -->

<section
id="tab-tasks"
class="tab"
>

<div class="card">

<div class="title">
Tasks
</div>

<div class="sub">
Available verification tasks
</div>

<div id="tasksList">

<div style="
text-align:center;
padding:30px;
color:#64748b;
font-size:11px;
">
Loading tasks...
</div>

</div>

</div>

</section>


<!-- LINKS -->

<section
id="tab-links"
class="tab"
>

<div class="card">

<div class="title">
Recent Sites
</div>

<div class="sub">
Recently created websites
</div>

<div id="recentList">

<div style="
text-align:center;
padding:30px;
color:#64748b;
font-size:11px;
">
Loading...
</div>

</div>

</div>

</section>


<!-- ADMIN -->

<section
id="tab-admin"
class="tab"
>

<div id="adminLocked">

<div class="card">

<div class="title">
Admin Console
</div>

<div class="sub">
Administrator authentication required.
</div>

<button
class="btn"
onclick="openAdminModal()"
>
UNLOCK ADMIN
</button>

</div>

</div>


<div
id="adminPanel"
style="display:none"
>

<div class="card">

<div class="title">
Admin Overview
</div>

<div class="sub">
Unlimited admin hosting • 50MB HTML
</div>

<div class="stats">

<div class="stat">
<b id="sPages">0</b>
<span>TOTAL SITES</span>
</div>

<div class="stat">
<b id="sTasks">0</b>
<span>TASKS</span>
</div>

<div class="stat">
<b id="sUsers">0</b>
<span>ACTIVE TODAY</span>
</div>

<div class="stat">
<b id="sCreated">0</b>
<span>CREATED TODAY</span>
</div>

</div>

</div>


<div class="card">

<div class="title">
Admin Host
</div>

<div class="sub">
Admin has unlimited daily creation.
Maximum 50MB per HTML document.
</div>

<label>
Site Name
</label>

<input
id="adminSlug"
placeholder="official"
/>

<label>
HTML Code
</label>

<textarea
id="adminHtml"
style="min-height:240px"
placeholder="Admin HTML..."
></textarea>

<button
class="btn"
onclick="adminCreate()"
>
PUBLISH ADMIN SITE
</button>

<div
id="adminResult"
style="
display:none;
margin-top:12px;
"
></div>

</div>


<div class="card">

<div class="title">
Add Task
</div>

<div class="sub">
Create a task for users.
</div>

<input
id="taskTitle"
placeholder="Task title"
/>

<input
id="taskDesc"
placeholder="Description"
/>

<input
id="taskUrl"
placeholder="https://example.com"
/>

<input
id="taskBadge"
placeholder="REQUIRED"
/>

<button
class="btn"
onclick="addTask()"
>
ADD TASK
</button>

</div>


<div class="card">

<div class="title">
Users
</div>

<div class="sub">
IP identities are stored as hashes.
</div>

<div id="usersList">
Loading...
</div>

</div>


<div class="card">

<div class="title">
Hosted Sites
</div>

<div id="adminPages">
Loading...
</div>

</div>

</div>

</section>

</main>


<nav class="nav">

<button
class="active"
onclick="tab('host',this)"
>

<svg viewBox="0 0 24 24">
<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
</svg>

Host

</button>


<button
onclick="tab('tasks',this)"
>

<svg viewBox="0 0 24 24">
<path d="M9 11l3 3L22 4"/>
<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
</svg>

Tasks

</button>


<button
onclick="tab('links',this)"
>

<svg viewBox="0 0 24 24">
<circle cx="12" cy="12" r="10"/>
<path d="M2 12h20"/>
</svg>

Sites

</button>


<button
onclick="tab('admin',this)"
>

<svg viewBox="0 0 24 24">
<rect x="3" y="11" width="18" height="11" rx="2"/>
<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
</svg>

Admin

</button>

</nav>


<!-- ADMIN MODAL -->

<div
class="modal"
id="adminModal"
>

<div class="modal-box">

<div
style="
font-size:18px;
font-weight:800;
margin-bottom:5px;
"
>
Admin Lock
</div>

<div
style="
font-size:11px;
color:#64748b;
margin-bottom:15px;
"
>
Enter administrator passcode.
</div>

<input
type="password"
id="adminPass"
placeholder="••••••••"
/>

<div
style="
display:flex;
gap:9px;
"
>

<button
class="btn btn-secondary"
onclick="closeAdminModal()"
>
Cancel
</button>

<button
class="btn"
onclick="loginAdmin()"
>
Unlock
</button>

</div>

</div>

</div>


<div
id="toast"
class="toast"
></div>


<script>

let adminPass = "";

function toast(message){

const el =
document.getElementById("toast");

el.textContent = message;

el.classList.add("show");

setTimeout(()=>{
el.classList.remove("show");
},2500);

}


function tab(name, btn){

document
.querySelectorAll(".tab")
.forEach(x=>{
x.classList.remove("active");
});

document
.querySelectorAll(".nav button")
.forEach(x=>{
x.classList.remove("active");
});

document
.getElementById("tab-"+name)
.classList.add("active");

btn.classList.add("active");

if(name==="tasks")
loadTasks();

if(name==="links")
loadLinks();

if(name==="admin" && adminPass){

loadAdmin();

}

}


async function loadQuota(){

try{

const res =
await fetch("/api/quota");

const data =
await res.json();

if(data.admin){

document.getElementById(
"remaining"
).textContent="∞";

document.getElementById(
"globalRemaining"
).textContent="∞";

return;

}

document.getElementById(
"remaining"
).textContent =
data.remaining;

document.getElementById(
"globalRemaining"
).textContent =
data.globalRemaining;

}catch{}

}


async function createPage(){

const slug =
document
.getElementById("slugInput")
.value
.trim();

const htmlContent =
document
.getElementById("htmlInput")
.value;

if(!slug || !htmlContent){

toast("Slug এবং HTML দিন");

return;

}

if(
new Blob([htmlContent]).size
>
1024*1024
){

toast("HTML maximum 1MB");

return;

}

try{

const res =
await fetch("/api/create",{

method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:JSON.stringify({
slug,
htmlContent
})

});

const data =
await res.json();

if(!res.ok){

toast(data.error || "Failed");

return;

}

const box =
document.getElementById("result");

const link =
document.getElementById(
"resultLink"
);

box.style.display="block";

link.href=data.fullUrl;

link.textContent=data.fullUrl;

toast("Website created!");

loadQuota();

}catch{

toast("Network error");

}

}


async function loadTasks(){

const list =
document.getElementById(
"tasksList"
);

list.innerHTML=
'<div style="text-align:center;padding:30px;color:#64748b">Loading...</div>';

try{

const res =
await fetch("/api/tasks");

const data =
await res.json();

if(!data.length){

list.innerHTML=
'<div style="text-align:center;padding:30px;color:#64748b">No tasks available.</div>';

return;

}

list.innerHTML =
data.map(t=>`

<div class="item">

<div class="item-top">

<div class="item-title">
${escapeHtml(t.title)}
</div>

<div class="badge">
${escapeHtml(t.badge)}
</div>

</div>

<div class="item-desc">
${escapeHtml(t.description)}
</div>

<a
class="small-btn"
href="${safeUrl(t.link)}"
target="_blank"
rel="noopener"
>
OPEN TASK ↗
</a>

</div>

`).join("");

}catch{

list.innerHTML=
'<div style="text-align:center;padding:20px;color:#ef4444">Failed to load.</div>';

}

}


async function loadLinks(){

const list =
document.getElementById(
"recentList"
);

try{

const res =
await fetch("/api/pages-public");

const data =
await res.json();

if(!data.length){

list.innerHTML=
'<div style="text-align:center;padding:30px;color:#64748b">No sites yet.</div>';

return;

}

list.innerHTML =
data.map(p=>`

<div class="link-row">

<div>

<div class="link-name">
/${escapeHtml(p.slug)}
</div>

<div style="
font-size:9px;
color:#64748b;
margin-top:4px;
">
${formatSize(p.sizeBytes)}
</div>

</div>

<a
class="small-btn"
href="/${encodeURIComponent(p.slug)}"
target="_blank"
>
OPEN
</a>

</div>

`).join("");

}catch{

list.innerHTML=
"No data";

}

}


function openAdminModal(){

document
.getElementById("adminModal")
.classList.add("show");

document
.getElementById("adminPass")
.focus();

}


function closeAdminModal(){

document
.getElementById("adminModal")
.classList.remove("show");

}


async function loginAdmin(){

const pass =
document
.getElementById("adminPass")
.value;

if(!pass){

toast("Password দিন");

return;

}

try{

const res =
await fetch("/api/admin/verify",{

method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:JSON.stringify({
pass
})

});

const data =
await res.json();

if(!data.success){

toast("Wrong password");

return;

}

adminPass=pass;

closeAdminModal();

document
.getElementById("adminLocked")
.style.display="none";

document
.getElementById("adminPanel")
.style.display="block";

loadAdmin();

toast("Admin unlocked");

}catch{

toast("Login failed");

}

}


function adminHeaders(){

return {

"Content-Type":
"application/json",

"x-admin-pass":
adminPass

};

}


async function adminCreate(){

const slug =
document
.getElementById("adminSlug")
.value
.trim();

const htmlContent =
document
.getElementById("adminHtml")
.value;

if(!slug || !htmlContent){

toast("সব তথ্য দিন");

return;

}

if(
new Blob([htmlContent]).size
>
50*1024*1024
){

toast("Admin maximum 50MB");

return;

}

try{

const res =
await fetch(
"/api/admin/create",
{

method:"POST",

headers:
adminHeaders(),

body:JSON.stringify({
slug,
htmlContent
})

});

const data =
await res.json();

if(!res.ok){

toast(data.error || "Failed");

return;

}

const box =
document.getElementById(
"adminResult"
);

box.style.display="block";

box.innerHTML=`

<div style="
padding:12px;
border-radius:14px;
background:rgba(34,197,94,.08);
border:1px solid rgba(34,197,94,.2);
">

<a
href="${data.fullUrl}"
target="_blank"
style="
color:#86efac;
font-size:11px;
word-break:break-all;
font-weight:700;
"
>
${data.fullUrl}
</a>

</div>
`;

toast("Admin site published");

loadAdmin();

}catch{

toast("Admin create failed");

}

}


async function addTask(){

const title =
document
.getElementById("taskTitle")
.value;

const description =
document
.getElementById("taskDesc")
.value;

const link =
document
.getElementById("taskUrl")
.value;

const badge =
document
.getElementById("taskBadge")
.value;

if(!title || !description || !link){

toast("সব তথ্য দিন");

return;

}

try{

const res =
await fetch(
"/api/admin/task/add",
{

method:"POST",

headers:
adminHeaders(),

body:JSON.stringify({
title,
description,
link,
badge
})

});

const data =
await res.json();

if(!res.ok){

toast(data.error || "Failed");

return;

}

document
.getElementById("taskTitle")
.value="";

document
.getElementById("taskDesc")
.value="";

document
.getElementById("taskUrl")
.value="";

document
.getElementById("taskBadge")
.value="";

toast("Task added");

}catch{

toast("Failed");

}

}


async function loadAdmin(){

await loadStats();

await loadUsers();

await loadAdminPages();

}


async function loadStats(){

try{

const res =
await fetch(
"/api/admin/stats",
{
headers:{
"x-admin-pass":
adminPass
}
});

const d =
await res.json();

document.getElementById(
"sPages"
).textContent=d.totalPages || 0;

document.getElementById(
"sTasks"
).textContent=d.totalTasks || 0;

document.getElementById(
"sUsers"
).textContent=d.activeToday || 0;

document.getElementById(
"sCreated"
).textContent=d.todayCreated || 0;

}catch{}

}


async function loadUsers(){

const box =
document.getElementById(
"usersList"
);

try{

const res =
await fetch(
"/api/admin/users",
{
headers:{
"x-admin-pass":
adminPass
}
});

const data =
await res.json();

let html="";

if(data.users.length){

html += data.users.map(u=>`

<div class="item">

<div class="item-top">

<div>

<div class="item-title">
User
</div>

<div style="
font-size:8px;
color:#64748b;
word-break:break-all;
margin-top:4px;
">
${u.ownerKey}
</div>

</div>

<div class="badge">
${u.count}/5
</div>

</div>

<div style="
display:flex;
gap:7px;
margin-top:10px;
">

<button
class="small-btn"
style="background:#dc2626"
onclick="banUser('${u.ownerKey}')"
>
BAN
</button>

</div>

</div>

`).join("");

}else{

html +=
'<div style="color:#64748b;font-size:11px">No users today.</div>';

}

if(data.banned.length){

html += `
<div style="
margin-top:18px;
margin-bottom:8px;
font-size:11px;
font-weight:800;
">
BANNED USERS
</div>
`;

html += data.banned.map(u=>`

<div class="item">

<div style="
font-size:9px;
word-break:break-all;
color:#94a3b8;
">
${u.key}
</div>

<div style="
font-size:10px;
color:#ef4444;
margin-top:5px;
">
${escapeHtml(u.reason)}
</div>

<button
class="small-btn"
style="
margin-top:8px;
background:#16a34a;
"
onclick="unbanUser('${u.key}')"
>
UNBAN
</button>

</div>

`).join("");

}

box.innerHTML=html;

}catch{

box.innerHTML=
"Failed";

}

}


async function banUser(key){

if(!confirm("এই user-কে ban করবেন?"))
return;

const reason =
prompt("Ban reason:", "Policy violation")
|| "Banned by admin";

await fetch(
"/api/admin/user/ban",
{

method:"POST",

headers:
adminHeaders(),

body:JSON.stringify({
key,
reason
})

});

toast("User banned");

loadUsers();

}


async function unbanUser(key){

await fetch(
"/api/admin/user/unban",
{

method:"POST",

headers:
adminHeaders(),

body:JSON.stringify({
key
})

});

toast("User unbanned");

loadUsers();

}


async function loadAdminPages(){

const box =
document.getElementById(
"adminPages"
);

try{

const res =
await fetch(
"/api/admin/all-pages",
{
headers:{
"x-admin-pass":
adminPass
}
});

const data =
await res.json();

if(!data.length){

box.innerHTML=
'<div style="color:#64748b;font-size:11px">No pages.</div>';

return;

}

box.innerHTML =
data.map(p=>`

<div class="link-row">

<div>

<div class="link-name">
/${escapeHtml(p.slug)}
</div>

<div style="
font-size:9px;
color:#64748b;
margin-top:4px;
">
${formatSize(p.sizeBytes)}
•
${p.ownerType}
</div>

</div>

<div style="
display:flex;
gap:5px;
">

<a
class="small-btn"
href="/${encodeURIComponent(p.slug)}"
target="_blank"
>
VIEW
</a>

<button
class="small-btn"
style="background:#dc2626"
onclick="deletePage('${p._id}')"
>
DEL
</button>

</div>

</div>

`).join("");

}catch{

box.innerHTML="Failed";

}

}


async function deletePage(id){

if(!confirm("Delete this site?"))
return;

await fetch(
"/api/admin/page/"+id,
{

method:"DELETE",

headers:
adminHeaders()

});

toast("Site deleted");

loadAdmin();

}


function escapeHtml(value){

return String(value)
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;");

}


function safeUrl(url){

try{

const u=new URL(url);

if(
u.protocol==="http:" ||
u.protocol==="https:"
){

return u.href;

}

return "#";

}catch{

return "#";

}

}


function formatSize(bytes){

bytes=Number(bytes||0);

if(bytes<1024)
return bytes+" B";

if(bytes<1024*1024)
return (bytes/1024).toFixed(1)+" KB";

return (
bytes/(1024*1024)
).toFixed(2)+" MB";

}


window.addEventListener(
"load",
()=>{

setTimeout(()=>{

document
.getElementById("loader")
.style.opacity="0";

setTimeout(()=>{

document
.getElementById("loader")
.style.display="none";

},400);

},500);

loadQuota();

}
);

</script>

</body>

</html>`);
});


/* =========================================================
   DYNAMIC HTML PAGES
========================================================= */

app.get("/:slug", async (req, res) => {

  try {

    const slug =
      cleanSlug(req.params.slug);

    /*
      Protect reserved API/system paths.
    */

    if (
      slug === "api" ||
      slug === "health"
    ) {
      return res.status(404).send("Not Found");
    }

    const page =
      await Page.findOne({
        slug
      });

    if (!page) {

      return res.status(404).send(`
<!DOCTYPE html>

<html>

<head>

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>404</title>

</head>

<body style="
margin:0;
background:#02040a;
color:white;
font-family:sans-serif;
display:flex;
align-items:center;
justify-content:center;
min-height:100vh;
text-align:center;
">

<div>

<div style="
font-size:60px;
font-weight:800;
">
404
</div>

<div style="
color:#94a3b8;
">
Page Not Found
</div>

<a
href="/"
style="
display:inline-block;
margin-top:20px;
padding:10px 16px;
border-radius:10px;
background:#2563eb;
color:white;
text-decoration:none;
"
>
Go Home
</a>

</div>

</body>

</html>
`);
    }

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    /*
      Allow hosted HTML to work normally.
    */

    res.send(page.htmlContent);

  } catch (err) {

    console.error(err);

    res.status(500).send(
      "Server Error"
    );
  }

});


/* =========================================================
   PAYLOAD ERROR
========================================================= */

app.use((err, req, res, next) => {

  if (
    err &&
    (
      err.type === "entity.too.large" ||
      err.status === 413
    )
  ) {

    return res.status(413).json({
      error:
        "Uploaded HTML is too large."
    });
  }

  console.error(err);

  res.status(500).json({
    error: "Internal Server Error"
  });

});


/* =========================================================
   START
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "SJEMAR running on port " +
      PORT
    );

  }
);
