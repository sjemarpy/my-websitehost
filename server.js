const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || "py.py.php";

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "pages.json");

const MAX_HTML = 10 * 1024 * 1024;

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

/* =========================
   DATABASE
========================= */

function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ sites: [] }, null, 2)
    );
  }
}

function getDB() {
  initDB();

  try {
    return JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );
  } catch {
    return { sites: [] };
  }
}

function saveDB(db) {
  initDB();

  const temp = DATA_FILE + ".tmp";

  fs.writeFileSync(
    temp,
    JSON.stringify(db, null, 2),
    "utf8"
  );

  fs.renameSync(temp, DATA_FILE);
}

initDB();

/* =========================
   HELPERS
========================= */

function id() {
  return crypto.randomBytes(12).toString("hex");
}

function secret() {
  return crypto.randomBytes(32).toString("hex");
}

function hash(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function validSlug(value) {
  return /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(value);
}

function cleanTitle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  for (const part of cookies.split(";")) {
    const item = part.trim();

    if (item.startsWith(name + "=")) {
      return decodeURIComponent(
        item.substring(name.length + 1)
      );
    }
  }

  return null;
}

/* =========================
   ADMIN SESSION
========================= */

const sessions = new Map();

function adminLogged(req) {
  const token = getCookie(req, "sj_admin");

  if (!token) return false;

  const session = sessions.get(token);

  if (!session) return false;

  if (
    Date.now() - session.created >
    7 * 24 * 60 * 60 * 1000
  ) {
    sessions.delete(token);
    return false;
  }

  return true;
}

function requireAdmin(req, res, next) {
  if (!adminLogged(req)) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized"
    });
  }

  next();
}

/* =========================
   SECURITY
========================= */

app.use((req, res, next) => {
  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  /*
    Published user HTML is sandboxed.
    This prevents hosted JavaScript from becoming
    the same security origin as the admin application.
  */
  if (req.path.startsWith("/site/")) {
    res.setHeader(
      "Content-Security-Policy",
      "sandbox allow-scripts allow-forms allow-popups allow-modals"
    );
    res.setHeader(
      "Cache-Control",
      "no-store"
    );
  }

  next();
});

/* =========================================================
   PUBLIC HTML -> LINK
========================================================= */

app.post("/api/publish", (req, res) => {
  try {
    const title = cleanTitle(req.body.title);
    const html = req.body.html;

    let slug = slugify(
      req.body.slug || title
    );

    if (!title) {
      return res.status(400).json({
        ok: false,
        error: "Website title is required"
      });
    }

    if (
      typeof html !== "string" ||
      !html.trim()
    ) {
      return res.status(400).json({
        ok: false,
        error: "HTML is required"
      });
    }

    if (
      Buffer.byteLength(html, "utf8") >
      MAX_HTML
    ) {
      return res.status(400).json({
        ok: false,
        error: "HTML maximum size is 10MB"
      });
    }

    if (!slug) {
      slug =
        "site-" +
        crypto.randomBytes(4).toString("hex");
    }

    if (!validSlug(slug)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid URL slug"
      });
    }

    const db = getDB();

    if (
      db.sites.some(
        site => site.slug === slug
      )
    ) {
      return res.status(409).json({
        ok: false,
        error: "URL already exists"
      });
    }

    const editKey = secret();

    const site = {
      id: id(),
      title,
      slug,
      html,
      editKey: hash(editKey),
      published: true,
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.sites.unshift(site);

    saveDB(db);

    res.json({
      ok: true,
      site: {
        id: site.id,
        title: site.title,
        slug: site.slug,
        url:
          req.protocol +
          "://" +
          req.get("host") +
          "/site/" +
          site.slug,
        editKey
      }
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      ok: false,
      error: "Publish failed"
    });
  }
});

/* =========================================================
   PUBLIC SITE
========================================================= */

app.get("/site/:slug", (req, res) => {
  const db = getDB();

  const site = db.sites.find(
    x => x.slug === req.params.slug
  );

  if (!site || site.published === false) {
    return res.status(404).send(
      notFound("Website not found")
    );
  }

  site.views =
    Number(site.views || 0) + 1;

  saveDB(db);

  res.type("html").send(site.html);
});

/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post("/api/admin/login", (req, res) => {
  const password =
    String(req.body.password || "");

  if (password !== ADMIN_PASS) {
    return res.status(401).json({
      ok: false,
      error: "Wrong password"
    });
  }

  const token = secret();

  sessions.set(token, {
    created: Date.now()
  });

  res.cookie("sj_admin", token, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "strict",
    maxAge:
      7 * 24 * 60 * 60 * 1000,
    path: "/"
  });

  res.json({
    ok: true
  });
});

app.post(
  "/api/admin/logout",
  (req, res) => {
    const token =
      getCookie(req, "sj_admin");

    if (token) {
      sessions.delete(token);
    }

    res.clearCookie("sj_admin", {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "strict",
      path: "/"
    });

    res.json({
      ok: true
    });
  }
);

/* =========================================================
   ADMIN API
========================================================= */

app.get(
  "/api/admin/me",
  requireAdmin,
  (req, res) => {
    res.json({
      ok: true
    });
  }
);

app.get(
  "/api/admin/sites",
  requireAdmin,
  (req, res) => {
    const db = getDB();

    res.json({
      ok: true,
      sites: db.sites.map(site => ({
        id: site.id,
        title: site.title,
        slug: site.slug,
        published:
          site.published !== false,
        views:
          Number(site.views || 0),
        createdAt: site.createdAt,
        updatedAt: site.updatedAt
      }))
    });
  }
);

app.get(
  "/api/admin/sites/:id",
  requireAdmin,
  (req, res) => {
    const db = getDB();

    const site = db.sites.find(
      x => x.id === req.params.id
    );

    if (!site) {
      return res.status(404).json({
        ok: false,
        error: "Site not found"
      });
    }

    res.json({
      ok: true,
      site: {
        id: site.id,
        title: site.title,
        slug: site.slug,
        html: site.html,
        published:
          site.published !== false,
        views:
          Number(site.views || 0)
      }
    });
  }
);

app.post(
  "/api/admin/sites",
  requireAdmin,
  (req, res) => {
    try {
      const title =
        cleanTitle(req.body.title);

      const html = req.body.html;

      let slug = slugify(
        req.body.slug || title
      );

      if (!title || !html) {
        return res.status(400).json({
          ok: false,
          error: "Title and HTML are required"
        });
      }

      if (
        Buffer.byteLength(
          html,
          "utf8"
        ) > MAX_HTML
      ) {
        return res.status(400).json({
          ok: false,
          error: "HTML is too large"
        });
      }

      if (!slug) {
        slug =
          "site-" +
          crypto.randomBytes(4).toString("hex");
      }

      if (!validSlug(slug)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid slug"
        });
      }

      const db = getDB();

      if (
        db.sites.some(
          x => x.slug === slug
        )
      ) {
        return res.status(409).json({
          ok: false,
          error: "Slug already exists"
        });
      }

      const site = {
        id: id(),
        title,
        slug,
        html,
        editKey: hash(secret()),
        published: true,
        views: 0,
        createdAt:
          new Date().toISOString(),
        updatedAt:
          new Date().toISOString()
      };

      db.sites.unshift(site);

      saveDB(db);

      res.json({
        ok: true,
        site: {
          id: site.id,
          title: site.title,
          slug: site.slug
        }
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        ok: false,
        error: "Create failed"
      });
    }
  }
);

app.put(
  "/api/admin/sites/:id",
  requireAdmin,
  (req, res) => {
    const db = getDB();

    const site = db.sites.find(
      x => x.id === req.params.id
    );

    if (!site) {
      return res.status(404).json({
        ok: false,
        error: "Site not found"
      });
    }

    const title =
      cleanTitle(req.body.title);

    const html = req.body.html;

    if (!title || !html) {
      return res.status(400).json({
        ok: false,
        error: "Title and HTML are required"
      });
    }

    if (
      Buffer.byteLength(
        html,
        "utf8"
      ) > MAX_HTML
    ) {
      return res.status(400).json({
        ok: false,
        error: "HTML is too large"
      });
    }

    site.title = title;
    site.html = html;

    if (
      typeof req.body.published ===
      "boolean"
    ) {
      site.published =
        req.body.published;
    }

    site.updatedAt =
      new Date().toISOString();

    saveDB(db);

    res.json({
      ok: true
    });
  }
);

app.patch(
  "/api/admin/sites/:id/toggle",
  requireAdmin,
  (req, res) => {
    const db = getDB();

    const site = db.sites.find(
      x => x.id === req.params.id
    );

    if (!site) {
      return res.status(404).json({
        ok: false,
        error: "Site not found"
      });
    }

    site.published =
      site.published === false;

    site.updatedAt =
      new Date().toISOString();

    saveDB(db);

    res.json({
      ok: true,
      published:
        site.published
    });
  }
);

app.delete(
  "/api/admin/sites/:id",
  requireAdmin,
  (req, res) => {
    const db = getDB();

    const oldLength =
      db.sites.length;

    db.sites =
      db.sites.filter(
        x => x.id !== req.params.id
      );

    if (
      db.sites.length ===
      oldLength
    ) {
      return res.status(404).json({
        ok: false,
        error: "Site not found"
      });
    }

    saveDB(db);

    res.json({
      ok: true
    });
  }
);

/* =========================================================
   HOME PAGE
========================================================= */

function page(title, content, script = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#000000">

<title>${escapeHTML(title)} — SJEMAR</title>

<style>

*{
  box-sizing:border-box;
}

html{
  background:#000;
}

body{
  margin:0;
  background:
    radial-gradient(
      circle at 50% -10%,
      rgba(255,255,255,.10),
      transparent 35%
    ),
    #000;
  color:#fff;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    Inter,
    Arial,
    sans-serif;
  -webkit-font-smoothing:antialiased;
}

a{
  color:inherit;
  text-decoration:none;
}

button,
input,
textarea{
  font:inherit;
}

.nav{
  position:sticky;
  top:0;
  z-index:100;
  border-bottom:
    1px solid rgba(255,255,255,.07);
  background:
    rgba(0,0,0,.72);
  backdrop-filter:
    blur(25px);
  -webkit-backdrop-filter:
    blur(25px);
}

.nav-inner{
  width:min(1120px,calc(100% - 28px));
  height:68px;
  margin:auto;
  display:flex;
  align-items:center;
  justify-content:space-between;
}

.logo{
  display:flex;
  align-items:center;
  gap:10px;
  font-weight:800;
  letter-spacing:-.04em;
}

.logo-box{
  width:34px;
  height:34px;
  display:grid;
  place-items:center;
  border-radius:11px;
  background:#fff;
  color:#000;
  font-size:13px;
}

.nav-menu{
  display:flex;
  gap:5px;
}

.nav-menu a{
  color:#999;
  padding:10px 13px;
  border-radius:12px;
}

.nav-menu a:hover{
  color:#fff;
  background:
    rgba(255,255,255,.07);
}

.wrap{
  width:min(1120px,calc(100% - 28px));
  margin:auto;
}

.hero{
  padding:
    105px 0 70px;
  text-align:center;
}

.badge{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:
    8px 13px;
  border:
    1px solid rgba(255,255,255,.11);
  border-radius:999px;
  background:
    rgba(255,255,255,.045);
  color:#aaa;
  font-size:12px;
  backdrop-filter:
    blur(15px);
}

.badge-dot{
  width:7px;
  height:7px;
  border-radius:50%;
  background:#fff;
  box-shadow:
    0 0 14px #fff;
}

.hero h1{
  margin:
    24px auto 15px;
  max-width:850px;
  font-size:
    clamp(48px,9vw,92px);
  line-height:.92;
  letter-spacing:-.075em;
}

.hero p{
  max-width:650px;
  margin:auto;
  color:#999;
  line-height:1.7;
  font-size:16px;
}

.actions{
  margin-top:28px;
  display:flex;
  justify-content:center;
  flex-wrap:wrap;
  gap:9px;
}

.btn{
  min-height:45px;
  padding:
    0 18px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:14px;
  border:
    1px solid rgba(255,255,255,.11);
  background:
    rgba(255,255,255,.055);
  color:#fff;
  cursor:pointer;
  transition:.2s;
}

.btn:hover{
  transform:translateY(-2px);
  background:
    rgba(255,255,255,.10);
}

.btn.primary{
  color:#000;
  background:#fff;
  border-color:#fff;
  font-weight:700;
}

.section{
  padding:
    30px 0 75px;
}

.section-head{
  margin-bottom:20px;
}

.section-head h2{
  margin:0;
  font-size:29px;
  letter-spacing:-.05em;
}

.section-head p{
  margin:
    7px 0 0;
  color:#777;
}

.grid{
  display:grid;
  grid-template-columns:
    repeat(3,1fr);
  gap:13px;
}

.card{
  position:relative;
  overflow:hidden;
  padding:24px;
  min-height:210px;
  border:
    1px solid rgba(255,255,255,.09);
  border-radius:25px;
  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.075),
      rgba(255,255,255,.025)
    );
  backdrop-filter:
    blur(25px);
  -webkit-backdrop-filter:
    blur(25px);
  box-shadow:
    0 25px 70px
    rgba(0,0,0,.45);
  transition:.25s;
}

.card:before{
  content:"";
  position:absolute;
  width:170px;
  height:170px;
  right:-80px;
  top:-90px;
  border-radius:50%;
  background:
    rgba(255,255,255,.035);
  filter:blur(20px);
}

.card:hover{
  transform:
    translateY(-4px);
  border-color:
    rgba(255,255,255,.17);
}

.card-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.icon{
  width:43px;
  height:43px;
  display:grid;
  place-items:center;
  border-radius:14px;
  border:
    1px solid rgba(255,255,255,.10);
  background:
    rgba(255,255,255,.065);
  font-size:11px;
  font-weight:800;
}

.pill{
  padding:
    6px 9px;
  border:
    1px solid rgba(255,255,255,.09);
  border-radius:999px;
  color:#999;
  font-size:10px;
}

.card h3{
  margin:
    28px 0 8px;
  font-size:21px;
  letter-spacing:-.035em;
}

.card p{
  margin:0;
  color:#888;
  line-height:1.55;
  font-size:14px;
}

.view{
  display:inline-flex;
  margin-top:19px;
  font-size:12px;
  font-weight:700;
}

.feature{
  display:grid;
  grid-template-columns:
    1.4fr .6fr;
  gap:13px;
}

.large{
  min-height:330px;
}

.large h2{
  margin-top:90px;
  margin-bottom:10px;
  font-size:42px;
  letter-spacing:-.065em;
}

.small-stack{
  display:grid;
  gap:13px;
}

.mini{
  min-height:158px;
}

.number{
  display:block;
  font-size:40px;
  font-weight:800;
  letter-spacing:-.07em;
}

.form{
  max-width:900px;
  margin:
    45px auto 90px;
  padding:25px;
  border:
    1px solid rgba(255,255,255,.09);
  border-radius:27px;
  background:
    rgba(255,255,255,.045);
  backdrop-filter:
    blur(25px);
}

.field{
  margin-bottom:17px;
}

label{
  display:block;
  margin-bottom:8px;
  color:#bbb;
  font-size:12px;
}

input,
textarea{
  width:100%;
  outline:0;
  color:#fff;
  background:
    rgba(0,0,0,.55);
  border:
    1px solid rgba(255,255,255,.10);
  border-radius:14px;
  padding:13px;
}

textarea{
  min-height:430px;
  resize:vertical;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  font-size:12px;
  line-height:1.55;
}

input:focus,
textarea:focus{
  border-color:
    rgba(255,255,255,.30);
}

.notice{
  display:none;
  margin:14px 0;
  padding:14px;
  border-radius:14px;
  background:
    rgba(255,255,255,.05);
  border:
    1px solid rgba(255,255,255,.10);
  color:#aaa;
}

.notice.show{
  display:block;
}

.result{
  display:none;
  margin-top:15px;
  padding:18px;
  border-radius:18px;
  background:
    rgba(255,255,255,.045);
  border:
    1px solid rgba(255,255,255,.09);
}

.result.show{
  display:block;
}

.result code{
  display:block;
  margin:
    10px 0;
  padding:12px;
  overflow:auto;
  background:#000;
  border-radius:12px;
  color:#ccc;
}

.footer{
  padding:
    35px 0 55px;
  border-top:
    1px solid rgba(255,255,255,.07);
  color:#666;
  font-size:12px;
}

@media(max-width:800px){

  .grid{
    grid-template-columns:
      1fr 1fr;
  }

  .feature{
    grid-template-columns:1fr;
  }

}

@media(max-width:550px){

  .wrap{
    width:
      calc(100% - 22px);
  }

  .hero{
    padding-top:75px;
  }

  .hero h1{
    font-size:51px;
  }

  .grid{
    grid-template-columns:1fr;
  }

  .nav-menu a{
    display:none;
  }

  .large h2{
    font-size:32px;
  }

  .form{
    padding:17px;
  }
}

</style>
</head>

<body>

<nav class="nav">
  <div class="nav-inner">

    <a href="/" class="logo">
      <span class="logo-box">S</span>
      <span>SJEMAR</span>
    </a>

    <div class="nav-menu">
      <a href="/">Home</a>
      <a href="/create">Create</a>
      <a href="/admin">Admin</a>
    </div>

  </div>
</nav>

${content}

<footer class="footer">
  <div class="wrap">
    SJEMAR Hosting Engine
  </div>
</footer>

${script}

</body>
</html>`;
}

/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {

  const db = getDB();

  const sites =
    db.sites.filter(
      x => x.published !== false
    );

  const views =
    sites.reduce(
      (a, b) =>
        a + Number(b.views || 0),
      0
    );

  const projects =
    sites
      .slice(0, 6)
      .map(site => `
        <div class="card">

          <div class="card-top">
            <div class="icon">
              WEB
            </div>

            <span class="pill">
              100% Free
            </span>
          </div>

          <h3>
            ${escapeHTML(site.title)}
          </h3>

          <p>
            Published website project
          </p>

          <a
            class="view"
            href="/site/${encodeURIComponent(site.slug)}"
          >
            VIEW
          </a>

        </div>
      `)
      .join("");

  res.send(
    page(
      "SJEMAR",
      `
<main>

<section class="hero">

  <div class="wrap">

    <div class="badge">
      <span class="badge-dot"></span>
      100% Free Hosting
    </div>

    <h1>
      Build.<br>
      Publish.<br>
      Share.
    </h1>

    <p>
      Upload your HTML website and
      instantly get a public link.
      Fast, simple and built for the web.
    </p>

    <div class="actions">

      <a
        class="btn primary"
        href="/create"
      >
        CREATE WEBSITE
      </a>

      <a
        class="btn"
        href="#resources"
      >
        EXPLORE
      </a>

    </div>

  </div>

</section>

<section
  class="section"
  id="resources"
>

<div class="wrap">

<div class="section-head">

  <h2>
    Resources
  </h2>

  <p>
    Free tools and services.
  </p>

</div>

<div class="grid">

  <div class="card">

    <div class="card-top">

      <div class="icon">
        WEB
      </div>

      <span class="pill">
        100% Free
      </span>

    </div>

    <h3>
      Website
    </h3>

    <p>
      Create and publish
      your own HTML website.
    </p>

    <a
      class="view"
      href="/create"
    >
      VIEW
    </a>

  </div>


  <div class="card">

    <div class="card-top">

      <div class="icon">
        APK
      </div>

      <span class="pill">
        FREE
      </span>

    </div>

    <h3>
      APK
    </h3>

    <p>
      HTML based application
      project section.
    </p>

    <a
      class="view"
      href="/create"
    >
      VIEW
    </a>

  </div>


  <div class="card">

    <div class="card-top">

      <div class="icon">
        BOT
      </div>

      <span class="pill">
        FREE
      </span>

    </div>

    <h3>
      BOT
    </h3>

    <p>
      Bot and automation
      project section.
    </p>

    <a
      class="view"
      href="/create"
    >
      VIEW
    </a>

  </div>

</div>

</div>

</section>


<section class="section">

<div class="wrap">

<div class="feature">

  <div class="card large">

    <div class="card-top">

      <div class="icon">
        SJ
      </div>

      <span class="pill">
        SJEMAR
      </span>

    </div>

    <h2>
      OLED.<br>
      Glass.<br>
      Simple.
    </h2>

    <p>
      A clean dark interface
      designed for mobile and
      desktop.
    </p>

  </div>


  <div class="small-stack">

    <div class="card mini">

      <span class="number">
        ${sites.length}
      </span>

      <p>
        Published websites
      </p>

    </div>


    <div class="card mini">

      <span class="number">
        ${views}
      </span>

      <p>
        Total views
      </p>

    </div>

  </div>

</div>

</div>

</section>


${
  projects
    ? `
<section class="section">

<div class="wrap">

<div class="section-head">

  <h2>
    Review Projects
  </h2>

  <p>
    Latest published websites.
  </p>

</div>

<div class="grid">
${projects}
</div>

</div>

</section>
`
    : ""
}


<section class="section">

<div class="wrap">

<div class="card large">

  <div class="card-top">

    <div class="icon">
      HTML
    </div>

    <span class="pill">
      INSTANT
    </span>

  </div>

  <h2>
    Have an HTML file?
  </h2>

  <p>
    Publish it now and receive
    a shareable public URL.
  </p>

  <div class="actions"
       style="justify-content:flex-start">

    <a
      class="btn primary"
      href="/create"
    >
      UPLOAD HTML
    </a>

  </div>

</div>

</div>

</section>

</main>
`
    )
  );
});

/* =========================================================
   CREATE PAGE
========================================================= */

app.get("/create", (req, res) => {

  res.send(
    page(
      "Create Website",
      `
<main class="wrap">

<section class="hero"
         style="padding-bottom:20px">

  <div class="badge">
    <span class="badge-dot"></span>
    HTML → LINK
  </div>

  <h1>
    Publish your<br>
    website.
  </h1>

  <p>
    Paste your HTML code,
    choose a URL and publish.
  </p>

</section>


<section class="form">

  <div class="field">

    <label>
      Website title
    </label>

    <input
      id="title"
      maxlength="80"
      placeholder="My Website"
    >

  </div>


  <div class="field">

    <label>
      URL slug
    </label>

    <input
      id="slug"
      maxlength="50"
      placeholder="my-website"
    >

  </div>


  <div class="field">

    <label>
      HTML
    </label>

    <textarea
      id="html"
      spellcheck="false"
      placeholder="<!DOCTYPE html>
<html>
<head>
<title>My Website</title>
</head>
<body>
<h1>Hello World</h1>
</body>
</html>"
    ></textarea>

  </div>


  <div
    id="notice"
    class="notice"
  ></div>


  <button
    id="publish"
    class="btn primary"
    style="width:100%"
  >
    PUBLISH WEBSITE
  </button>


  <div
    id="result"
    class="result"
  >

    <strong>
      Website published
    </strong>

    <p>
      Your public link:
    </p>

    <code id="url"></code>

    <div
      class="actions"
      style="justify-content:flex-start"
    >

      <a
        id="open"
        class="btn primary"
        target="_blank"
      >
        OPEN
      </a>

      <button
        id="copy"
        class="btn"
      >
        COPY LINK
      </button>

    </div>


    <p
      style="
      color:#666;
      font-size:12px;
      margin-top:18px"
    >
      Save this edit key.
    </p>

    <code id="key"></code>

  </div>

</section>

</main>
`,
      `
<script>

const title =
  document.getElementById("title");

const slug =
  document.getElementById("slug");

const html =
  document.getElementById("html");

const publish =
  document.getElementById("publish");

const notice =
  document.getElementById("notice");

const result =
  document.getElementById("result");

const url =
  document.getElementById("url");

const key =
  document.getElementById("key");

const open =
  document.getElementById("open");

const copy =
  document.getElementById("copy");


function show(text){

  notice.textContent = text;

  notice.className =
    "notice show";

}


title.addEventListener(
  "input",
  () => {

    if(slug.dataset.manual)
      return;

    slug.value =
      title.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g,"-")
        .replace(/^-+|-+$/g,"")
        .slice(0,50);

  }
);


slug.addEventListener(
  "input",
  () => {

    slug.dataset.manual = "1";

    slug.value =
      slug.value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g,"")
        .slice(0,50);

  }
);


publish.addEventListener(
  "click",
  async () => {

    if(!title.value.trim()){
      show("Enter website title.");
      return;
    }

    if(!html.value.trim()){
      show("Paste your HTML.");
      return;
    }

    publish.disabled = true;
    publish.textContent =
      "PUBLISHING...";

    try{

      const r =
        await fetch(
          "/api/publish",
          {
            method:"POST",
            headers:{
              "Content-Type":
                "application/json"
            },
            body:JSON.stringify({
              title:title.value,
              slug:slug.value,
              html:html.value
            })
          }
        );

      const data =
        await r.json();

      if(!r.ok || !data.ok){
        throw new Error(
          data.error ||
          "Publish failed"
        );
      }

      url.textContent =
        data.site.url;

      key.textContent =
        data.site.editKey;

      open.href =
        data.site.url;

      result.classList.add(
        "show"
      );

      show(
        "Website published successfully."
      );

      result.scrollIntoView({
        behavior:"smooth"
      });

    }catch(error){

      show(
        error.message
      );

    }finally{

      publish.disabled = false;

      publish.textContent =
        "PUBLISH WEBSITE";

    }

  }
);


copy.addEventListener(
  "click",
  async () => {

    try{

      await navigator.clipboard
        .writeText(
          url.textContent
        );

      copy.textContent =
        "COPIED";

      setTimeout(
        () =>
          copy.textContent =
            "COPY LINK",
        1500
      );

    }catch{

      show(
        "Copy failed."
      );

    }

  }
);

</script>
`
    )
  );
});

/* =========================================================
   ADMIN PAGE
========================================================= */

app.get("/admin", (req, res) => {

  res.send(
    page(
      "Admin",
      `
<main class="wrap">

<section
  id="login"
  class="form"
  style="max-width:500px"
>

  <div class="badge">
    <span class="badge-dot"></span>
    PRIVATE AREA
  </div>

  <h1
    style="
    font-size:48px;
    letter-spacing:-.07em"
  >
    Admin
  </h1>

  <p style="color:#777">
    Manage your websites.
  </p>

  <div class="field">

    <label>
      Password
    </label>

    <input
      id="password"
      type="password"
    >

  </div>

  <div
    id="loginNotice"
    class="notice"
  ></div>

  <button
    id="loginBtn"
    class="btn primary"
    style="width:100%"
  >
    SIGN IN
  </button>

</section>


<section
  id="dashboard"
  style="
  display:none;
  padding:60px 0"
>

  <div
    style="
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:15px;
    margin-bottom:20px"
  >

    <div>

      <div class="badge">
        <span class="badge-dot"></span>
        CONTROL CENTER
      </div>

      <h1
        style="
        font-size:44px;
        letter-spacing:-.07em"
      >
        Websites
      </h1>

    </div>

    <button
      id="logout"
      class="btn"
    >
      LOG OUT
    </button>

  </div>


  <div class="card">

    <h3>
      Create Website
    </h3>

    <div class="field">

      <label>
        Title
      </label>

      <input
        id="aTitle"
        placeholder="Website title"
      >

    </div>

    <div class="field">

      <label>
        Slug
      </label>

      <input
        id="aSlug"
        placeholder="website-name"
      >

    </div>

    <div class="field">

      <label>
        HTML
      </label>

      <textarea
        id="aHTML"
        style="min-height:300px"
      ></textarea>

    </div>

    <button
      id="create"
      class="btn primary"
    >
      CREATE WEBSITE
    </button>

    <div
      id="adminNotice"
      class="notice"
    ></div>

  </div>


  <div
    id="sites"
    style="margin-top:15px"
  ></div>

</section>

</main>
`,
      `
<script>

const login =
  document.getElementById("login");

const dashboard =
  document.getElementById(
    "dashboard"
  );

const password =
  document.getElementById(
    "password"
  );

const loginBtn =
  document.getElementById(
    "loginBtn"
  );

const loginNotice =
  document.getElementById(
    "loginNotice"
  );

const sites =
  document.getElementById(
    "sites"
  );


function msg(el,text){

  el.textContent = text;

  el.className =
    "notice show";

}


async function api(
  url,
  options={}
){

  const r =
    await fetch(
      url,
      options
    );

  const data =
    await r.json();

  if(!r.ok || !data.ok){

    throw new Error(
      data.error ||
      "Request failed"
    );

  }

  return data;

}


async function check(){

  try{

    await api(
      "/api/admin/me"
    );

    login.style.display =
      "none";

    dashboard.style.display =
      "block";

    load();

  }catch{

    login.style.display =
      "block";

    dashboard.style.display =
      "none";

  }

}


loginBtn.onclick =
  async () => {

    try{

      await api(
        "/api/admin/login",
        {
          method:"POST",
          headers:{
            "Content-Type":
              "application/json"
          },
          body:JSON.stringify({
            password:
              password.value
          })
        }
      );

      password.value = "";

      check();

    }catch(error){

      msg(
        loginNotice,
        error.message
      );

    }

  };


password.onkeydown =
  e => {

    if(e.key === "Enter")
      loginBtn.click();

  };


document.getElementById(
  "logout"
).onclick =
  async () => {

    await api(
      "/api/admin/logout",
      {
        method:"POST"
      }
    );

    check();

  };


document.getElementById(
  "create"
).onclick =
  async () => {

    const button =
      document.getElementById(
        "create"
      );

    try{

      button.disabled = true;

      await api(
        "/api/admin/sites",
        {
          method:"POST",
          headers:{
            "Content-Type":
              "application/json"
          },
          body:JSON.stringify({

            title:
              document.getElementById(
                "aTitle"
              ).value,

            slug:
              document.getElementById(
                "aSlug"
              ).value,

            html:
              document.getElementById(
                "aHTML"
              ).value

          })
        }
      );

      document.getElementById(
        "aTitle"
      ).value = "";

      document.getElementById(
        "aSlug"
      ).value = "";

      document.getElementById(
        "aHTML"
      ).value = "";

      msg(
        document.getElementById(
          "adminNotice"
        ),
        "Website created."
      );

      load();

    }catch(error){

      msg(
        document.getElementById(
          "adminNotice"
        ),
        error.message
      );

    }finally{

      button.disabled = false;

    }

  };


async function load(){

  try{

    const data =
      await api(
        "/api/admin/sites"
      );

    if(!data.sites.length){

      sites.innerHTML = `
        <div class="card">
          <h3>No websites</h3>
          <p>
            Create your first website.
          </p>
        </div>
      `;

      return;

    }


    sites.innerHTML =
      data.sites
        .map(
          site => `

<div
  class="card"
  style="margin-bottom:12px"
>

  <div class="card-top">

    <div>

      <h3
        style="margin:0"
      >
        ${esc(site.title)}
      </h3>

      <p>
        /site/${esc(site.slug)}
      </p>

    </div>

    <span class="pill">
      ${
        site.published
          ? "PUBLISHED"
          : "HIDDEN"
      }
    </span>

  </div>


  <div
    class="actions"
    style="
    justify-content:flex-start"
  >

    <a
      class="btn"
      target="_blank"
      href="/site/${encodeURIComponent(
        site.slug
      )}"
    >
      VIEW
    </a>

    <button
      class="btn"
      onclick="toggleSite(
        '${site.id}'
      )"
    >
      ${
        site.published
          ? "UNPUBLISH"
          : "PUBLISH"
      }
    </button>

    <button
      class="btn"
      onclick="deleteSite(
        '${site.id}'
      )"
    >
      DELETE
    </button>

  </div>

  <p>
    Views:
    ${Number(site.views || 0)}
  </p>

</div>

`
        )
        .join("");

  }catch(error){

    sites.innerHTML =
      `
      <div class="card">
        ${esc(error.message)}
      </div>
      `;

  }

}


async function toggleSite(id){

  await api(
    "/api/admin/sites/" +
    id +
    "/toggle",
    {
      method:"PATCH"
    }
  );

  load();

}


async function deleteSite(id){

  if(
    !confirm(
      "Delete this website permanently?"
    )
  ){
    return;
  }

  await api(
    "/api/admin/sites/" +
    id,
    {
      method:"DELETE"
    }
  );

  load();

}


function esc(value){

  return String(value || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


check();

</script>
`
    )
  );
});

/* =========================================================
   ROBOTS
========================================================= */

app.get(
  "/robots.txt",
  (req, res) => {

    res.type("text/plain");

    res.send(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin
`
    );

  }
);

/* =========================================================
   404
========================================================= */

function notFound(text){

  return page(
    "404",
    `
<main class="hero">

  <div class="wrap">

    <div class="badge">
      <span class="badge-dot"></span>
      404
    </div>

    <h1>
      Not found.
    </h1>

    <p>
      ${escapeHTML(text)}
    </p>

    <div class="actions">

      <a
        href="/"
        class="btn primary"
      >
        HOME
      </a>

      <a
        href="/create"
        class="btn"
      >
        CREATE
      </a>

    </div>

  </div>

</main>
`
  );

}


app.use(
  (req, res) => {

    res.status(404)
      .send(
        notFound(
          "The page does not exist."
        )
      );

  }
);

/* =========================================================
   ERROR
========================================================= */

app.use(
  (err, req, res, next) => {

    console.error(err);

    if(res.headersSent)
      return next(err);

    res.status(500)
      .send(
        notFound(
          "Server error."
        )
      );

  }
);

/* =========================================================
   START
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "SJEMAR Hosting started"
    );

    console.log(
      "PORT:",
      PORT
    );

    console.log(
      "HOME: /"
    );

    console.log(
      "CREATE: /create"
    );

    console.log(
      "ADMIN: /admin"
    );

  }
);
