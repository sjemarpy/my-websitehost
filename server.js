/**
 * SJEMAR PLATFORM - Production Ready Single File Server
 * Safe for Render / Railway / VPS
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || "py.py.php";

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "database.json");

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

process.on("uncaughtException", function (err) {
  console.error("UNCAUGHT EXCEPTION:", err && err.message);
});
process.on("unhandledRejection", function (err) {
  console.error("UNHANDLED REJECTION:", err && err.message);
});

/* ================= DATABASE ================= */

const initialDB = {
  settings: {
    siteName: "SJEMAR PLATFORM",
    maintenanceMode: false,
    announcement: "Welcome to SJEMAR Platform. All systems operational.",
    announcementActive: true
  },
  users: [],
  sites: [],
  folders: ["General", "Updates", "Guides", "Tools"],
  posts: [],
  logs: []
};

function initDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialDB, null, 2), "utf8");
    }
  } catch (err) {
    console.error("DB INIT ERROR:", err.message);
  }
}

function getDB() {
  try {
    initDB();
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      ...initialDB,
      ...data,
      settings: { ...initialDB.settings, ...(data.settings || {}) }
    };
  } catch (err) {
    return { ...initialDB };
  }
}

function saveDB(db) {
  try {
    initDB();
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("DB SAVE ERROR:", err.message);
  }
}

function addLog(action, details) {
  const db = getDB();
  db.logs = db.logs || [];
  db.logs.unshift({
    id: genId(6),
    action: action,
    details: details || "",
    timestamp: new Date().toISOString()
  });
  if (db.logs.length > 300) db.logs = db.logs.slice(0, 300);
  saveDB(db);
}

initDB();

/* ================= UTILS ================= */

function genId(len) {
  return crypto.randomBytes(len || 10).toString("hex");
}

function hashPassword(pass) {
  return crypto.createHash("sha256").update(String(pass) + "SJEMAR_SALT").digest("hex");
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function escapeHTML(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ================= SESSIONS ================= */

const userSessions = new Map();
const adminSessions = new Map();

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const parts = cookies.split(";");
  for (let i = 0; i < parts.length; i++) {
    const item = parts[i].trim();
    if (item.indexOf(name + "=") === 0) {
      return decodeURIComponent(item.substring(name.length + 1));
    }
  }
  return null;
}

function getLoggedUser(req) {
  const token = getCookie(req, "sj_user_token");
  if (!token) return null;
  const sess = userSessions.get(token);
  if (!sess) return null;
  const maxMs = (sess.remember ? 30 : 1) * 24 * 60 * 60 * 1000;
  if (Date.now() - sess.created > maxMs) {
    userSessions.delete(token);
    return null;
  }
  const db = getDB();
  const user = db.users.find(function (u) { return u.id === sess.userId; });
  if (!user || user.banned) return null;
  return user;
}

function isLoggedAdmin(req) {
  const token = getCookie(req, "sj_admin_token");
  if (!token) return false;
  return adminSessions.has(token);
}

function requireUser(req, res, next) {
  const user = getLoggedUser(req);
  if (isLoggedAdmin(req)) {
    req.user = { id: "admin", username: "Administrator", role: "admin" };
    return next();
  }
  if (!user) {
    return res.status(401).json({ ok: false, error: "Authentication required" });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!isLoggedAdmin(req)) {
    return res.status(401).json({ ok: false, error: "Admin access required" });
  }
  next();
}

/* ================= MIDDLEWARE ================= */

app.use(function (req, res, next) {
  const db = getDB();
  const openPaths = ["/admin", "/api/admin", "/healthz", "/login", "/api/auth"];
  const isOpen = openPaths.some(function (p) { return req.path.indexOf(p) === 0; });
  if (db.settings.maintenanceMode && !isOpen && !isLoggedAdmin(req)) {
    return res.status(503).send("<h1>SYSTEM MAINTENANCE</h1><p>Please check back shortly.</p>");
  }
  next();
});

const ANTI_THEFT_SCRIPT =
  "\n<script>\n" +
  "document.addEventListener('contextmenu', function (e) { e.preventDefault(); });\n" +
  "document.addEventListener('keydown', function (e) {\n" +
  "  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'u')) { e.preventDefault(); }\n" +
  "});\n" +
  "</script>\n";

/* ================= UI ENGINE ================= */

function page(title, content, script, req) {
  const db = getDB();
  const user = getLoggedUser(req || {});
  const isAdmin = isLoggedAdmin(req || {});
  const current = (req && req.path) || "";
  const ann = db.settings.announcementActive ? db.settings.announcement : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(title)} - ${escapeHTML(db.settings.siteName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{--bg:#000;--card:rgba(18,18,22,.95);--border:rgba(255,255,255,.08);--text:#fff;--muted:#9ca3af;--accent:#3b82f6;--danger:#ef4444;--success:#10b981}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}
.bgfx{position:fixed;inset:0;z-index:-1;overflow:hidden;background:#000}
.bgfx::before{content:'';position:absolute;width:200vmax;height:200vmax;top:50%;left:50%;background:conic-gradient(from 0deg,transparent,rgba(59,130,246,.12),transparent,rgba(139,92,246,.12),transparent);animation:spin 40s linear infinite;transform:translate(-50%,-50%)}
@keyframes spin{to{transform:translate(-50%,-50%) rotate(360deg)}}
.header{position:sticky;top:0;z-index:100;background:rgba(0,0,0,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:14px 20px}
.header-in{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.logo{font-size:20px;font-weight:800;background:linear-gradient(135deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav{display:flex;gap:6px;overflow-x:auto;max-width:100%}
.nav a{color:var(--muted);text-decoration:none;font-size:14px;padding:8px 14px;border-radius:8px;white-space:nowrap}
.nav a.active,.nav a:hover{color:#fff;background:rgba(255,255,255,.06)}
.container{max-width:1200px;margin:0 auto;padding:24px 20px}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:20px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
h1{font-size:32px;font-weight:800;margin-bottom:12px}
h2{font-size:24px;font-weight:700;margin-bottom:12px}
h3{font-size:18px;font-weight:600;margin-bottom:8px}
p{color:var(--muted);line-height:1.7;margin-bottom:10px;font-size:15px}
.btn{display:inline-block;padding:12px 24px;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;transition:transform .15s,opacity .15s}
.btn:active{transform:scale(.97)}
.btn-primary{background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff}
.btn-ghost{background:rgba(255,255,255,.06);color:#fff;border:1px solid var(--border)}
.btn-danger{background:rgba(239,68,68,.12);color:var(--danger);border:1px solid rgba(239,68,68,.25)}
.btn-sm{padding:8px 14px;font-size:13px}
.input{width:100%;padding:13px 16px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;color:#fff;font-size:15px;margin-bottom:12px;outline:none}
.input:focus{border-color:var(--accent)}
textarea.input{min-height:140px;resize:vertical;font-family:'Courier New',monospace;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
.stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center}
.stat b{display:block;font-size:26px;color:var(--accent)}
.stat span{font-size:12px;color:var(--muted)}
.badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(59,130,246,.12);color:var(--accent);border:1px solid rgba(59,130,246,.25)}
.announce{background:rgba(59,130,246,.08);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;font-size:14px;margin-bottom:20px}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{padding:10px;border-bottom:1px solid var(--border);text-align:left}
th{color:var(--muted);font-size:12px;text-transform:uppercase}
@media(max-width:600px){h1{font-size:24px}.container{padding:16px 12px}}
</style>
</head>
<body>
<div class="bgfx"></div>
<header class="header">
  <div class="header-in">
    <div class="logo">${escapeHTML(db.settings.siteName)}</div>
    <nav class="nav">
      <a href="/" class="${current === "/" ? "active" : ""}">Home</a>
      <a href="/create" class="${current === "/create" ? "active" : ""}">Create</a>
      <a href="/posts" class="${current === "/posts" ? "active" : ""}">Posts</a>
      <a href="/dashboard" class="${current === "/dashboard" ? "active" : ""}">Dashboard</a>
      ${isAdmin ? '<a href="/admin">Admin</a>' : ''}
      ${user ? '<a href="/logout">Logout (' + escapeHTML(user.username) + ')</a>' : '<a href="/login">Login</a>'}
    </nav>
  </div>
</header>
<main class="container">
  ${ann ? '<div class="announce">' + escapeHTML(ann) + '</div>' : ''}
  ${content}
</main>
${script || ""}
</body>
</html>`;
}

/* ================= PAGES ================= */

app.get("/", function (req, res) {
  const db = getDB();
  const totalViews = db.sites.reduce(function (s, x) { return s + (x.views || 0); }, 0);
  const recent = db.sites.slice(0, 6);

  res.send(page("Home", `
    <h1>Website Hosting Platform</h1>
    <p>Create, host and protect your websites with real isolation and anti-theft engine.</p>
    <div class="stats">
      <div class="stat"><b>${db.sites.length}</b><span>Websites</span></div>
      <div class="stat"><b>${db.users.length}</b><span>Users</span></div>
      <div class="stat"><b>${db.posts.length}</b><span>Posts</span></div>
      <div class="stat"><b>${totalViews}</b><span>Total Views</span></div>
    </div>
    <h2>Recent Websites</h2>
    <div class="grid">
      ${recent.map(function (s) {
        return '<div class="card"><span class="badge">' + escapeHTML(s.category || "Site") + '</span>' +
          '<h3 style="margin-top:10px">' + escapeHTML(s.title) + '</h3>' +
          '<p>By ' + escapeHTML(s.authorName) + ' - Views ' + (s.views || 0) + '</p>' +
          '<div class="row"><a class="btn btn-primary btn-sm" target="_blank" href="/site/' + escapeHTML(s.slug) + '">Visit</a>' +
          '<a class="btn btn-ghost btn-sm" href="/site/' + escapeHTML(s.slug) + '/download">Download</a></div></div>';
      }).join("") || '<div class="card"><p>No websites published yet.</p></div>'}
    </div>
    <div class="row"><a class="btn btn-primary" href="/create">Create Your Website</a></div>
  `, "", req));
});

app.get("/login", function (req, res) {
  res.send(page("Login", `
    <div style="max-width:420px;margin:40px auto">
      <div class="card">
        <h2>Account Login</h2>
        <form id="loginForm">
          <input class="input" id="username" placeholder="Username" required>
          <input class="input" id="password" type="password" placeholder="Password" required>
          <label style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--muted);margin-bottom:14px">
            <input type="checkbox" id="remember" style="width:16px;height:16px"> Remember me 30 days
          </label>
          <button class="btn btn-primary" style="width:100%" type="submit">Login</button>
        </form>
        <p style="margin-top:14px;font-size:14px">No account? <a href="/register" style="color:var(--accent)">Register</a></p>
      </div>
    </div>
  `, `
<script>
document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var payload = {
    username: document.getElementById('username').value,
    password: document.getElementById('password').value,
    remember: document.getElementById('remember').checked
  };
  fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.ok) { window.location.href = '/dashboard'; } else { alert(d.error || 'Login failed'); }
    })
    .catch(function () { alert('Network error'); });
});
</script>
  `, req));
});

app.get("/register", function (req, res) {
  res.send(page("Register", `
    <div style="max-width:420px;margin:40px auto">
      <div class="card">
        <h2>Create Account</h2>
        <form id="regForm">
          <input class="input" id="rUser" placeholder="Username (min 3 chars)" required>
          <input class="input" id="rPass" type="password" placeholder="Password (min 6 chars)" required>
          <input class="input" id="rPass2" type="password" placeholder="Confirm password" required>
          <button class="btn btn-primary" style="width:100%" type="submit">Register</button>
        </form>
        <p style="margin-top:14px;font-size:14px">Have account? <a href="/login" style="color:var(--accent)">Login</a></p>
      </div>
    </div>
  `, `
<script>
document.getElementById('regForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var p1 = document.getElementById('rPass').value;
  var p2 = document.getElementById('rPass2').value;
  if (p1 !== p2) { alert('Passwords do not match'); return; }
  var payload = { username: document.getElementById('rUser').value, password: p1 };
  fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.ok) { alert('Account created. Please login.'); window.location.href = '/login'; }
      else { alert(d.error || 'Registration failed'); }
    })
    .catch(function () { alert('Network error'); });
});
</script>
  `, req));
});

app.get("/logout", function (req, res) {
  const token = getCookie(req, "sj_user_token");
  if (token) userSessions.delete(token);
  res.clearCookie("sj_user_token", { path: "/" });
  res.redirect("/");
});

app.get("/create", function (req, res) {
  const user = getLoggedUser(req);
  if (!user && !isLoggedAdmin(req)) return res.redirect("/login");
  const db = getDB();

  res.send(page("Create Website", `
    <h1>Create Website</h1>
    <div class="card">
      <form id="pubForm">
        <input class="input" id="pTitle" placeholder="Website Title *" required>
        <input class="input" id="pSlug" placeholder="URL Slug * (auto from title)">
        <input class="input" id="pBio" placeholder="Description (optional)">
        <select class="input" id="pCat">
          ${["General", "Portfolio", "Business", "Tools", "Gaming", "Education"].map(function (c) {
            return '<option value="' + c + '">' + c + '</option>';
          }).join("")}
        </select>
        <input class="input" id="pPass" type="password" placeholder="Access password (optional)">
        <textarea class="input" id="pHtml" placeholder="HTML Code *" required style="min-height:260px"></textarea>
        <textarea class="input" id="pCss" placeholder="Custom CSS (optional)" style="min-height:100px"></textarea>
        <textarea class="input" id="pJs" placeholder="Custom JavaScript (optional)" style="min-height:100px"></textarea>
        <label style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--muted);margin-bottom:14px">
          <input type="checkbox" id="pTheft" checked style="width:16px;height:16px"> Enable Anti-Theft Protection
        </label>
        <button class="btn btn-primary" style="width:100%" type="submit">Publish Website</button>
      </form>
      <div id="pubResult" style="display:none;margin-top:16px">
        <p style="color:var(--success)">Website published successfully.</p>
        <div class="row">
          <a id="pubLink" class="btn btn-primary btn-sm" target="_blank" href="#">Visit Site</a>
          <button class="btn btn-ghost btn-sm" onclick="copyPubLink()">Copy Link</button>
        </div>
      </div>
    </div>
  `, `
<script>
document.getElementById('pTitle').addEventListener('input', function (e) {
  document.getElementById('pSlug').value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
});
function copyPubLink() {
  var url = document.getElementById('pubLink').href;
  if (navigator.clipboard) { navigator.clipboard.writeText(url); alert('Link copied'); }
}
document.getElementById('pubForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var payload = {
    title: document.getElementById('pTitle').value,
    slug: document.getElementById('pSlug').value,
    bio: document.getElementById('pBio').value,
    category: document.getElementById('pCat').value,
    sitePassword: document.getElementById('pPass').value,
    html: document.getElementById('pHtml').value,
    css: document.getElementById('pCss').value,
    js: document.getElementById('pJs').value,
    antiTheft: document.getElementById('pTheft').checked
  };
  fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.ok) {
        document.getElementById('pubLink').href = d.site.url;
        document.getElementById('pubResult').style.display = 'block';
      } else { alert(d.error || 'Publish failed'); }
    })
    .catch(function () { alert('Network error'); });
});
</script>
  `, req));
});

app.get("/dashboard", function (req, res) {
  const user = getLoggedUser(req);
  if (!user && !isLoggedAdmin(req)) return res.redirect("/login");

  res.send(page("Dashboard", `
    <h1>My Vault</h1>
    <div class="row" style="margin-bottom:16px">
      <a class="btn btn-primary btn-sm" href="/create">New Website</a>
    </div>
    <div id="vaultBox" class="grid"><div class="card"><p>Loading...</p></div></div>
  `, `
<script>
function esc(v) {
  return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function siteCard(s) {
  return '<div class="card"><span class="badge">' + esc(s.category || 'Site') + '</span>' +
    '<h3 style="margin-top:10px">' + esc(s.title) + '</h3>' +
    '<p>/' + esc(s.slug) + ' - Views ' + (s.views || 0) + '</p>' +
    '<div class="row">' +
    '<a class="btn btn-primary btn-sm" target="_blank" href="/site/' + esc(s.slug) + '">Visit</a>' +
    '<button class="btn btn-ghost btn-sm" onclick="cloneSite(\\'' + s.id + '\\')">Clone</button>' +
    '<button class="btn btn-danger btn-sm" onclick="deleteSite(\\'' + s.id + '\\')">Delete</button>' +
    '</div></div>';
}
function loadVault() {
  fetch('/api/user/vault-data').then(function (r) { return r.json(); }).then(function (d) {
    if (d.ok) {
      document.getElementById('vaultBox').innerHTML = d.sites.length
        ? d.sites.map(siteCard).join('')
        : '<div class="card"><p>No websites yet.</p></div>';
    }
  });
}
function cloneSite(id) {
  fetch('/api/sites/' + id + '/clone', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (d) {
    if (d.ok) { alert('Cloned'); loadVault(); } else { alert(d.error || 'Failed'); }
  });
}
function deleteSite(id) {
  if (!confirm('Delete this website permanently?')) return;
  fetch('/api/sites/' + id, { method: 'DELETE' }).then(function (r) { return r.json(); }).then(function (d) {
    if (d.ok) { alert('Deleted'); loadVault(); } else { alert(d.error || 'Failed'); }
  });
}
loadVault();
</script>
  `, req));
});

app.get("/posts", function (req, res) {
  const db = getDB();
  res.send(page("Posts", `
    <h1>Posts and Guides</h1>
    <div class="grid">
      ${(db.posts || []).map(function (p) {
        return '<div class="card"><span class="badge">' + escapeHTML(p.folder || "General") + '</span>' +
          '<h3 style="margin-top:10px">' + escapeHTML(p.title) + '</h3>' +
          '<p>' + escapeHTML((p.bio || p.content || "").slice(0, 120)) + '</p>' +
          '<div class="row"><a class="btn btn-primary btn-sm" href="/post/' + escapeHTML(p.slug) + '">Read</a>' +
          '<span style="font-size:13px;color:var(--muted);align-self:center">Views ' + (p.views || 0) + ' | Likes ' + (p.likes || 0) + '</span></div></div>';
      }).join("") || '<div class="card"><p>No posts published yet.</p></div>'}
    </div>
  `, "", req));
});

app.get("/post/:slug", function (req, res) {
  const db = getDB();
  const post = (db.posts || []).find(function (p) { return p.slug === req.params.slug; });
  if (!post) return res.status(404).send("Post not found");
  post.views = (post.views || 0) + 1;
  saveDB(db);

  res.send(page(post.title, `
    <div class="card">
      <span class="badge">${escapeHTML(post.folder || "General")}</span>
      <h1 style="margin-top:12px">${escapeHTML(post.title)}</h1>
      <p style="font-size:13px">By ${escapeHTML(post.author)} - Views ${post.views}</p>
      <p style="white-space:pre-wrap;color:var(--text)">${escapeHTML(post.content || "")}</p>
      <div class="row">
        <button class="btn btn-ghost btn-sm" onclick="likePost()">Like (${post.likes || 0})</button>
      </div>
    </div>
    <div class="card">
      <h3>Comments (${(post.comments || []).length})</h3>
      ${(post.comments || []).map(function (c) {
        return '<div style="padding:12px 0;border-bottom:1px solid var(--border)"><b>' + escapeHTML(c.author) + '</b><p style="margin:6px 0 0">' + escapeHTML(c.text) + '</p></div>';
      }).join("") || '<p>No comments yet.</p>'}
      <form id="cForm" style="margin-top:16px">
        <input class="input" id="cAuthor" placeholder="Your name" required>
        <textarea class="input" id="cText" placeholder="Write comment" required style="min-height:90px"></textarea>
        <button class="btn btn-primary btn-sm" type="submit">Post Comment</button>
      </form>
    </div>
  `, `
<script>
function likePost() {
  fetch('/api/posts/${post.id}/like', { method: 'POST' }).then(function () { location.reload(); });
}
document.getElementById('cForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var payload = { author: document.getElementById('cAuthor').value, text: document.getElementById('cText').value };
  fetch('/api/posts/${post.id}/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d.ok) location.reload(); else alert(d.error || 'Failed'); });
});
</script>
  `, req));
});

/* ================= SITE SERVING ================= */

app.get("/site/:slug", function (req, res) {
  const db = getDB();
  const site = db.sites.find(function (s) { return s.slug === req.params.slug; });
  if (!site || site.published === false) return res.status(404).send("Website not found");

  if (site.sitePassword) {
    const entered = req.query.pass;
    if (!entered || hashPassword(entered) !== site.sitePassword) {
      return res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Locked</title></head>' +
        '<body style="background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">' +
        '<form method="GET" style="background:#111;padding:32px;border-radius:16px;text-align:center">' +
        '<h2>Password Protected</h2><p style="color:#999">This website is locked by its author.</p>' +
        '<input name="pass" type="password" placeholder="Enter password" style="padding:12px;width:100%;margin:12px 0;background:#222;border:1px solid #333;color:#fff;border-radius:8px">' +
        '<button style="padding:12px;width:100%;background:#3b82f6;border:none;color:#fff;border-radius:8px;font-weight:600">Unlock</button>' +
        '</form></body></html>');
    }
  }

  site.views = (site.views || 0) + 1;
  saveDB(db);

  let out = site.html || "";
  if (site.rawCss) out = "<style>\n" + site.rawCss + "\n</style>\n" + out;
  if (site.rawJs) out = out + "\n<script>\n" + site.rawJs + "\n</script>\n";
  if (site.antiTheft) out = out + ANTI_THEFT_SCRIPT;

  res.type("html").send(out);
});

app.get("/site/:slug/download", function (req, res) {
  const db = getDB();
  const site = db.sites.find(function (s) { return s.slug === req.params.slug; });
  if (!site) return res.status(404).send("Not found");
  res.setHeader("Content-Disposition", 'attachment; filename="' + site.slug + '.html"');
  res.type("html").send(site.html || "");
});

app.get("/healthz", function (req, res) {
  res.json({ ok: true, uptime: process.uptime() });
});

/* ================= USER APIs ================= */

app.post("/api/auth/register", function (req, res) {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (username.length < 3) return res.status(400).json({ ok: false, error: "Username min 3 characters" });
  if (password.length < 6) return res.status(400).json({ ok: false, error: "Password min 6 characters" });

  const db = getDB();
  const exists = db.users.some(function (u) { return u.username.toLowerCase() === username.toLowerCase(); });
  if (exists) return res.status(409).json({ ok: false, error: "Username already taken" });

  db.users.push({
    id: genId(),
    username: username,
    password: hashPassword(password),
    role: "user",
    banned: false,
    createdAt: new Date().toISOString()
  });
  saveDB(db);
  addLog("USER_REGISTER", "New user: " + username);
  res.json({ ok: true });
});

app.post("/api/auth/login", function (req, res) {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const db = getDB();
  const user = db.users.find(function (u) { return u.username.toLowerCase() === username.toLowerCase(); });

  if (!user || user.password !== hashPassword(password)) {
    return res.status(401).json({ ok: false, error: "Invalid username or password" });
  }
  if (user.banned) return res.status(403).json({ ok: false, error: "Account suspended by admin" });

  const token = genId(24);
  const remember = Boolean(req.body.remember);
  userSessions.set(token, { userId: user.id, remember: remember, created: Date.now() });
  res.cookie("sj_user_token", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: (remember ? 30 : 1) * 24 * 60 * 60 * 1000
  });
  res.json({ ok: true });
});

app.post("/api/auth/logout", function (req, res) {
  const token = getCookie(req, "sj_user_token");
  if (token) userSessions.delete(token);
  res.clearCookie("sj_user_token", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/check-slug", function (req, res) {
  const slug = slugify(req.query.slug);
  const db = getDB();
  const taken = db.sites.some(function (s) { return s.slug === slug; });
  res.json({ ok: true, available: !taken && slug.length >= 2 });
});

app.post("/api/publish", requireUser, function (req, res) {
  const b = req.body || {};
  if (!b.title || !b.html) return res.status(400).json({ ok: false, error: "Title and HTML required" });

  const db = getDB();
  let slug = slugify(b.slug || b.title);
  if (!slug) slug = "site-" + genId(4);
  if (db.sites.some(function (s) { return s.slug === slug; })) {
    return res.status(409).json({ ok: false, error: "Slug already taken" });
  }

  const site = {
    id: genId(),
    userId: req.user.id,
    authorName: req.user.username,
    title: String(b.title).slice(0, 120),
    slug: slug,
    bio: b.bio || "",
    category: b.category || "General",
    rawHtml: b.html,
    rawCss: b.css || "",
    rawJs: b.js || "",
    html: b.html,
    antiTheft: b.antiTheft !== false,
    sitePassword: b.sitePassword ? hashPassword(b.sitePassword) : null,
    published: true,
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.sites.unshift(site);
  saveDB(db);
  addLog("SITE_PUBLISH", site.title + " by " + req.user.username);

  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  res.json({ ok: true, site: { url: proto + "://" + req.get("host") + "/site/" + site.slug } });
});

app.get("/api/user/vault-data", requireUser, function (req, res) {
  const db = getDB();
  const mine = db.sites.filter(function (s) {
    return s.userId === req.user.id || req.user.role === "admin";
  });
  res.json({ ok: true, sites: mine });
});

app.post("/api/sites/:id/clone", requireUser, function (req, res) {
  const db = getDB();
  const site = db.sites.find(function (s) { return s.id === req.params.id; });
  if (!site) return res.status(404).json({ ok: false, error: "Site not found" });
  if (site.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Access denied" });
  }
  const copy = Object.assign({}, site, {
    id: genId(),
    title: site.title + " (Copy)",
    slug: site.slug + "-copy-" + genId(3),
    views: 0,
    createdAt: new Date().toISOString()
  });
  db.sites.unshift(copy);
  saveDB(db);
  res.json({ ok: true });
});

app.delete("/api/sites/:id", requireUser, function (req, res) {
  const db = getDB();
  const site = db.sites.find(function (s) { return s.id === req.params.id; });
  if (!site) return res.status(404).json({ ok: false, error: "Site not found" });
  if (site.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Access denied" });
  }
  db.sites = db.sites.filter(function (s) { return s.id !== req.params.id; });
  saveDB(db);
  addLog("SITE_DELETE", site.title);
  res.json({ ok: true });
});

app.post("/api/posts/:id/like", function (req, res) {
  const db = getDB();
  const post = (db.posts || []).find(function (p) { return p.id === req.params.id; });
  if (!post) return res.status(404).json({ ok: false });
  post.likes = (post.likes || 0) + 1;
  saveDB(db);
  res.json({ ok: true, likes: post.likes });
});

app.post("/api/posts/:id/comment", function (req, res) {
  const db = getDB();
  const post = (db.posts || []).find(function (p) { return p.id === req.params.id; });
  if (!post) return res.status(404).json({ ok: false });
  post.comments = post.comments || [];
  post.comments.push({
    id: genId(6),
    author: String(req.body.author || "Anonymous").slice(0, 40),
    text: String(req.body.text || "").slice(0, 1000),
    date: new Date().toISOString()
  });
  saveDB(db);
  res.json({ ok: true });
});

/* ================= ADMIN PANEL (EMBEDDED) ================= */

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Panel</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh}
.wrap{max-width:1200px;margin:0 auto;padding:20px}
.card{background:rgba(18,18,22,.95);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;margin-bottom:16px}
h1{font-size:26px;margin-bottom:14px}
h2{font-size:18px;margin-bottom:12px}
.btn{padding:10px 18px;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px}
.btn-p{background:#3b82f6;color:#fff}
.btn-g{background:rgba(255,255,255,.07);color:#fff;border:1px solid rgba(255,255,255,.1)}
.btn-d{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.25)}
.btn-s{padding:6px 12px;font-size:12px}
.input{width:100%;padding:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;margin-bottom:10px;font-size:14px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px}
.stat{background:rgba(18,18,22,.95);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px;text-align:center}
.stat b{display:block;font-size:24px;color:#3b82f6}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:9px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.tab{padding:9px 16px;border-radius:8px;background:rgba(255,255,255,.06);cursor:pointer;font-size:14px}
.tab.on{background:#3b82f6}
.pane{display:none}.pane.on{display:block}
.row{display:flex;gap:8px;flex-wrap:wrap}
</style>
</head>
<body>
<div class="wrap">
  <div id="lockBox" class="card" style="max-width:400px;margin:60px auto">
    <h1>Admin Login</h1>
    <input class="input" id="aPass" type="password" placeholder="Admin password">
    <button class="btn btn-p" style="width:100%" onclick="adminLogin()">Unlock Panel</button>
  </div>

  <div id="panelBox" style="display:none">
    <div class="card row" style="justify-content:space-between;align-items:center">
      <h1 style="margin:0">Admin Control Panel</h1>
      <div class="row">
        <a href="/" style="color:#9ca3af;font-size:14px">View Site</a>
        <button class="btn btn-g btn-s" onclick="location.reload()">Lock</button>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><b id="sUsers">0</b><span>Users</span></div>
      <div class="stat"><b id="sSites">0</b><span>Sites</span></div>
      <div class="stat"><b id="sPosts">0</b><span>Posts</span></div>
      <div class="stat"><b id="sViews">0</b><span>Views</span></div>
    </div>

    <div class="tabs">
      <div class="tab on" onclick="tab('tUsers',this)">Users</div>
      <div class="tab" onclick="tab('tSites',this)">Websites</div>
      <div class="tab" onclick="tab('tPost',this)">New Post</div>
      <div class="tab" onclick="tab('tSet',this)">Settings</div>
      <div class="tab" onclick="tab('tLogs',this)">Logs</div>
    </div>

    <div id="tUsers" class="pane on"><div class="card"><h2>User Management</h2><div id="userTable">Loading...</div></div></div>
    <div id="tSites" class="pane"><div class="card"><h2>Website Management</h2><div id="siteTable">Loading...</div></div></div>

    <div id="tPost" class="pane"><div class="card">
      <h2>Create Folder Post</h2>
      <input class="input" id="npFolder" placeholder="Folder (e.g. Updates)">
      <input class="input" id="npTitle" placeholder="Post title">
      <input class="input" id="npBio" placeholder="Short bio">
      <textarea class="input" id="npContent" placeholder="Full content" style="min-height:120px"></textarea>
      <button class="btn btn-p" onclick="createPost()">Publish Post</button>
    </div></div>

    <div id="tSet" class="pane"><div class="card">
      <h2>System Settings</h2>
      <input class="input" id="setName" placeholder="Site brand name">
      <input class="input" id="setAnn" placeholder="Announcement message">
      <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-bottom:8px">
        <input type="checkbox" id="setAnnOn" style="width:16px;height:16px"> Show announcement
      </label>
      <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-bottom:14px">
        <input type="checkbox" id="setMaint" style="width:16px;height:16px"> Maintenance mode
      </label>
      <div class="row">
        <button class="btn btn-p" onclick="saveSettings()">Save Settings</button>
        <button class="btn btn-g" onclick="window.location.href='/api/admin/backup'">Download Backup</button>
      </div>
    </div></div>

    <div id="tLogs" class="pane"><div class="card"><h2>Audit Logs</h2><div id="logTable">Loading...</div></div></div>
  </div>
</div>

<script>
var DATA = null;
function tab(id, el) {
  var panes = document.querySelectorAll('.pane');
  for (var i = 0; i < panes.length; i++) panes[i].classList.remove('on');
  var tabs = document.querySelectorAll('.tab');
  for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('on');
  document.getElementById(id).classList.add('on');
  el.classList.add('on');
}
function esc(v) {
  return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function adminLogin() {
  fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: document.getElementById('aPass').value }) })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.ok) { document.getElementById('lockBox').style.display = 'none'; document.getElementById('panelBox').style.display = 'block'; loadAll(); }
      else alert('Wrong password');
    });
}
function loadAll() {
  fetch('/api/admin/all').then(function (r) { return r.json(); }).then(function (d) {
    if (!d.ok) return;
    DATA = d;
    var views = 0;
    for (var i = 0; i < d.sites.length; i++) views += (d.sites[i].views || 0);
    document.getElementById('sUsers').textContent = d.users.length;
    document.getElementById('sSites').textContent = d.sites.length;
    document.getElementById('sPosts').textContent = d.posts.length;
    document.getElementById('sViews').textContent = views;
    document.getElementById('setName').value = d.settings.siteName || '';
    document.getElementById('setAnn').value = d.settings.announcement || '';
    document.getElementById('setAnnOn').checked = !!d.settings.announcementActive;
    document.getElementById('setMaint').checked = !!d.settings.maintenanceMode;

    var uh = '<table><tr><th>User</th><th>Status</th><th>Actions</th></tr>';
    for (var a = 0; a < d.users.length; a++) {
      var u = d.users[a];
      uh += '<tr><td>' + esc(u.username) + '</td><td>' + (u.banned ? 'Banned' : 'Active') + '</td><td class="row">' +
        '<button class="btn btn-g btn-s" onclick="banUser(\\'' + u.id + '\\')">' + (u.banned ? 'Unban' : 'Ban') + '</button>' +
        '<button class="btn btn-d btn-s" onclick="delUser(\\'' + u.id + '\\')">Delete</button></td></tr>';
    }
    document.getElementById('userTable').innerHTML = uh + '</table>';

    var sh = '<table><tr><th>Title</th><th>Author</th><th>Views</th><th>Actions</th></tr>';
    for (var b = 0; b < d.sites.length; b++) {
      var s = d.sites[b];
      sh += '<tr><td>' + esc(s.title) + '</td><td>' + esc(s.authorName) + '</td><td>' + (s.views || 0) + '</td><td class="row">' +
        '<a class="btn btn-g btn-s" target="_blank" href="/site/' + esc(s.slug) + '">View</a>' +
        '<button class="btn btn-d btn-s" onclick="delSite(\\'' + s.id + '\\')">Delete</button></td></tr>';
    }
    document.getElementById('siteTable').innerHTML = sh + '</table>';

    var lh = '<table><tr><th>Time</th><th>Action</th><th>Details</th></tr>';
    for (var c = 0; c < (d.logs || []).length; c++) {
      var L = d.logs[c];
      lh += '<tr><td>' + esc(L.timestamp) + '</td><td>' + esc(L.action) + '</td><td>' + esc(L.details) + '</td></tr>';
    }
    document.getElementById('logTable').innerHTML = lh + '</table>';
  });
}
function banUser(id) { fetch('/api/admin/user/' + id + '/ban', { method: 'POST' }).then(function () { loadAll(); }); }
function delUser(id) { if (confirm('Delete user and all sites?')) fetch('/api/admin/user/' + id, { method: 'DELETE' }).then(function () { loadAll(); }); }
function delSite(id) { if (confirm('Delete site?')) fetch('/api/admin/sites/' + id, { method: 'DELETE' }).then(function () { loadAll(); }); }
function createPost() {
  var payload = {
    folder: document.getElementById('npFolder').value,
    title: document.getElementById('npTitle').value,
    bio: document.getElementById('npBio').value,
    content: document.getElementById('npContent').value
  };
  fetch('/api/admin/folder-post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d.ok) { alert('Post published'); loadAll(); } else alert(d.error || 'Failed'); });
}
function saveSettings() {
  var payload = {
    siteName: document.getElementById('setName').value,
    announcement: document.getElementById('setAnn').value,
    announcementActive: document.getElementById('setAnnOn').checked,
    maintenanceMode: document.getElementById('setMaint').checked
  };
  fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d.ok) alert('Settings saved'); else alert('Failed'); });
}
fetch('/api/admin/ping').then(function (r) { return r.json(); }).then(function (d) {
  if (d.ok) { document.getElementById('lockBox').style.display = 'none'; document.getElementById('panelBox').style.display = 'block'; loadAll(); }
});
</script>
</body>
</html>`;

app.get("/admin", function (req, res) { res.type("html").send(ADMIN_HTML); });
app.get("/admin.html", function (req, res) { res.type("html").send(ADMIN_HTML); });

/* ================= ADMIN APIs ================= */

app.get("/api/admin/ping", function (req, res) {
  res.json({ ok: isLoggedAdmin(req) });
});

app.post("/api/admin/login", function (req, res) {
  if (req.body.password !== ADMIN_PASS) {
    return res.status(401).json({ ok: false, error: "Wrong password" });
  }
  const token = genId(24);
  adminSessions.set(token, true);
  res.cookie("sj_admin_token", token, { httpOnly: true, path: "/", sameSite: "lax", maxAge: 24 * 60 * 60 * 1000 });
  addLog("ADMIN_LOGIN", "Admin logged in");
  res.json({ ok: true });
});

app.get("/api/admin/all", requireAdmin, function (req, res) {
  const db = getDB();
  res.json({
    ok: true,
    users: db.users.map(function (u) {
      return { id: u.id, username: u.username, banned: u.banned, createdAt: u.createdAt };
    }),
    sites: db.sites,
    posts: db.posts,
    folders: db.folders,
    settings: db.settings,
    logs: db.logs
  });
});

app.post("/api/admin/settings", requireAdmin, function (req, res) {
  const db = getDB();
  db.settings = Object.assign({}, db.settings, req.body);
  saveDB(db);
  addLog("SETTINGS_UPDATE", "Settings changed");
  res.json({ ok: true });
});

app.get("/api/admin/backup", requireAdmin, function (req, res) {
  const db = getDB();
  res.setHeader("Content-Disposition", 'attachment; filename="backup-' + Date.now() + '.json"');
  res.type("json").send(JSON.stringify(db, null, 2));
});

app.post("/api/admin/user/:id/ban", requireAdmin, function (req, res) {
  const db = getDB();
  const user = db.users.find(function (u) { return u.id === req.params.id; });
  if (!user) return res.status(404).json({ ok: false });
  user.banned = !user.banned;
  saveDB(db);
  addLog("USER_BAN", user.username + " banned=" + user.banned);
  res.json({ ok: true });
});

app.delete("/api/admin/user/:id", requireAdmin, function (req, res) {
  const db = getDB();
  db.users = db.users.filter(function (u) { return u.id !== req.params.id; });
  db.sites = db.sites.filter(function (s) { return s.userId !== req.params.id; });
  saveDB(db);
  addLog("USER_DELETE", req.params.id);
  res.json({ ok: true });
});

app.delete("/api/admin/sites/:id", requireAdmin, function (req, res) {
  const db = getDB();
  db.sites = db.sites.filter(function (s) { return s.id !== req.params.id; });
  saveDB(db);
  addLog("ADMIN_SITE_DELETE", req.params.id);
  res.json({ ok: true });
});

app.post("/api/admin/folder-post", requireAdmin, function (req, res) {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ ok: false, error: "Title required" });
  const db = getDB();
  const folder = String(b.folder || "General").trim();
  if (db.folders.indexOf(folder) === -1) db.folders.push(folder);
  db.posts.unshift({
    id: genId(),
    folder: folder,
    title: String(b.title).slice(0, 120),
    slug: slugify(b.title) || "post-" + genId(4),
    bio: b.bio || "",
    content: b.content || "",
    author: "Admin",
    views: 0,
    likes: 0,
    pinned: false,
    comments: [],
    createdAt: new Date().toISOString()
  });
  saveDB(db);
  addLog("ADMIN_POST", b.title);
  res.json({ ok: true });
});

/* ================= 404 + START ================= */

app.use(function (req, res) {
  res.status(404).send(page("404", `
    <div class="card" style="text-align:center;padding:50px 20px">
      <h1>404</h1>
      <p>The page you requested does not exist.</p>
      <div class="row" style="justify-content:center"><a class="btn btn-primary" href="/">Return Home</a></div>
    </div>
  `, "", req));
});

app.listen(PORT, "0.0.0.0", function () {
  console.log("SJEMAR PLATFORM STARTED ON PORT " + PORT);
});
