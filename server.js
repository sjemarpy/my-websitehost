const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const app = express();

/* =========================================================
   CONFIG
========================================================= */

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

const ADMIN_PASS = process.env.ADMIN_PASS || "CHANGE_THIS_PASSWORD";

const USER_DAILY_LIMIT = 5;
const GLOBAL_DAILY_LIMIT = 250;

const USER_MAX_BYTES = 1 * 1024 * 1024;       // 1MB
const ADMIN_MAX_BYTES = 50 * 1024 * 1024;     // 50MB

if (!MONGO_URI) {
  console.error("MONGO_URI is missing.");
  process.exit(1);
}

/* =========================================================
   EXPRESS
========================================================= */

app.set("trust proxy", 1);

app.use(express.json({
  limit: "50mb",
  strict: true
}));

app.use(express.urlencoded({
  extended: true,
  limit: "50mb"
}));

/* =========================================================
   SECURITY / BASIC RATE LIMIT
========================================================= */

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

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
   MONGODB
========================================================= */

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch(err => {
    console.error("MongoDB Error:", err);
    process.exit(1);
  });

/* =========================================================
   SCHEMAS
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

  htmlContent: {
    type: String,
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
    default: "user",
    index: true
  },

  sizeBytes: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const Page = mongoose.model("Page", pageSchema);


const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 150
  },

  description: {
    type: String,
    required: true,
    maxlength: 1000
  },

  link: {
    type: String,
    required: true,
    maxlength: 2000
  },

  badge: {
    type: String,
    default: "VERIFIED",
    maxlength: 40
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const Task = mongoose.model("Task", taskSchema);


/*
  DailyUsage

  ownerKey:
    hashed IP for users
    "GLOBAL" for global counter
*/

const dailyUsageSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },

  ownerKey: {
    type: String,
    required: true
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

dailyUsageSchema.index(
  { date: 1, ownerKey: 1 },
  { unique: true }
);

const DailyUsage = mongoose.model(
  "DailyUsage",
  dailyUsageSchema
);


const bannedSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  reason: {
    type: String,
    default: "No reason"
  },

  createdAt: {
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
