"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

/* =========================================================
   CONFIG
========================================================= */

const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || "py.py.php";
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "pages.json");
const MAX_HTML_SIZE = 10 * 1024 * 1024;

/* =========================================================
   EXPRESS MIDDLEWARE
========================================================= */

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: true, limit: "12mb" }));
app.use(express.json({ limit: "12mb" }));

/* =========================================================
   DATABASE
========================================================= */

function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ sites: [] }, null, 2));
  }
}

initDB();

function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data);

    if (!parsed || !Array.isArray(parsed.sites)) {
      return { sites: [] };
    }

    return parsed;
  } catch (error) {
    console.error("Database error:", error);
    return { sites: [] };
  }
}

function saveDB(db) {
  const temp = DB_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(temp, DB_FILE);
}

/* =========================================================
   HELPERS
========================================================= */

function id() {
  return crypto.randomBytes(16).toString("hex");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function validSlug(value) {
  return /^[a-z0-9][a-z0-9-_]{1,79}$/.test(value);
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validHTML(html) {
  if (typeof html !== "string" || html.length === 0) {
    return false;
  }
  return Buffer.byteLength(html, "utf8") <= MAX_HTML_SIZE;
}

/* =========================================================
   ADMIN AUTH
========================================================= */

const COOKIE_NAME = "sjemar_admin";

function createToken() {
  const time = Date.now().toString();
  const hash = crypto
    .createHash("sha256")
    .update(time + ":" + ADMIN_PASS)
    .digest("hex");

  return time + "." + hash;
}

function checkToken(token) {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const time = Number(parts[0]);
  const hash = parts[1];

  if (!Number.isFinite(time)) return false;
  if (Date.now() - time > 24 * 60 * 60 * 1000) return false;

  const expected = crypto
    .createHash("sha256")
    .update(time + ":" + ADMIN_PASS)
    .digest("hex");

  return hash === expected;
}

function cookies(req) {
  const header = req.headers.cookie || "";
  const result = {};

  header.split(";").forEach((item) => {
    const index = item.indexOf("=");
    if (index === -1) return;

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    result[key] = decodeURIComponent(value);
  });

  return result;
}

function authenticated(req) {
  const data = cookies(req);
  return checkToken(data[COOKIE_NAME]);
}

function adminOnly(req, res, next) {
  if (!authenticated(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }
  next();
}

/* =========================================================
   SECURITY HEADERS
========================================================= */

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SJEMAR Hosting</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{background:#030407;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif}
body:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 15% 10%,rgba(255,255,255,.08),transparent 30%),radial-gradient(circle at 85% 15%,rgba(90,110,255,.08),transparent 28%)}
.nav{position:relative;width:min(1100px,calc(100% - 28px));margin:16px auto;padding:15px 18px;display:flex;align-items:center;justify-content:space-between;border:1px solid rgba(255,255,255,.08);border-radius:22px;background:rgba(18,19,24,.65);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px)}
.logo{font-size:17px;font-weight:700;letter-spacing:-.4px}
.pill{font-size:12px;color:#9299a8;padding:7px 11px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07)}
.hero{width:min(1100px,calc(100% - 28px));margin:100px auto 60px;text-align:center}
.hero h1{margin:0;font-size:clamp(44px,8vw,78px);line-height:.98;letter-spacing:-4px}
.hero p{width:min(650px,100%);margin:25px auto 0;color:#858d9d;font-size:16px;line-height:1.7}
.cards{width:min(1100px,calc(100% - 28px));margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:15px}
.card{min-height:190px;padding:27px;border-radius:27px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025));box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 25px 80px rgba(0,0,0,.4);backdrop-filter:blur(25px)}
.card h2{margin:0 0 10px;font-size:19px}
.card p{margin:0;color:#858d9d;line-height:1.6;font-size:14px}
footer{text-align:center;padding:60px 20px 40px;color:#555c68;font-size:12px}
@media(max-width:760px){.cards{grid-template-columns:1fr}.hero{margin-top:70px}.hero h1{letter-spacing:-2.5px}}
</style>
</head>
<body>
<header class="nav">
  <div class="logo">SJEMAR</div>
  <div class="pill">Web Hosting</div>
</header>
<section class="hero">
  <h1>Publish your web.</h1>
  <p>Host HTML projects and turn them into public web links with SJEMAR Hosting.</p>
</section>
<section class="cards">
  <div class="card">
    <h2>HTML Hosting</h2>
    <p>Upload a complete HTML document containing your CSS and JavaScript.</p>
  </div>
  <div class="card">
    <h2>Public Links</h2>
    <p>Every published project gets a unique URL that can be shared.</p>
  </div>
  <div class="card">
    <h2>Management</h2>
    <p>Manage, edit, publish and delete hosted projects from the admin area.</p>
  </div>
</section>
<footer>SJEMAR Hosting Engine</footer>
</body>
</html>`);
});

/* =========================================================
   ADMIN LOGIN PAGE
========================================================= */

app.get("/admin", (req, res) => {
  if (authenticated(req)) {
    return res.redirect("/admin/dashboard");
  }

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SJEMAR Admin</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#030407;color:white;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif}
.login{width:100%;max-width:410px;padding:30px;border-radius:29px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.09);box-shadow:0 30px 100px rgba(0,0,0,.6);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px)}
h1{margin:0 0 8px;font-size:28px}
p{margin:0 0 20px;color:#858d9d;font-size:14px}
input{width:100%;height:53px;padding:0 16px;border-radius:16px;border:1px solid rgba(255,255,255,.09);outline:none;background:rgba(0,0,0,.3);color:#fff;font-size:15px}
button{width:100%;height:53px;margin-top:12px;border:0;border-radius:16px;background:#fff;color:#000;font-weight:700;cursor:pointer}
#error{display:none;margin-top:12px;color:#ff7777;font-size:13px}
</style>
</head>
<body>
<div class="login">
<h1>SJEMAR Admin</h1>
<p>Private administration panel.</p>
<form id="loginForm">
<input id="password" type="password" placeholder="Password" autocomplete="current-password" required>
<button type="submit">Continue</button>
<div id="error">Invalid password.</div>
</form>
</div>
<script>
document.getElementById("loginForm").addEventListener("submit", async function(e){
  e.preventDefault();
  const password = document.getElementById("password").value;
  try{
    const response = await fetch("/api/admin/login", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ password })
    });
    const data = await response.json();
    if(data.success){
      location.href = "/admin/dashboard";
    }else{
      document.getElementById("error").style.display = "block";
    }
  }catch(error){
    document.getElementById("error").textContent = "Server error.";
    document.getElementById("error").style.display = "block";
  }
});
</script>
</body>
</html>`);
});

/* =========================================================
   LOGIN API
========================================================= */

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body.password || "");

  if (password !== ADMIN_PASS) {
    return res.status(401).json({
      success: false,
      error: "Invalid password",
    });
  }

  const token = createToken();
  res.setHeader(
    "Set-Cookie",
    COOKIE_NAME +
      "=" +
      encodeURIComponent(token) +
      "; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400"
  );

  res.json({ success: true });
});

/* =========================================================
   LOGOUT
========================================================= */

app.post("/api/admin/logout", adminOnly, (req, res) => {
  res.setHeader(
    "Set-Cookie",
    COOKIE_NAME + "=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
  );
  res.json({ success: true });
});

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

app.get("/admin/dashboard", adminOnly, (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SJEMAR Dashboard</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#030407;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif}
.wrap{width:min(1150px,calc(100% - 26px));margin:auto;padding:18px 0 70px}
.top{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:17px 19px;border-radius:23px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);backdrop-filter:blur(25px)}
.logo{font-weight:750}
.logout,.btn{border:0;border-radius:13px;padding:11px 15px;cursor:pointer}
.logout{background:rgba(255,255,255,.07);color:#fff}
.primary{background:#fff;color:#000}
.secondary{background:rgba(255,255,255,.07);color:#fff}
.danger{background:rgba(255,60,60,.12);color:#ff8888}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-top:16px}
.stat{padding:20px;border-radius:21px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}
.stat span{display:block;color:#747c8b;font-size:12px;margin-bottom:8px}
.stat strong{font-size:28px}
.panel{margin-top:16px;padding:20px;border-radius:24px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}
.toolbar{display:flex;gap:10px;flex-wrap:wrap}
.search{flex:1;min-width:200px}
input,textarea,select{width:100%;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.28);color:#fff;outline:none;padding:13px}
.editor{display:none;margin-top:17px}
.form-grid{display:grid;grid-template-columns:340px 1fr;gap:14px}
textarea{min-height:450px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.5}
.field{margin-bottom:11px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.sites{display:grid;gap:11px;margin-top:17px}
.site{padding:18px;border-radius:20px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.065)}
.site-title{font-weight:700}
.site-url{margin-top:5px;color:#727b8a;font-size:12px;word-break:break-all}
.site-description{margin-top:8px;color:#7e8796;font-size:13px}
.site-actions{margin-top:14px;display:flex;gap:7px;flex-wrap:wrap}
.site-actions button{font-size:12px}
.badge{display:inline-block;margin-top:9px;padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.06);color:#9ca4b2;font-size:11px}
@media(max-width:800px){.stats{grid-template-columns:repeat(2,1fr)}.form-grid{grid-template-columns:1fr}}
@media(max-width:500px){.stats{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
<div class="top">
<div class="logo">SJEMAR Admin</div>
<button class="logout" onclick="logout()">Logout</button>
</div>
<div class="stats" id="stats"></div>
<div class="panel">
<div class="toolbar">
<input class="search" id="search" placeholder="Search websites">
<button class="btn primary" onclick="createNew()">New Website</button>
</div>
<div class="editor" id="editor">
<div class="form-grid">
<div>
<div class="field"><input id="title" placeholder="Website title"></div>
<div class="field"><input id="slug" placeholder="Slug"></div>
<div class="field"><input id="description" placeholder="Description"></div>
<div class="field"><input id="favicon" placeholder="Favicon URL"></div>
<div class="field">
<select id="status">
<option value="published">Published</option>
<option value="draft">Draft</option>
</select>
</div>
<div class="actions">
<button class="btn primary" onclick="save()">Save</button>
<button class="btn secondary" onclick="closeEditor()">Cancel</button>
</div>
</div>
<div>
<textarea id="html" placeholder="Complete HTML..."></textarea>
</div>
</div>
</div>
<div class="sites" id="sites"></div>
</div>
</div>
<script>
let sites = [];
let editingId = null;
const $ = id => document.getElementById(id);

async function request(url, options = {}){
  const response = await fetch(url, options);
  if(response.status === 401){
    location.href = "/admin";
    return null;
  }
  return response.json();
}

async function load(){
  const data = await request("/api/admin/sites");
  if(!data) return;
  sites = data.sites || [];
  drawStats();
  drawSites();
}

function drawStats(){
  const total = sites.length;
  const published = sites.filter(x => x.status === "published").length;
  const draft = total - published;
  const html = sites.reduce((sum,x) => sum + Number(x.htmlSize || 0), 0);

  $("stats").innerHTML = \`
<div class="stat"><span>Total</span><strong>\${total}</strong></div>
<div class="stat"><span>Published</span><strong>\${published}</strong></div>
<div class="stat"><span>Draft</span><strong>\${draft}</strong></div>
<div class="stat"><span>HTML Storage</span><strong>\${formatSize(html)}</strong></div>
\`;
}

function formatSize(bytes){
  if(bytes < 1024) return bytes + " B";
  if(bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function safe(value){
  return String(value || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function drawSites(){
  const query = $("search").value.toLowerCase().trim();
  const filtered = sites.filter(site =>
    site.title.toLowerCase().includes(query) ||
    site.slug.toLowerCase().includes(query)
  );

  if(!filtered.length){
    $("sites").innerHTML = \`<div class="site">No websites found.</div>\`;
    return;
  }

  $("sites").innerHTML = filtered.map(site => \`
<div class="site">
<div class="site-title">\${safe(site.title)}</div>
<div class="site-url">/site/\${safe(site.slug)}</div>
<div class="site-description">\${safe(site.description)}</div>
<div class="badge">\${safe(site.status)}</div>
<div class="site-actions">
<button class="btn secondary" onclick="preview('\${site.id}')">Preview</button>
<button class="btn secondary" onclick="edit('\${site.id}')">Edit</button>
<button class="btn secondary" onclick="toggle('\${site.id}')">
  \${site.status === "published" ? "Unpublish" : "Publish"}
</button>
<button class="btn danger" onclick="removeSite('\${site.id}')">Delete</button>
</div>
</div>
\`).join("");
}

$("search").addEventListener("input", drawSites);

function createNew(){
  editingId = null;
  $("editor").style.display = "block";
  $("title").value = "";
  $("slug").value = "";
  $("description").value = "";
  $("favicon").value = "";
  $("status").value = "published";
  $("html").value = "<!DOCTYPE html>\\n<html lang=\\"en\\">\\n<head>\\n<meta charset=\\"UTF-8\\">\\n<title>My Website</title>\\n</head>\\n<body>\\n<h1>Hello World</h1>\\n</body>\\n</html>";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function edit(id){
  const site = sites.find(x => x.id === id);
  if(!site) return;
  editingId = id;
  $("editor").style.display = "block";
  $("title").value = site.title || "";
  $("slug").value = site.slug || "";
  $("description").value = site.description || "";
  $("favicon").value = site.favicon || "";
  $("status").value = site.status || "draft";
  $("html").value = site.html || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeEditor(){
  editingId = null;
  $("editor").style.display = "none";
}

async function save(){
  const payload = {
    title: $("title").value.trim(),
    slug: $("slug").value.trim(),
    description: $("description").value.trim(),
    favicon: $("favicon").value.trim(),
    status: $("status").value,
    html: $("html").value
  };

  if(!payload.title || !payload.slug || !payload.html){
    alert("Title, slug and HTML are required.");
    return;
  }

  let data;
  if(editingId){
    data = await request("/api/admin/sites/" + encodeURIComponent(editingId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }else{
    data = await request("/api/admin/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  if(data && data.success){
    closeEditor();
    await load();
  }else{
    alert(data?.error || "Could not save website.");
  }
}

async function toggle(id){
  const site = sites.find(x => x.id === id);
  if(!site) return;
  const status = site.status === "published" ? "draft" : "published";
  const data = await request("/api/admin/sites/" + encodeURIComponent(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  if(data && data.success) await load();
}

function preview(id){
  const site = sites.find(x => x.id === id);
  if(!site) return;
  window.open("/site/" + encodeURIComponent(site.slug), "_blank");
}

async function removeSite(id){
  if(!confirm("Delete this website permanently?")) return;
  const data = await request("/api/admin/sites/" + encodeURIComponent(id), {
    method: "DELETE"
  });
  if(data && data.success) await load();
}

async function logout(){
  await fetch("/api/admin/logout", { method: "POST" });
  location.href = "/admin";
}

load();
</script>
</body>
</html>`);
});

/* =========================================================
   ADMIN API - LIST
========================================================= */

app.get("/api/admin/sites", adminOnly, (req, res) => {
  const db = readDB();
  const sites = db.sites.map((site) => ({
    id: site.id,
    title: site.title,
    slug: site.slug,
    description: site.description || "",
    favicon: site.favicon || "",
    status: site.status || "draft",
    html: site.html || "",
    htmlSize: Buffer.byteLength(site.html || "", "utf8"),
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  }));

  res.json({ success: true, sites });
});

/* =========================================================
   CREATE
========================================================= */

app.post("/api/admin/sites", adminOnly, (req, res) => {
  const title = String(req.body.title || "").trim();
  const slug = slugify(req.body.slug);
  const description = String(req.body.description || "").trim().slice(0, 500);
  const favicon = String(req.body.favicon || "").trim().slice(0, 1000);
  const status = req.body.status === "published" ? "published" : "draft";
  const html = String(req.body.html || "");

  if (!title || title.length > 120) {
    return res.status(400).json({ success: false, error: "Invalid title." });
  }

  if (!validSlug(slug)) {
    return res.status(400).json({ success: false, error: "Invalid slug." });
  }

  if (!validHTML(html)) {
    return res.status(400).json({ success: false, error: "HTML is empty or too large." });
  }

  const db = readDB();

  if (db.sites.some((site) => site.slug === slug)) {
    return res.status(409).json({ success: false, error: "This slug is already in use." });
  }

  const now = new Date().toISOString();
  const site = {
    id: id(),
    title,
    slug,
    description,
    favicon,
    status,
    html,
    createdAt: now,
    updatedAt: now,
  };

  db.sites.push(site);
  saveDB(db);

  res.json({ success: true, site });
});

/* =========================================================
   UPDATE
========================================================= */

app.put("/api/admin/sites/:id", adminOnly, (req, res) => {
  const db = readDB();
  const site = db.sites.find((x) => x.id === req.params.id);

  if (!site) {
    return res.status(404).json({ success: false, error: "Website not found." });
  }

  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim();
    if (!title || title.length > 120) {
      return res.status(400).json({ success: false, error: "Invalid title." });
    }
    site.title = title;
  }

  if (req.body.slug !== undefined) {
    const slug = slugify(req.body.slug);
    if (!validSlug(slug)) {
      return res.status(400).json({ success: false, error: "Invalid slug." });
    }

    const duplicate = db.sites.some((x) => x.id !== site.id && x.slug === slug);
    if (duplicate) {
      return res.status(409).json({ success: false, error: "This slug is already in use." });
    }
    site.slug = slug;
  }

  if (req.body.description !== undefined) {
    site.description = String(req.body.description).slice(0, 500);
  }

  if (req.body.favicon !== undefined) {
    site.favicon = String(req.body.favicon).slice(0, 1000);
  }

  if (req.body.status !== undefined) {
    site.status = req.body.status === "published" ? "published" : "draft";
  }

  if (req.body.html !== undefined) {
    const html = String(req.body.html);
    if (!validHTML(html)) {
      return res.status(400).json({ success: false, error: "HTML is empty or too large." });
    }
    site.html = html;
  }

  site.updatedAt = new Date().toISOString();
  saveDB(db);

  res.json({ success: true, site });
});

/* =========================================================
   DELETE
========================================================= */

app.delete("/api/admin/sites/:id", adminOnly, (req, res) => {
  const db = readDB();
  const index = db.sites.findIndex((x) => x.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: "Website not found." });
  }

  db.sites.splice(index, 1);
  saveDB(db);

  res.json({ success: true });
});

/* =========================================================
   PUBLIC HOSTED SITE
========================================================= */

app.get("/site/:slug", (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  const db = readDB();
  const site = db.sites.find((x) => x.slug === slug);

  if (!site || site.status !== "published") {
    return res.status(404).send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>404</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#030407;color:white;font-family:system-ui;text-align:center}p{color:#777}</style></head>
<body><div><h1>404</h1><p>Website not found.</p></div></body></html>`);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.send(site.html);
});

/* =========================================================
   SHORT PUBLIC URL
========================================================= */

app.get("/:slug", (req, res, next) => {
  const reserved = ["admin", "api", "site", "robots.txt", "favicon.ico"];

  if (reserved.includes(req.params.slug)) {
    return next();
  }

  const slug = String(req.params.slug || "").toLowerCase();
  const db = readDB();
  const site = db.sites.find((x) => x.slug === slug && x.status === "published");

  if (!site) {
    return next();
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(site.html);
});

/* =========================================================
   ROBOTS
========================================================= */

app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n");
});

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ success: false, error: "Endpoint not found." });
  }

  res.status(404).send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>404</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#030407;color:#fff;font-family:system-ui;text-align:center}h1{font-size:70px;margin:0}p{color:#777}</style></head>
<body><div><h1>404</h1><p>The requested page was not found.</p></div></body></html>`);
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, error: "Internal server error." });
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log("SJEMAR Hosting Engine started on port:", PORT);
});
