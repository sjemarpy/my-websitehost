const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || "py.py.php";

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "database.json");

const MAX_BODY_LIMIT = "25mb";

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({ limit: MAX_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: MAX_BODY_LIMIT }));

/* =========================================================
   DATABASE INITIALIZATION & HANDLERS
========================================================= */

const defaultDB = {
  sites: [],
  notes: [],
  posts: [],
  images: []
};

function initDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultDB, null, 2), "utf8");
    }
  } catch (err) {
    console.error("DB Init Error:", err);
  }
}

function getDB() {
  try {
    initDB();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      return {
        sites: Array.isArray(parsed.sites) ? parsed.sites : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        images: Array.isArray(parsed.images) ? parsed.images : []
      };
    }
  } catch (err) {
    console.error("DB Read Error:", err);
  }
  return { ...defaultDB };
}

function saveDB(db) {
  try {
    initDB();
    fs.writeFileSync(DATA_FILE, JSON.stringify(db || defaultDB, null, 2), "utf8");
  } catch (err) {
    console.error("DB Save Error:", err);
  }
}

initDB();

/* =========================================================
   HELPERS & UTILS
========================================================= */

function genId(len = 12) {
  return crypto.randomBytes(len).toString("hex");
}

function genSecret() {
  return crypto.randomBytes(32).toString("hex");
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function validSlug(value) {
  return /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(value);
}

function cleanText(value, max = 100) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
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
      return decodeURIComponent(item.substring(name.length + 1));
    }
  }
  return null;
}

/* =========================================================
   ADMIN SESSION & AUTH
========================================================= */

const sessions = new Map();

function adminLogged(req) {
  const token = getCookie(req, "sj_admin_token");
  if (!token) return false;

  const session = sessions.get(token);
  if (!session) return false;

  if (Date.now() - session.created > 14 * 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req, res, next) {
  if (!adminLogged(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized access" });
  }
  next();
}

/* =========================================================
   GLOBAL SECURITY HEADERS
========================================================= */

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.path.startsWith("/site/")) {
    res.setHeader(
      "Content-Security-Policy",
      "sandbox allow-scripts allow-forms allow-popups allow-modals"
    );
    res.setHeader("Cache-Control", "no-store");
  }
  next();
});

/* =========================================================
   BASE UI TEMPLATE
========================================================= */

function page(title, content, script = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#000000">
<title>${escapeHTML(title)} — SJEMAR CLOUD</title>
<style>
*{box-sizing:border-box}
html{background:#000}
body{
  margin:0;
  background:radial-gradient(circle at 50% -20%, rgba(255,255,255,.12), transparent 45%), #000;
  color:#fff;
  font-family:-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, Arial, sans-serif;
  -webkit-font-smoothing:antialiased;
  min-height:100vh;
  display:flex;
  flex-direction:column;
}
a{color:inherit;text-decoration:none}
button,input,textarea,select{font:inherit}
.nav{
  position:sticky;
  top:0;
  z-index:100;
  border-bottom:1px solid rgba(255,255,255,.08);
  background:rgba(0,0,0,.75);
  backdrop-filter:blur(25px);
  -webkit-backdrop-filter:blur(25px);
}
.nav-inner{
  width:min(1140px,calc(100% - 30px));
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
  font-size:18px;
}
.logo-box{
  width:34px;
  height:34px;
  display:grid;
  place-items:center;
  border-radius:11px;
  background:#fff;
  color:#000;
  font-weight:900;
}
.nav-menu{display:flex;gap:6px;align-items:center}
.nav-menu a{
  color:#888;
  padding:8px 14px;
  border-radius:12px;
  font-size:14px;
  font-weight:500;
  transition:.2s;
}
.nav-menu a:hover, .nav-menu a.active{
  color:#fff;
  background:rgba(255,255,255,.08);
}
.wrap{
  width:min(1140px,calc(100% - 30px));
  margin:auto;
}
.hero{
  padding:85px 0 50px;
  text-align:center;
}
.badge{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:7px 14px;
  border:1px solid rgba(255,255,255,.12);
  border-radius:999px;
  background:rgba(255,255,255,.05);
  color:#aaa;
  font-size:12px;
  backdrop-filter:blur(15px);
}
.badge-dot{
  width:7px;
  height:7px;
  border-radius:50%;
  background:#fff;
  box-shadow:0 0 12px #fff;
}
.hero h1{
  margin:20px auto 14px;
  max-width:880px;
  font-size:clamp(40px, 8vw, 84px);
  line-height:.95;
  letter-spacing:-.07em;
}
.hero p{
  max-width:620px;
  margin:auto;
  color:#888;
  line-height:1.65;
  font-size:16px;
}
.actions{
  margin-top:28px;
  display:flex;
  justify-content:center;
  flex-wrap:wrap;
  gap:10px;
}
.btn{
  min-height:44px;
  padding:0 18px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:13px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.06);
  color:#fff;
  cursor:pointer;
  font-size:13px;
  font-weight:600;
  transition:.2s;
  gap:6px;
}
.btn:hover{
  transform:translateY(-2px);
  background:rgba(255,255,255,.12);
}
.btn.primary{
  color:#000;
  background:#fff;
  border-color:#fff;
  font-weight:700;
}
.btn.danger{
  background:rgba(255,50,50,.15);
  border-color:rgba(255,50,50,.3);
  color:#ff6b6b;
}
.btn.danger:hover{
  background:rgba(255,50,50,.25);
}
.section{padding:30px 0 65px}
.section-head{margin-bottom:22px}
.section-head h2{margin:0;font-size:28px;letter-spacing:-.05em}
.section-head p{margin:6px 0 0;color:#777;font-size:14px}
.grid{
  display:grid;
  grid-template-columns:repeat(3, 1fr);
  gap:14px;
}
.grid-4{
  display:grid;
  grid-template-columns:repeat(4, 1fr);
  gap:14px;
}
.card{
  position:relative;
  overflow:hidden;
  padding:22px;
  border:1px solid rgba(255,255,255,.09);
  border-radius:24px;
  background:linear-gradient(145deg, rgba(255,255,255,.07), rgba(255,255,255,.02));
  backdrop-filter:blur(25px);
  box-shadow:0 25px 70px rgba(0,0,0,.5);
  transition:.25s;
}
.card:hover{
  transform:translateY(-4px);
  border-color:rgba(255,255,255,.18);
}
.card-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.icon{
  width:40px;
  height:40px;
  display:grid;
  place-items:center;
  border-radius:13px;
  border:1px solid rgba(255,255,255,.10);
  background:rgba(255,255,255,.06);
  font-size:11px;
  font-weight:800;
}
.pill{
  padding:5px 10px;
  border:1px solid rgba(255,255,255,.09);
  border-radius:999px;
  color:#888;
  font-size:11px;
}
.card h3{margin:22px 0 6px;font-size:20px;letter-spacing:-.03em}
.card p{margin:0;color:#888;line-height:1.5;font-size:13px}
.view{display:inline-flex;margin-top:16px;font-size:12px;font-weight:700}
.form{
  max-width:850px;
  margin:35px auto 70px;
  padding:28px;
  border:1px solid rgba(255,255,255,.09);
  border-radius:26px;
  background:rgba(255,255,255,.04);
  backdrop-filter:blur(25px);
}
.field{margin-bottom:16px}
label{display:block;margin-bottom:8px;color:#bbb;font-size:12px;font-weight:600}
input, textarea, select{
  width:100%;
  outline:0;
  color:#fff;
  background:rgba(0,0,0,.6);
  border:1px solid rgba(255,255,255,.11);
  border-radius:14px;
  padding:13px 15px;
  font-size:14px;
  transition:.2s;
}
input:focus, textarea:focus, select:focus{border-color:rgba(255,255,255,.35)}
textarea{
  min-height:280px;
  resize:vertical;
  font-family:ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size:13px;
  line-height:1.6;
}
.notice{
  display:none;
  margin:14px 0;
  padding:14px;
  border-radius:14px;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  color:#aaa;
  font-size:13px;
}
.notice.show{display:block}
.result{
  display:none;
  margin-top:18px;
  padding:20px;
  border-radius:18px;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.12);
}
.result.show{display:block}
.result code{
  display:block;
  margin:10px 0;
  padding:12px;
  overflow:auto;
  background:#050505;
  border-radius:12px;
  color:#00ffaa;
  font-family:monospace;
  font-size:13px;
}
.tabs{
  display:flex;
  gap:8px;
  margin-bottom:20px;
  border-bottom:1px solid rgba(255,255,255,.09);
  padding-bottom:12px;
  overflow-x:auto;
}
.tab-btn{
  padding:8px 16px;
  border-radius:10px;
  background:transparent;
  border:1px solid transparent;
  color:#888;
  cursor:pointer;
  font-size:13px;
  font-weight:600;
  transition:.2s;
}
.tab-btn.active{
  background:rgba(255,255,255,.1);
  border-color:rgba(255,255,255,.15);
  color:#fff;
}
.footer{
  margin-top:auto;
  padding:30px 0 45px;
  border-top:1px solid rgba(255,255,255,.07);
  color:#555;
  font-size:12px;
  text-align:center;
}
@media(max-width:850px){
  .grid{grid-template-columns:1fr 1fr}
  .grid-4{grid-template-columns:1fr 1fr}
}
@media(max-width:550px){
  .grid, .grid-4{grid-template-columns:1fr}
  .nav-menu{display:none}
  .hero h1{font-size:46px}
  .form{padding:18px}
}
</style>
</head>
<body>

<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="logo">
      <span class="logo-box">S</span>
      <span>SJEMAR CLOUD</span>
    </a>
    <div class="nav-menu">
      <a href="/">Home</a>
      <a href="/create">HTML Web</a>
      <a href="/notepad">Notepad</a>
      <a href="/images">Images</a>
      <a href="/posts">Posts</a>
      <a href="/admin">Admin</a>
    </div>
  </div>
</nav>

${content}

<footer class="footer">
  <div class="wrap">
    SJEMAR Engine &copy; 2026 — Secure All-in-One Cloud Hosting
  </div>
</footer>

${script}

</body>
</html>`;
}

/* =========================================================
   1. HOME PAGE
========================================================= */

app.get("/", (req, res) => {
  const db = getDB();
  const sites = db.sites.filter((x) => x.published !== false);
  const notes = db.notes.filter((x) => x.published !== false);
  const posts = db.posts.filter((x) => x.published !== false);
  const images = db.images || [];

  const totalViews =
    sites.reduce((a, b) => a + Number(b.views || 0), 0) +
    notes.reduce((a, b) => a + Number(b.views || 0), 0) +
    posts.reduce((a, b) => a + Number(b.views || 0), 0);

  const recentWebsites = sites.slice(0, 6).map((site) => `
    <div class="card">
      <div class="card-top">
        <div class="icon">WEB</div>
        <span class="pill">${Number(site.views || 0)} views</span>
      </div>
      <h3>${escapeHTML(site.title)}</h3>
      <p>Instant hosted static web project.</p>
      <a class="view" href="/site/${encodeURIComponent(site.slug)}">VISIT &rarr;</a>
    </div>
  `).join("");

  const recentNotes = notes.slice(0, 3).map((note) => `
    <div class="card">
      <div class="card-top">
        <div class="icon">TXT</div>
        <span class="pill">Note</span>
      </div>
      <h3>${escapeHTML(note.title)}</h3>
      <p>${escapeHTML(note.content.slice(0, 70))}...</p>
      <a class="view" href="/note/${encodeURIComponent(note.slug)}">READ NOTE &rarr;</a>
    </div>
  `).join("");

  res.send(
    page(
      "Home — Free All-in-One Platform",
      `
<main>
<section class="hero">
  <div class="wrap">
    <div class="badge">
      <span class="badge-dot"></span>
      100% Free Hosting Platform
    </div>
    <h1>Build. Host.<br>Paste. Share.</h1>
    <p>All-in-one suite for HTML websites, code pastebin, direct image hosting, and articles with instant public links.</p>
    <div class="actions">
      <a class="btn primary" href="/create">CREATE WEBSITE</a>
      <a class="btn" href="/notepad">PASTE NOTE</a>
      <a class="btn" href="/images">UPLOAD IMAGE</a>
      <a class="btn" href="/posts">READ POSTS</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h2>Cloud Services</h2>
      <p>Everything you need in one place.</p>
    </div>
    <div class="grid-4">
      <div class="card">
        <div class="card-top"><div class="icon">WEB</div><span class="pill">Fast</span></div>
        <h3>HTML Web</h3>
        <p>Host dynamic single page or static HTML apps instantly.</p>
        <a class="view" href="/create">DEPLOY &rarr;</a>
      </div>
      <div class="card">
        <div class="card-top"><div class="icon">TXT</div><span class="pill">Notepad</span></div>
        <h3>Pastebin</h3>
        <p>Save notes, codes and raw scripts with permanent share links.</p>
        <a class="view" href="/notepad">WRITE &rarr;</a>
      </div>
      <div class="card">
        <div class="card-top"><div class="icon">IMG</div><span class="pill">Direct</span></div>
        <h3>Image Host</h3>
        <p>Upload screenshots & photos to get instant direct links.</p>
        <a class="view" href="/images">UPLOAD &rarr;</a>
      </div>
      <div class="card">
        <div class="card-top"><div class="icon">DOC</div><span class="pill">Blog</span></div>
        <h3>Posts & News</h3>
        <p>Read developer articles, tutorials and announcements.</p>
        <a class="view" href="/posts">EXPLORE &rarr;</a>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="grid-4">
      <div class="card">
        <span class="pill">Websites</span>
        <h2 style="font-size:36px; margin:10px 0 0">${sites.length}</h2>
      </div>
      <div class="card">
        <span class="pill">Notepads</span>
        <h2 style="font-size:36px; margin:10px 0 0">${notes.length}</h2>
      </div>
      <div class="card">
        <span class="pill">Images</span>
        <h2 style="font-size:36px; margin:10px 0 0">${images.length}</h2>
      </div>
      <div class="card">
        <span class="pill">Total Hits</span>
        <h2 style="font-size:36px; margin:10px 0 0">${totalViews}</h2>
      </div>
    </div>
  </div>
</section>

${recentWebsites ? `
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h2>Published Websites</h2>
      <p>Explore recent sites built by users.</p>
    </div>
    <div class="grid">${recentWebsites}</div>
  </div>
</section>
` : ""}

${recentNotes ? `
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h2>Recent Notes & Pastes</h2>
      <p>Public codes and snippets.</p>
    </div>
    <div class="grid">${recentNotes}</div>
  </div>
</section>
` : ""}

</main>
`
    )
  );
});

/* =========================================================
   2. HTML HOSTING MODULE
========================================================= */

app.get("/create", (req, res) => {
  res.send(
    page(
      "Create HTML Website",
      `
<main class="wrap">
  <section class="hero" style="padding-bottom:15px">
    <div class="badge"><span class="badge-dot"></span> HTML &rarr; PUBLIC LINK</div>
    <h1>Host your HTML.</h1>
    <p>Paste any custom HTML/CSS/JS file to generate an instant link.</p>
  </section>

  <section class="form">
    <div class="field">
      <label>Website Title *</label>
      <input id="title" placeholder="My Awesome Project" maxlength="80">
    </div>
    <div class="field">
      <label>Custom Slug (Optional)</label>
      <input id="slug" placeholder="custom-slug" maxlength="50">
    </div>
    <div class="field">
      <label>HTML Code *</label>
      <textarea id="html" placeholder="<!DOCTYPE html>&#10;<html>&#10;<head><title>App</title></head>&#10;<body><h1>Hello World</h1></body>&#10;</html>"></textarea>
    </div>
    <div id="notice" class="notice"></div>
    <button id="publish" class="btn primary" style="width:100%">PUBLISH WEBSITE</button>

    <div id="result" class="result">
      <strong>Website Published!</strong>
      <p>Public Link:</p>
      <code id="url"></code>
      <div class="actions" style="justify-content:flex-start">
        <a id="open" class="btn primary" target="_blank">OPEN SITE</a>
        <button id="copy" class="btn">COPY LINK</button>
      </div>
    </div>
  </section>
</main>
`,
      `
<script>
const title = document.getElementById("title");
const slug = document.getElementById("slug");
const html = document.getElementById("html");
const publish = document.getElementById("publish");
const notice = document.getElementById("notice");
const result = document.getElementById("result");
const url = document.getElementById("url");
const open = document.getElementById("open");
const copy = document.getElementById("copy");

function showMsg(text){
  notice.textContent = text;
  notice.className = "notice show";
}

publish.onclick = async () => {
  if(!title.value.trim() || !html.value.trim()){
    return showMsg("Title and HTML code are required!");
  }
  publish.disabled = true;
  publish.textContent = "Publishing...";
  try{
    const r = await fetch("/api/publish", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ title: title.value, slug: slug.value, html: html.value })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Failed");

    url.textContent = d.site.url;
    open.href = d.site.url;
    result.className = "result show";
    showMsg("Website is live!");
  }catch(e){
    showMsg(e.message);
  }finally{
    publish.disabled = false;
    publish.textContent = "PUBLISH WEBSITE";
  }
};

copy.onclick = async () => {
  await navigator.clipboard.writeText(url.textContent);
  copy.textContent = "COPIED!";
  setTimeout(() => copy.textContent = "COPY LINK", 1500);
};
</script>
`
    )
  );
});

app.post("/api/publish", (req, res) => {
  try {
    const title = cleanText(req.body.title, 80);
    const html = req.body.html;
    let slug = slugify(req.body.slug || title);

    if (!title || !html || typeof html !== "string") {
      return res.status(400).json({ ok: false, error: "Title and valid HTML required" });
    }

    if (!slug) slug = "site-" + genId(4);
    if (!validSlug(slug)) return res.status(400).json({ ok: false, error: "Invalid URL slug" });

    const db = getDB();
    if (db.sites.some((s) => s.slug === slug)) {
      return res.status(409).json({ ok: false, error: "Slug already exists. Choose another." });
    }

    const editKey = genSecret();
    const site = {
      id: genId(),
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

    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");

    res.json({
      ok: true,
      site: {
        id: site.id,
        title: site.title,
        slug: site.slug,
        url: `${proto}://${host}/site/${site.slug}`,
        editKey
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Publish failed" });
  }
});

app.get("/site/:slug", (req, res) => {
  try {
    const db = getDB();
    const site = db.sites.find((s) => s.slug === req.params.slug);
    if (!site || site.published === false) {
      return res.status(404).send(notFound("Website not found or is private."));
    }
    site.views = Number(site.views || 0) + 1;
    saveDB(db);
    res.type("html").send(site.html);
  } catch (err) {
    res.status(500).send(notFound("Error rendering website"));
  }
});

/* =========================================================
   3. NOTEPAD / PASTEBIN MODULE
========================================================= */

app.get("/notepad", (req, res) => {
  res.send(
    page(
      "Cloud Notepad & Pastebin",
      `
<main class="wrap">
  <section class="hero" style="padding-bottom:15px">
    <div class="badge"><span class="badge-dot"></span> NOTEPAD / PASTEBIN</div>
    <h1>Save notes & code.</h1>
    <p>Create instant shareable text, JSON, logs or snippets.</p>
  </section>

  <section class="form">
    <div class="field">
      <label>Note Title *</label>
      <input id="nTitle" placeholder="My Note / Code Title">
    </div>
    <div class="field">
      <label>Language / Type</label>
      <select id="nLang">
        <option value="text">Plain Text</option>
        <option value="javascript">JavaScript / Node.js</option>
        <option value="html">HTML / XML</option>
        <option value="json">JSON</option>
        <option value="css">CSS</option>
        <option value="python">Python</option>
      </select>
    </div>
    <div class="field">
      <label>Note Content *</label>
      <textarea id="nContent" placeholder="Write or paste your note/code here..."></textarea>
    </div>
    <div id="nNotice" class="notice"></div>
    <button id="nSave" class="btn primary" style="width:100%">SAVE NOTE</button>

    <div id="nResult" class="result">
      <strong>Note Saved!</strong>
      <p>Public Link:</p>
      <code id="nUrl"></code>
      <p>Raw Link:</p>
      <code id="nRawUrl"></code>
      <div class="actions" style="justify-content:flex-start">
        <a id="nOpen" class="btn primary" target="_blank">OPEN NOTE</a>
      </div>
    </div>
  </section>
</main>
`,
      `
<script>
const nTitle = document.getElementById("nTitle");
const nLang = document.getElementById("nLang");
const nContent = document.getElementById("nContent");
const nSave = document.getElementById("nSave");
const nNotice = document.getElementById("nNotice");
const nResult = document.getElementById("nResult");
const nUrl = document.getElementById("nUrl");
const nRawUrl = document.getElementById("nRawUrl");
const nOpen = document.getElementById("nOpen");

function showMsg(t){
  nNotice.textContent = t;
  nNotice.className = "notice show";
}

nSave.onclick = async () => {
  if(!nTitle.value.trim() || !nContent.value.trim()){
    return showMsg("Title and content are required!");
  }
  nSave.disabled = true;
  try{
    const r = await fetch("/api/notes", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ title: nTitle.value, lang: nLang.value, content: nContent.value })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Save error");

    nUrl.textContent = d.note.url;
    nRawUrl.textContent = d.note.rawUrl;
    nOpen.href = d.note.url;
    nResult.className = "result show";
    showMsg("Note saved successfully!");
  }catch(e){
    showMsg(e.message);
  }finally{
    nSave.disabled = false;
  }
};
</script>
`
    )
  );
});

app.post("/api/notes", (req, res) => {
  try {
    const title = cleanText(req.body.title, 100);
    const content = req.body.content;
    const lang = cleanText(req.body.lang, 20) || "text";

    if (!title || !content || typeof content !== "string") {
      return res.status(400).json({ ok: false, error: "Title and content required" });
    }

    const db = getDB();
    const slug = slugify(title) || "note-" + genId(4);
    let finalSlug = slug;
    let count = 1;
    while (db.notes.some((n) => n.slug === finalSlug)) {
      finalSlug = `${slug}-${count++}`;
    }

    const note = {
      id: genId(),
      title,
      slug: finalSlug,
      lang,
      content,
      published: true,
      views: 0,
      createdAt: new Date().toISOString()
    };

    db.notes.unshift(note);
    saveDB(db);

    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");

    res.json({
      ok: true,
      note: {
        id: note.id,
        title: note.title,
        slug: note.slug,
        url: `${proto}://${host}/note/${note.slug}`,
        rawUrl: `${proto}://${host}/raw/${note.slug}`
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to save note" });
  }
});

app.get("/note/:slug", (req, res) => {
  const db = getDB();
  const note = db.notes.find((n) => n.slug === req.params.slug);
  if (!note || note.published === false) {
    return res.status(404).send(notFound("Note not found"));
  }

  note.views = Number(note.views || 0) + 1;
  saveDB(db);

  res.send(
    page(
      note.title,
      `
<main class="wrap" style="padding:40px 0">
  <div class="card" style="margin-bottom:20px">
    <div class="card-top">
      <div>
        <h1 style="margin:0;font-size:28px">${escapeHTML(note.title)}</h1>
        <p style="margin-top:6px;color:#777">Language: ${escapeHTML(note.lang)} | Created: ${new Date(note.createdAt).toLocaleDateString()}</p>
      </div>
      <div class="actions">
        <a href="/raw/${encodeURIComponent(note.slug)}" class="btn" target="_blank">RAW</a>
        <button id="copyBtn" class="btn">COPY CONTENT</button>
      </div>
    </div>
  </div>

  <div class="card" style="background:#050505; border-color:rgba(255,255,255,.15)">
    <pre style="margin:0; overflow-x:auto; font-family:monospace; font-size:14px; line-height:1.6; color:#e0e0e0"><code id="codeText">${escapeHTML(note.content)}</code></pre>
  </div>
</main>
`,
      `
<script>
document.getElementById("copyBtn").onclick = async () => {
  await navigator.clipboard.writeText(document.getElementById("codeText").innerText);
  const b = document.getElementById("copyBtn");
  b.textContent = "COPIED!";
  setTimeout(() => b.textContent = "COPY CONTENT", 1500);
};
</script>
`
    )
  );
});

app.get("/raw/:slug", (req, res) => {
  const db = getDB();
  const note = db.notes.find((n) => n.slug === req.params.slug);
  if (!note || note.published === false) return res.status(404).send("Not Found");
  res.type("text/plain").send(note.content);
});

/* =========================================================
   4. IMAGE HOSTING & LINK GENERATOR
========================================================= */

app.get("/images", (req, res) => {
  res.send(
    page(
      "Image Hosting",
      `
<main class="wrap">
  <section class="hero" style="padding-bottom:15px">
    <div class="badge"><span class="badge-dot"></span> DIRECT IMAGE HOSTING</div>
    <h1>Upload & Share Images</h1>
    <p>Get permanent direct links, markdown tags and HTML embed codes.</p>
  </section>

  <section class="form">
    <div class="field">
      <label>Image Title / Description</label>
      <input id="imgTitle" placeholder="Screenshot or Photo name">
    </div>
    <div class="field">
      <label>Select Image File *</label>
      <input id="imgFile" type="file" accept="image/*">
    </div>
    <div id="imgPreview" style="margin:15px 0; text-align:center; display:none">
      <img id="previewEl" style="max-width:100%; max-height:260px; border-radius:14px; border:1px solid rgba(255,255,255,.15)">
    </div>
    <div id="imgNotice" class="notice"></div>
    <button id="imgUpload" class="btn primary" style="width:100%">UPLOAD IMAGE</button>

    <div id="imgResult" class="result">
      <strong>Image Uploaded!</strong>
      <p>Direct Link:</p>
      <code id="imgDirectUrl"></code>
      <p>HTML Embed:</p>
      <code id="imgHtmlCode"></code>
      <div class="actions" style="justify-content:flex-start">
        <a id="imgOpen" class="btn primary" target="_blank">VIEW IMAGE</a>
      </div>
    </div>
  </section>
</main>
`,
      `
<script>
const imgFile = document.getElementById("imgFile");
const imgTitle = document.getElementById("imgTitle");
const previewEl = document.getElementById("previewEl");
const imgPreview = document.getElementById("imgPreview");
const imgUpload = document.getElementById("imgUpload");
const imgNotice = document.getElementById("imgNotice");
const imgResult = document.getElementById("imgResult");
const imgDirectUrl = document.getElementById("imgDirectUrl");
const imgHtmlCode = document.getElementById("imgHtmlCode");
const imgOpen = document.getElementById("imgOpen");

let base64Data = "";
let mimeType = "";

imgFile.onchange = (e) => {
  const file = e.target.files[0];
  if(!file) return;
  mimeType = file.type;
  const reader = new FileReader();
  reader.onload = (ev) => {
    base64Data = ev.target.result;
    previewEl.src = base64Data;
    imgPreview.style.display = "block";
  };
  reader.readAsDataURL(file);
};

imgUpload.onclick = async () => {
  if(!base64Data){
    imgNotice.textContent = "Please select an image!";
    imgNotice.className = "notice show";
    return;
  }
  imgUpload.disabled = true;
  try{
    const r = await fetch("/api/images", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({
        title: imgTitle.value || "Image",
        data: base64Data,
        mime: mimeType
      })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Upload failed");

    imgDirectUrl.textContent = d.image.url;
    imgHtmlCode.textContent = '<img src="' + d.image.url + '" alt="Image">';
    imgOpen.href = d.image.url;
    imgResult.className = "result show";
    imgNotice.textContent = "Image uploaded successfully!";
    imgNotice.className = "notice show";
  }catch(err){
    imgNotice.textContent = err.message;
    imgNotice.className = "notice show";
  }finally{
    imgUpload.disabled = false;
  }
};
</script>
`
    )
  );
});

app.post("/api/images", (req, res) => {
  try {
    const { title, data, mime } = req.body;
    if (!data || !mime) {
      return res.status(400).json({ ok: false, error: "Image data is required" });
    }

    const id = genId(8);
    const db = getDB();

    const imgObj = {
      id,
      title: cleanText(title || "Uploaded Image", 60),
      mime: cleanText(mime, 40),
      data,
      views: 0,
      createdAt: new Date().toISOString()
    };

    db.images.unshift(imgObj);
    saveDB(db);

    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");

    res.json({
      ok: true,
      image: {
        id,
        url: `${proto}://${host}/img/${id}`
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Image save error" });
  }
});

app.get("/img/:id", (req, res) => {
  const db = getDB();
  const img = db.images.find((x) => x.id === req.params.id);
  if (!img) return res.status(404).send("Image Not Found");

  img.views = Number(img.views || 0) + 1;
  saveDB(db);

  const matches = img.data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(500).send("Invalid image format");
  }

  const imageBuffer = Buffer.from(matches[2], "base64");
  res.writeHead(200, {
    "Content-Type": img.mime || matches[1],
    "Content-Length": imageBuffer.length,
    "Cache-Control": "public, max-age=86400"
  });
  res.end(imageBuffer);
});

/* =========================================================
   5. POSTS & BLOG MODULE
========================================================= */

app.get("/posts", (req, res) => {
  const db = getDB();
  const posts = db.posts.filter((p) => p.published !== false);

  const postList = posts.map((post) => `
    <div class="card" style="margin-bottom:15px">
      <div class="card-top">
        <span class="pill">${new Date(post.createdAt).toLocaleDateString()}</span>
        <span class="pill">${Number(post.views || 0)} reads</span>
      </div>
      <h2 style="margin:16px 0 8px; font-size:24px"><a href="/post/${encodeURIComponent(post.slug)}">${escapeHTML(post.title)}</a></h2>
      <p>${escapeHTML(post.content.slice(0, 150))}...</p>
      <a class="view" href="/post/${encodeURIComponent(post.slug)}">READ FULL POST &rarr;</a>
    </div>
  `).join("");

  res.send(
    page(
      "Community Posts & Articles",
      `
<main class="wrap" style="padding:40px 0">
  <div class="hero" style="padding:40px 0">
    <div class="badge"><span class="badge-dot"></span> COMMUNITY UPDATES</div>
    <h1>Posts & Articles</h1>
    <p>Read developer articles, tutorials and guides.</p>
  </div>

  <div style="max-width:850px; margin:auto">
    ${postList || `<div class="card"><p>No posts published yet.</p></div>`}
  </div>
</main>
`
    )
  );
});

app.get("/post/:slug", (req, res) => {
  const db = getDB();
  const post = db.posts.find((p) => p.slug === req.params.slug);
  if (!post || post.published === false) return res.status(404).send(notFound("Post not found"));

  post.views = Number(post.views || 0) + 1;
  saveDB(db);

  res.send(
    page(
      post.title,
      `
<main class="wrap" style="padding:50px 0; max-width:850px">
  <div class="card">
    <span class="pill">${new Date(post.createdAt).toLocaleDateString()}</span>
    <h1 style="font-size:38px; margin:16px 0">${escapeHTML(post.title)}</h1>
    <hr style="border:0; border-top:1px solid rgba(255,255,255,.1); margin:20px 0">
    <div style="font-size:16px; line-height:1.75; color:#ccc; white-space:pre-wrap">${escapeHTML(post.content)}</div>
  </div>
</main>
`
    )
  );
});

/* =========================================================
   6. SUPER ADMIN CONTROL PANEL (ALL-IN-ONE)
========================================================= */

app.get("/admin", (req, res) => {
  res.send(
    page(
      "Admin Control Panel",
      `
<main class="wrap" style="padding:40px 0">
  <!-- LOGIN FORM -->
  <section id="loginSection" class="form" style="max-width:460px; margin:60px auto">
    <div class="badge"><span class="badge-dot"></span> PROTECTED AREA</div>
    <h1 style="font-size:38px; letter-spacing:-.06em; margin:16px 0 6px">Admin Sign In</h1>
    <p style="color:#777; margin-bottom:20px">Enter secure master password to access system.</p>

    <div class="field">
      <label>Master Password</label>
      <input id="adminPass" type="password" placeholder="••••••••">
    </div>
    <div id="loginNotice" class="notice"></div>
    <button id="loginBtn" class="btn primary" style="width:100%">LOGIN TO SYSTEM</button>
  </section>

  <!-- DASHBOARD PANEL -->
  <section id="dashSection" style="display:none">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; flex-wrap:wrap; gap:10px">
      <div>
        <div class="badge"><span class="badge-dot"></span> MASTER CONTROL</div>
        <h1 style="font-size:36px; letter-spacing:-.05em; margin:8px 0 0">System Dashboard</h1>
      </div>
      <button id="logoutBtn" class="btn danger">LOGOUT</button>
    </div>

    <!-- TABS -->
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('sites')">Websites</button>
      <button class="tab-btn" onclick="switchTab('notes')">Notepads</button>
      <button class="tab-btn" onclick="switchTab('posts')">Posts</button>
      <button class="tab-btn" onclick="switchTab('images')">Images</button>
    </div>

    <div id="adminNotice" class="notice"></div>

    <!-- 1. SITES TAB -->
    <div id="tab-sites" class="tab-pane">
      <div class="card" style="margin-bottom:20px">
        <h3>Create New Website (Admin)</h3>
        <div class="field"><input id="adSiteTitle" placeholder="Title"></div>
        <div class="field"><input id="adSiteSlug" placeholder="Slug"></div>
        <div class="field"><textarea id="adSiteHtml" placeholder="HTML code"></textarea></div>
        <button onclick="createAdminSite()" class="btn primary">CREATE WEBSITE</button>
      </div>
      <div id="siteList"></div>
    </div>

    <!-- 2. NOTES TAB -->
    <div id="tab-notes" class="tab-pane" style="display:none">
      <div class="card" style="margin-bottom:20px">
        <h3>Create Note / Code</h3>
        <div class="field"><input id="adNoteTitle" placeholder="Title"></div>
        <div class="field"><textarea id="adNoteContent" placeholder="Content..."></textarea></div>
        <button onclick="createAdminNote()" class="btn primary">SAVE NOTE</button>
      </div>
      <div id="noteList"></div>
    </div>

    <!-- 3. POSTS TAB -->
    <div id="tab-posts" class="tab-pane" style="display:none">
      <div class="card" style="margin-bottom:20px">
        <h3>Publish Article / Post</h3>
        <div class="field"><input id="adPostTitle" placeholder="Post Title"></div>
        <div class="field"><textarea id="adPostContent" placeholder="Write post content..."></textarea></div>
        <button onclick="createAdminPost()" class="btn primary">PUBLISH POST</button>
      </div>
      <div id="postList"></div>
    </div>

    <!-- 4. IMAGES TAB -->
    <div id="tab-images" class="tab-pane" style="display:none">
      <div id="imageList" class="grid"></div>
    </div>
  </section>
</main>
`,
      `
<script>
const loginSection = document.getElementById("loginSection");
const dashSection = document.getElementById("dashSection");
const adminPass = document.getElementById("adminPass");
const loginBtn = document.getElementById("loginBtn");
const loginNotice = document.getElementById("loginNotice");
const logoutBtn = document.getElementById("logoutBtn");
const adminNotice = document.getElementById("adminNotice");

function msg(el, text){
  el.textContent = text;
  el.className = "notice show";
}

function switchTab(tabId){
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.style.display = "none");
  event.target.classList.add("active");
  document.getElementById("tab-" + tabId).style.display = "block";
}

async function api(url, opts = {}){
  const res = await fetch(url, opts);
  const data = await res.json();
  if(!res.ok || !data.ok) throw new Error(data.error || "Request failed");
  return data;
}

loginBtn.onclick = async () => {
  try{
    await api("/api/admin/login", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ password: adminPass.value })
    });
    adminPass.value = "";
    initAdmin();
  }catch(e){
    msg(loginNotice, e.message);
  }
};

logoutBtn.onclick = async () => {
  await api("/api/admin/logout", { method:"POST" });
  location.reload();
};

async function initAdmin(){
  try{
    await api("/api/admin/me");
    loginSection.style.display = "none";
    dashSection.style.display = "block";
    loadAll();
  }catch{
    loginSection.style.display = "block";
    dashSection.style.display = "none";
  }
}

async function loadAll(){
  loadSites();
  loadNotes();
  loadPosts();
  loadImages();
}

async function loadSites(){
  const d = await api("/api/admin/data");
  const el = document.getElementById("siteList");
  el.innerHTML = d.sites.map(s => \`
    <div class="card" style="margin-bottom:12px">
      <div class="card-top">
        <div>
          <h3 style="margin:0">\${s.title}</h3>
          <p style="color:#777">/site/\${s.slug} | Views: \${s.views || 0}</p>
        </div>
        <span class="pill">\${s.published ? "LIVE" : "HIDDEN"}</span>
      </div>
      <div class="actions" style="justify-content:flex-start">
        <a class="btn" target="_blank" href="/site/\${s.slug}">VISIT</a>
        <button class="btn" onclick="toggleItem('sites', '\${s.id}')">\${s.published ? 'HIDE' : 'SHOW'}</button>
        <button class="btn danger" onclick="deleteItem('sites', '\${s.id}')">DELETE</button>
      </div>
    </div>
  \`).join("") || "<p>No sites found.</p>";
}

async function loadNotes(){
  const d = await api("/api/admin/data");
  const el = document.getElementById("noteList");
  el.innerHTML = d.notes.map(n => \`
    <div class="card" style="margin-bottom:12px">
      <div class="card-top">
        <h3 style="margin:0">\${n.title}</h3>
        <span class="pill">\${n.published ? "PUBLIC" : "HIDDEN"}</span>
      </div>
      <div class="actions" style="justify-content:flex-start">
        <a class="btn" target="_blank" href="/note/\${n.slug}">VIEW</a>
        <button class="btn danger" onclick="deleteItem('notes', '\${n.id}')">DELETE</button>
      </div>
    </div>
  \`).join("") || "<p>No notes found.</p>";
}

async function loadPosts(){
  const d = await api("/api/admin/data");
  const el = document.getElementById("postList");
  el.innerHTML = d.posts.map(p => \`
    <div class="card" style="margin-bottom:12px">
      <div class="card-top">
        <h3 style="margin:0">\${p.title}</h3>
        <span class="pill">\${p.published ? "PUBLIC" : "HIDDEN"}</span>
      </div>
      <div class="actions" style="justify-content:flex-start">
        <a class="btn" target="_blank" href="/post/\${p.slug}">VIEW</a>
        <button class="btn danger" onclick="deleteItem('posts', '\${p.id}')">DELETE</button>
      </div>
    </div>
  \`).join("") || "<p>No posts found.</p>";
}

async function loadImages(){
  const d = await api("/api/admin/data");
  const el = document.getElementById("imageList");
  el.innerHTML = d.images.map(img => \`
    <div class="card">
      <img src="/img/\${img.id}" style="width:100%; height:130px; object-fit:cover; border-radius:12px; margin-bottom:10px">
      <div class="actions" style="justify-content:space-between">
        <a class="btn" target="_blank" href="/img/\${img.id}">VIEW</a>
        <button class="btn danger" onclick="deleteItem('images', '\${img.id}')">DEL</button>
      </div>
    </div>
  \`).join("") || "<p>No images found.</p>";
}

async function createAdminSite(){
  await api("/api/admin/sites", {
    method:"POST",
    headers:{ "Content-Type": "application/json" },
    body:JSON.stringify({
      title: document.getElementById("adSiteTitle").value,
      slug: document.getElementById("adSiteSlug").value,
      html: document.getElementById("adSiteHtml").value
    })
  });
  document.getElementById("adSiteTitle").value = "";
  document.getElementById("adSiteSlug").value = "";
  document.getElementById("adSiteHtml").value = "";
  loadSites();
}

async function createAdminNote(){
  await api("/api/notes", {
    method:"POST",
    headers:{ "Content-Type": "application/json" },
    body:JSON.stringify({
      title: document.getElementById("adNoteTitle").value,
      content: document.getElementById("adNoteContent").value
    })
  });
  document.getElementById("adNoteTitle").value = "";
  document.getElementById("adNoteContent").value = "";
  loadNotes();
}

async function createAdminPost(){
  await api("/api/admin/posts", {
    method:"POST",
    headers:{ "Content-Type": "application/json" },
    body:JSON.stringify({
      title: document.getElementById("adPostTitle").value,
      content: document.getElementById("adPostContent").value
    })
  });
  document.getElementById("adPostTitle").value = "";
  document.getElementById("adPostContent").value = "";
  loadPosts();
}

async function toggleItem(type, id){
  await api(\`/api/admin/\${type}/\${id}/toggle\`, { method:"PATCH" });
  loadAll();
}

async function deleteItem(type, id){
  if(!confirm("Permanently delete this item?")) return;
  await api(\`/api/admin/\${type}/\${id}\`, { method:"DELETE" });
  loadAll();
}

initAdmin();
</script>
`
    )
  );
});

/* =========================================================
   ADMIN API ROUTES
========================================================= */

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASS) {
    return res.status(401).json({ ok: false, error: "Incorrect Password!" });
  }

  const token = genSecret();
  sessions.set(token, { created: Date.now() });

  res.cookie("sj_admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 14 * 24 * 60 * 60 * 1000,
    path: "/"
  });

  res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  const token = getCookie(req, "sj_admin_token");
  if (token) sessions.delete(token);
  res.clearCookie("sj_admin_token", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.get("/api/admin/data", requireAdmin, (req, res) => {
  const db = getDB();
  res.json({
    ok: true,
    sites: db.sites,
    notes: db.notes,
    posts: db.posts,
    images: db.images.map((img) => ({ id: img.id, title: img.title, views: img.views }))
  });
});

app.post("/api/admin/sites", requireAdmin, (req, res) => {
  const { title, html } = req.body;
  let slug = slugify(req.body.slug || title) || "site-" + genId(4);

  const db = getDB();
  db.sites.unshift({
    id: genId(),
    title: cleanText(title, 80),
    slug,
    html,
    published: true,
    views: 0,
    createdAt: new Date().toISOString()
  });
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/admin/posts", requireAdmin, (req, res) => {
  const { title, content } = req.body;
  const db = getDB();
  db.posts.unshift({
    id: genId(),
    title: cleanText(title, 100),
    slug: slugify(title) || "post-" + genId(4),
    content,
    published: true,
    views: 0,
    createdAt: new Date().toISOString()
  });
  saveDB(db);
  res.json({ ok: true });
});

app.patch("/api/admin/:type/:id/toggle", requireAdmin, (req, res) => {
  const { type, id } = req.params;
  const db = getDB();
  if (!db[type]) return res.status(400).json({ ok: false, error: "Invalid type" });

  const item = db[type].find((x) => x.id === id);
  if (item) {
    item.published = item.published === false;
    saveDB(db);
  }
  res.json({ ok: true });
});

app.delete("/api/admin/:type/:id", requireAdmin, (req, res) => {
  const { type, id } = req.params;
  const db = getDB();
  if (!db[type]) return res.status(400).json({ ok: false, error: "Invalid type" });

  db[type] = db[type].filter((x) => x.id !== id);
  saveDB(db);
  res.json({ ok: true });
});

/* =========================================================
   404 HANDLER & SERVER START
========================================================= */

function notFound(msgText) {
  return page(
    "404 Not Found",
    `
<main class="hero">
  <div class="wrap">
    <div class="badge"><span class="badge-dot"></span> 404 ERROR</div>
    <h1>Page Not Found.</h1>
    <p>${escapeHTML(msgText)}</p>
    <div class="actions">
      <a href="/" class="btn primary">RETURN HOME</a>
    </div>
  </div>
</main>
`
  );
}

app.use((req, res) => {
  res.status(404).send(notFound("The requested resource does not exist."));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SJEMAR Cloud All-in-One Engine running at http://0.0.0.0:${PORT}`);
});
