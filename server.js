/**
 * SJEMAR OLED ULTIMATE - VERSION 8.0
 * Fully syntax-verified, Render-safe build
 * All previous syntax errors fixed
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || "py.py.php";
const ADMIN_PIN = "5768";
const SPECIAL_VIP_ID = "899987";

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "database.json");

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

process.on("uncaughtException", function (e) {
  console.error("UNCAUGHT:", e && e.message);
});

/* ============ DATABASE ============ */
const initialDB = {
  settings: {
    siteName: "SJEMAR OLED",
    maintenanceMode: false,
    announcement: "Welcome to SJEMAR OLED Ultimate Engine.",
    announcementActive: true,
    globalHeaderCode: "",
    globalFooterCode: "",
    defaultAntiTheft: true
  },
  users: [],
  sites: [],
  folders: ["General", "Updates", "Guides", "VIP Codes", "Tools", "APKs"],
  posts: [],
  versions: [
    { id: "v1", title: "Version 1.0", subtitle: "HTML Hosting Engine", link: "#" },
    { id: "v9", title: "Version 8.0", subtitle: "OLED Anti-Theft Protection", link: "#" }
  ],
  resources: [
    { id: "r1", section: "RESOURCE", ribbon: "FREE", badge: "100% Free", title: "Free Website", icon: "triangle", slug: "create" },
    { id: "r2", section: "APK", ribbon: "APK", badge: "Android Build", title: "APK Builder", icon: "valorant", slug: "create" }
  ],
  logs: []
};

function initDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialDB, null, 2), "utf8");
    }
  } catch (err) {
    console.error("DB INIT:", err.message);
  }
}

function getDB() {
  try {
    initDB();
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      return Object.assign({}, initialDB, data, {
        settings: Object.assign({}, initialDB.settings, data.settings || {})
      });
    }
  } catch (err) {
    console.error("DB READ:", err.message);
  }
  return Object.assign({}, initialDB);
}

function saveDB(db) {
  try {
    initDB();
    fs.writeFileSync(DATA_FILE, JSON.stringify(db || initialDB, null, 2), "utf8");
  } catch (err) {
    console.error("DB SAVE:", err.message);
  }
}

function addLog(action, details) {
  try {
    const db = getDB();
    db.logs = db.logs || [];
    db.logs.unshift({
      id: genId(6),
      action: action,
      details: details || "",
      timestamp: new Date().toISOString()
    });
    if (db.logs.length > 300) {
      db.logs = db.logs.slice(0, 300);
    }
    saveDB(db);
  } catch (err) {}
}

initDB();

/* ============ UTILS ============ */
function genId(len) {
  return crypto.randomBytes(len || 10).toString("hex");
}

function hashPassword(pass) {
  return crypto
    .createHash("sha256")
    .update(String(pass) + "SJEMAR_ULTIMATE_2026")
    .digest("hex");
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

/* ============ SESSIONS ============ */
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
  const maxMs = (sess.saveMe ? 60 : 2) * 24 * 60 * 60 * 1000;
  if (Date.now() - sess.created > maxMs) {
    userSessions.delete(token);
    return null;
  }
  const db = getDB();
  const user = db.users.find(function (u) {
    return u.id === sess.userId;
  });
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
    req.user = { id: "admin", username: "Super Admin", role: "admin" };
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

/* ============ MAINTENANCE ============ */
app.use(function (req, res, next) {
  const db = getDB();
  if (db.settings && db.settings.maintenanceMode) {
    if (isLoggedAdmin(req) || req.path.indexOf("/admin") === 0 || req.path.indexOf("/api/admin") === 0) {
      return next();
    }
    return res.status(503).send("<h1>SYSTEM MAINTENANCE</h1><p>Upgrading servers. Check back shortly.</p>");
  }
  next();
});

/* ============ ANTI-THEFT SCRIPT (FIXED!) ============ */
const ANTI_THEFT_SCRIPT =
  "\n<script>\n" +
  "document.addEventListener('contextmenu', function(e){e.preventDefault();});" +
  "document.addEventListener('keydown', function(e){" +
  "if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&(e.key==='I'||e.key==='J'||e.key==='C'))||(e.ctrlKey&&e.key==='u')){e.preventDefault();}" +
  "});" +
  "\n</script>\n";

/* ============ UI ENGINE ============ */
function page(title, content, script, req) {
  const db = getDB();
  const user = getLoggedUser(req || {});
  const isAdmin = isLoggedAdmin(req || {});
  const cur = (req && req.path) || "";
  const ann = db.settings.announcementActive ? db.settings.announcement : "";

  return [
    "<!DOCTYPE html>",
    "<html lang='en'><head><meta charset='UTF-8'>",
    "<meta name='viewport' content='width=device-width, initial-scale=1.0'>",
    "<title>" + escapeHTML(title) + " - " + escapeHTML(db.settings.siteName) + "</title>",
    "<style>",
    "*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}",
    ":root{--bg:#000;--card:rgba(22,22,26,.7);--bd:rgba(255,255,255,.09);--tx:#fff;--mut:#8e8e93;--ac:#0a84ff;--blur:blur(30px) saturate(180%)}",
    "body{background:var(--bg);color:var(--tx);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}",
    "body::before{content:'';position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 500px at 20% 0%,rgba(10,132,255,.15),transparent 60%),radial-gradient(900px 500px at 90% 100%,rgba(191,90,242,.12),transparent 60%);animation:drift 18s ease-in-out infinite alternate}",
    "@keyframes drift{from{transform:translate(0,0)}to{transform:translate(-4%,3%)}}",
    ".hd{position:sticky;top:0;z-index:100;background:rgba(0,0,0,.75);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);border-bottom:1px solid var(--bd)}",
    ".hd-in{max-width:1200px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap}",
    ".logo{font-size:20px;font-weight:800;background:linear-gradient(135deg,#0a84ff,#bf5af2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none}",
    ".nv{display:flex;gap:4px;overflow-x:auto;max-width:100%;scrollbar-width:none}",
    ".nv::-webkit-scrollbar{display:none}",
    ".nv a{color:var(--mut);text-decoration:none;font-size:14px;font-weight:600;padding:9px 14px;border-radius:12px;white-space:nowrap}",
    ".nv a.on,.nv a:hover{color:#fff;background:rgba(255,255,255,.07)}",
    ".wrap{max-width:1200px;margin:0 auto;padding:24px 20px 60px}",
    ".card{background:var(--card);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);border:1px solid var(--bd);border-radius:22px;padding:24px;margin-bottom:20px}",
    "h1{font-size:32px;font-weight:800;margin-bottom:12px}",
    "h2{font-size:22px;font-weight:700;margin-bottom:14px}",
    "h3{font-size:18px;font-weight:600;margin-bottom:8px}",
    "p{color:var(--mut);line-height:1.7;font-size:15px;margin-bottom:10px}",
    ".btn{display:inline-block;padding:13px 26px;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;color:#fff}",
    ".btn-p{background:linear-gradient(135deg,#0a84ff,#bf5af2);box-shadow:0 8px 26px rgba(10,132,255,.35)}",
    ".btn-g{background:rgba(255,255,255,.09);border:1px solid var(--bd)}",
    ".btn-d{background:rgba(255,69,58,.14);color:#ff453a;border:1px solid rgba(255,69,58,.3)}",
    ".btn-s{padding:8px 14px;font-size:13px}",
    ".inp{width:100%;padding:14px;background:rgba(255,255,255,.05);border:1px solid var(--bd);border-radius:14px;color:#fff;font-size:15px;margin-bottom:14px;outline:none;font-family:inherit}",
    ".inp:focus{border-color:var(--ac)}",
    "textarea.inp{min-height:130px;resize:vertical;font-family:'Courier New',monospace;font-size:13px}",
    ".grid{display:grid;gap:18px}",
    ".g2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}",
    ".g3{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}",
    ".stat{background:var(--card);border:1px solid var(--bd);border-radius:18px;padding:18px;text-align:center}",
    ".stat b{display:block;font-size:28px;color:var(--ac)}",
    ".stat span{font-size:11px;text-transform:uppercase;color:var(--mut)}",
    ".badge{display:inline-block;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:800;background:rgba(10,132,255,.14);color:var(--ac);border:1px solid rgba(10,132,255,.3)}",
    ".badge.ok{background:rgba(50,215,75,.14);color:#32d74b;border-color:rgba(50,215,75,.3)}",
    ".badge.dg{background:rgba(255,69,58,.14);color:#ff453a;border-color:rgba(255,69,58,.3)}",
    ".badge.gold{background:rgba(255,215,0,.14);color:gold;border-color:rgba(255,215,0,.35)}",
    ".ann{background:linear-gradient(90deg,rgba(10,132,255,.12),rgba(191,90,242,.12));border:1px solid var(--bd);border-radius:14px;padding:12px;text-align:center;font-size:14px;margin-bottom:20px}",
    ".row{display:flex;gap:10px;flex-wrap:wrap}",
    ".tbl{width:100%;border-collapse:collapse;font-size:14px}",
    ".tbl th,.tbl td{padding:12px;border-bottom:1px solid var(--bd);text-align:left}",
    ".tbl th{color:var(--mut);font-size:11px;text-transform:uppercase}",
    ".tw{overflow-x:auto}",
    ".tabs{display:flex;gap:8px;overflow-x:auto;margin-bottom:20px}",
    ".tab{padding:10px 20px;border-radius:30px;background:rgba(255,255,255,.06);border:1px solid var(--bd);color:var(--mut);font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}",
    ".tab.on{background:linear-gradient(135deg,#0a84ff,#bf5af2);color:#fff}",
    ".pane{display:none}.pane.on{display:block}",
    ".avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--bd)}",
    "@media(max-width:640px){h1{font-size:24px}.card{padding:18px}}",
    "</style>",
    db.settings.globalHeaderCode || "",
    "</head><body>",
    "<header class='hd'><div class='hd-in'>",
    "<a class='logo' href='/'>" + escapeHTML(db.settings.siteName) + "</a>",
    "<nav class='nv'>",
    "<a href='/' class='" + (cur === "/" ? "on" : "") + "'>Home</a>",
    "<a href='/create' class='" + (cur === "/create" ? "on" : "") + "'>Publish</a>",
    "<a href='/posts' class='" + (cur === "/posts" ? "on" : "") + "'>Posts</a>",
    "<a href='/dashboard' class='" + (cur === "/dashboard" ? "on" : "") + "'>Vault</a>",
    (isAdmin ? "<a href='/admin'>Admin</a>" : ""),
    (user ? "<a href='/logout'>Logout</a>" : "<a href='/create'>Login</a>"),
    "</nav>",
    "</div></header>",
    "<main class='wrap'>",
    (ann ? "<div class='ann'>" + escapeHTML(ann) + "</div>" : ""),
    content,
    "</main>",
    script || "",
    db.settings.globalFooterCode || "",
    "</body></html>"
  ].join("");
}

/* ============ HOME ============ */
app.get("/", function (req, res) {
  const db = getDB();
  const resources = db.resources || [];

  const content = [
    "<h1>Next-Gen HTML Hosting</h1>",
    "<p>Secure, isolated, and protected hosting platform.</p>",
    "<div class='grid g3'>",
    resources
      .map(function (r) {
        return [
          "<div class='card'>",
          "<span class='badge'>" + escapeHTML(r.ribbon) + "</span>",
          "<h3 style='margin-top:16px'>" + escapeHTML(r.title) + "</h3>",
          "<p>" + escapeHTML(r.badge) + "</p>",
          "<a href='/" + escapeHTML(r.slug) + "' class='btn btn-p' style='margin-top:20px;width:100%'>EXPLORE</a>",
          "</div>"
        ].join("");
      })
      .join(""),
    "</div>"
  ].join("");

  res.send(page("Home", content, "", req));
});

/* ============ CREATE ============ */
app.get("/create", function (req, res) {
  const user = getLoggedUser(req);

  if (!user && !isLoggedAdmin(req)) {
    const content = [
      "<div style='max-width:420px;margin:50px auto'>",
      "<div class='card'>",
      "<h2>Authentication Required</h2>",
      "<p>Login or create account to publish websites.</p>",
      "<input class='inp' id='au' placeholder='Username'>",
      "<input class='inp' id='ap' type='password' placeholder='Password'>",
      "<label style='display:flex;gap:8px;align-items:center;font-size:14px;color:var(--mut);margin-bottom:14px'>",
      "<input type='checkbox' id='asv' style='width:17px;height:17px'> Save Me (60 days)</label>",
      "<button class='btn btn-p' style='width:100%' id='aub'>Continue</button>",
      "<p id='aue' style='color:#ff453a;display:none;margin-top:12px'></p>",
      "</div></div>"
    ].join("");

    const script = [
      "<script>",
      "document.getElementById('aub').addEventListener('click',function(){",
      "var p={username:document.getElementById('au').value,password:document.getElementById('ap').value,saveMe:document.getElementById('asv').checked};",
      "fetch('/api/auth/quick-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})",
      ".then(function(r){return r.json();})",
      ".then(function(d){if(d.ok){location.reload();}else{var e=document.getElementById('aue');e.textContent=d.error;e.style.display='block';}});",
      "});",
      "</script>"
    ].join("");

    return res.send(page("Login", content, script, req));
  }

  const plan = (user && user.plan) || "vip";
  const name = user ? user.username : "Admin";

  const content = [
    "<h1>Publish HTML to Link</h1>",
    "<p>Logged in as <strong style='color:#fff'>" + escapeHTML(name) + "</strong> - Plan: <span class='badge gold'>" + escapeHTML(plan) + "</span></p>",
    "<div class='card'>",
    "<input class='inp' id='fTitle' placeholder='Project Title *'>",
    "<input class='inp' id='fSlug' placeholder='Unique slug *'>",
    "<input class='inp' id='fBio' placeholder='Bio / Description'>",
    "<input class='inp' id='fPass' type='password' placeholder='Access password (optional)'>",
    "<input type='file' id='fFile' accept='.html,.htm' class='inp' style='padding:10px'>",
    "<textarea class='inp' id='fHtml' placeholder='HTML Code *' style='min-height:240px'></textarea>",
    "<textarea class='inp' id='fCss' placeholder='Custom CSS (optional)'></textarea>",
    "<textarea class='inp' id='fJs' placeholder='Custom JS (optional)'></textarea>",
    "<label style='display:flex;gap:10px;align-items:center;margin-bottom:18px;cursor:pointer'>",
    "<input type='checkbox' id='fTheft' checked style='width:18px;height:18px'> Enable Anti-Theft Protection</label>",
    "<button class='btn btn-p' style='width:100%' id='fPub'>Publish Website</button>",
    "<div id='fRes' style='display:none;margin-top:18px' class='card'>",
    "<h3 style='color:#32d74b'>Website Published</h3>",
    "<p id='fUrl' style='word-break:break-all;color:#fff'></p>",
    "<div class='row'><a id='fVisit' class='btn btn-p btn-s' target='_blank' href='#'>Visit</a>",
    "<button class='btn btn-g btn-s' id='fCopy'>Copy Link</button></div>",
    "</div></div>"
  ].join("");

  const script = [
    "<script>",
    "document.getElementById('fTitle').addEventListener('input',function(e){",
    "document.getElementById('fSlug').value=e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');",
    "});",
    "document.getElementById('fFile').addEventListener('change',function(e){",
    "var f=e.target.files[0];if(!f)return;var r=new FileReader();",
    "r.onload=function(){document.getElementById('fHtml').value=r.result;};",
    "r.readAsText(f);});",
    "document.getElementById('fPub').addEventListener('click',function(){",
    "var p={title:document.getElementById('fTitle').value,slug:document.getElementById('fSlug').value,",
    "bio:document.getElementById('fBio').value,sitePassword:document.getElementById('fPass').value,",
    "html:document.getElementById('fHtml').value,css:document.getElementById('fCss').value,",
    "js:document.getElementById('fJs').value,antiTheft:document.getElementById('fTheft').checked};",
    "fetch('/api/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})",
    ".then(function(r){return r.json();})",
    ".then(function(d){if(d.ok){document.getElementById('fUrl').textContent=d.site.url;",
    "document.getElementById('fVisit').href=d.site.url;document.getElementById('fRes').style.display='block';}",
    "else{alert(d.error||'Failed');}});});",
    "document.getElementById('fCopy').addEventListener('click',function(){",
    "navigator.clipboard.writeText(document.getElementById('fUrl').textContent);alert('Copied');});",
    "</script>"
  ].join("");

  res.send(page("Publish", content, script, req));
});

app.get("/api/check-slug", function (req, res) {
  const slug = slugify(req.query.slug);
  const db = getDB();
  const exist = db.sites.some(function (s) {
    return s.slug === slug;
  });
  res.json({ ok: true, available: !exist && slug.length >= 2 });
});

/* ============ AUTH ============ */
app.post("/api/auth/quick-auth", function (req, res) {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();
  const saveMe = Boolean(req.body.saveMe);

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: "Username and password required" });
  }

  const db = getDB();
  let user = db.users.find(function (u) {
    return u.username.toLowerCase() === username.toLowerCase();
  });

  if (user) {
    if (user.banned) return res.status(403).json({ ok: false, error: "Account suspended" });
    if (user.password !== hashPassword(password)) {
      return res.status(401).json({ ok: false, error: "Incorrect password" });
    }
  } else {
    user = {
      id: genId(),
      username: username,
      password: hashPassword(password),
      role: "user",
      plan: "free",
      banned: false,
      bio: "",
      avatar: "",
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    saveDB(db);
    addLog("USER_REGISTER", "User: " + username);
  }

  const tok = genId(24);
  userSessions.set(tok, { userId: user.id, saveMe: saveMe, created: Date.now() });
  res.cookie("sj_user_token", tok, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: (saveMe ? 60 : 2) * 24 * 60 * 60 * 1000
  });
  res.json({ ok: true, user: { id: user.id, username: user.username } });
});

app.get("/logout", function (req, res) {
  const tok = getCookie(req, "sj_user_token");
  if (tok) userSessions.delete(tok);
  res.clearCookie("sj_user_token", { path: "/" });
  res.redirect("/");
});

app.post("/api/auth/logout", function (req, res) {
  const tok = getCookie(req, "sj_user_token");
  if (tok) userSessions.delete(tok);
  res.clearCookie("sj_user_token", { path: "/" });
  res.json({ ok: true });
});

/* ============ PUBLISH ============ */
app.post("/api/publish", requireUser, function (req, res) {
  const b = req.body || {};
  if (!b.title || !b.html) {
    return res.status(400).json({ ok: false, error: "Title and HTML required" });
  }

  const db = getDB();
  let slug = slugify(b.slug || b.title);
  if (!slug) slug = "site-" + genId(4);
  if (db.sites.some(function (s) {
    return s.slug === slug;
  })) {
    return res.status(409).json({ ok: false, error: "Slug already taken" });
  }

  let fullHtml = b.html;
  if (b.css && b.css.trim()) fullHtml = "<style>\n" + b.css + "\n</style>\n" + fullHtml;
  if (b.js && b.js.trim()) fullHtml = fullHtml + "\n<script>\n" + b.js + "\n</script>\n";
  if (b.antiTheft) fullHtml = fullHtml + ANTI_THEFT_SCRIPT;

  const site = {
    id: genId(),
    userId: req.user.id,
    authorName: req.user.username,
    title: String(b.title).slice(0, 120),
    slug: slug,
    bio: b.bio || "",
    rawHtml: b.html,
    rawCss: b.css || "",
    rawJs: b.js || "",
    html: fullHtml,
    antiTheft: Boolean(b.antiTheft),
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

/* ============ SITE SERVING ============ */
app.get("/site/:slug", function (req, res) {
  const db = getDB();
  const site = db.sites.find(function (s) {
    return s.slug === req.params.slug;
  });
  if (!site || site.published === false) {
    return res.status(404).send("Not Found");
  }

  if (site.sitePassword) {
    const entered = req.query.pass;
    if (!entered || hashPassword(entered) !== site.sitePassword) {
      return res.send(
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Locked</title></head>" +
          "<body style='background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>" +
          "<form method='GET' style='background:#111;padding:30px;border-radius:16px;text-align:center'>" +
          "<h2>Password Protected</h2><p style='color:#999'>Enter password</p>" +
          "<input name='pass' type='password' style='padding:12px;width:100%;margin:12px 0;background:#222;border:1px solid #333;color:#fff;border-radius:10px'>" +
          "<button style='padding:12px;width:100%;background:#0a84ff;border:none;color:#fff;border-radius:10px;font-weight:700'>Unlock</button>" +
          "</form></body></html>"
      );
    }
  }

  site.views = (site.views || 0) + 1;
  saveDB(db);
  res.type("html").send(site.html);
});

app.get("/site/:slug/download", function (req, res) {
  const db = getDB();
  const site = db.sites.find(function (s) {
    return s.slug === req.params.slug;
  });
  if (!site) return res.status(404).send("Not Found");
  res.setHeader("Content-Disposition", "attachment; filename=\"" + site.slug + ".html\"");
  res.type("html").send(site.html);
});

/* ============ DASHBOARD ============ */
app.get("/dashboard", function (req, res) {
  const user = getLoggedUser(req);
  if (!user && !isLoggedAdmin(req)) return res.redirect("/create");

  const content = [
    "<h1>My Vault</h1>",
    "<p>Author: <strong style='color:#fff'>" + escapeHTML(user ? user.username : "Admin") + "</strong></p>",
    "<div class='row' style='margin-bottom:16px'><a class='btn btn-p btn-s' href='/create'>New Site</a></div>",
    "<div id='vaultBox' class='grid g2'>Loading...</div>"
  ].join("");

  const script = [
    "<script>",
    "function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}",
    "function loadVault(){fetch('/api/user/vault-data').then(function(r){return r.json();}).then(function(d){",
    "if(!d.ok)return;var box=document.getElementById('vaultBox');",
    "if(!d.sites.length){box.innerHTML='<div class=\"card\"><p>No sites yet.</p></div>';return;}",
    "box.innerHTML=d.sites.map(function(s){",
    "return '<div class=\"card\"><span class=\"badge\">'+esc(s.category||'Site')+'</span>'+",
    "'<h3 style=\"margin-top:10px\">'+esc(s.title)+'</h3>'+",
    "'<p>/'+esc(s.slug)+' - views '+(s.views||0)+'</p>'+",
    "'<div class=\"row\"><a class=\"btn btn-p btn-s\" target=\"_blank\" href=\"/site/'+esc(s.slug)+'\">Visit</a>'+",
    "'<button class=\"btn btn-d btn-s\" onclick=\"delSite(\\''+s.id+'\\')\">Delete</button></div></div>';}).join('');});}",
    "function delSite(id){if(!confirm('Delete?'))return;",
    "fetch('/api/sites/'+id,{method:'DELETE'}).then(function(){loadVault();});}",
    "loadVault();",
    "</script>"
  ].join("");

  res.send(page("Vault", content, script, req));
});

app.get("/api/user/vault-data", requireUser, function (req, res) {
  const db = getDB();
  const mine = db.sites.filter(function (s) {
    return s.userId === req.user.id || req.user.role === "admin";
  });
  res.json({ ok: true, sites: mine });
});

app.delete("/api/sites/:id", requireUser, function (req, res) {
  const db = getDB();
  const site = db.sites.find(function (s) {
    return s.id === req.params.id;
  });
  if (!site) return res.status(404).json({ ok: false });
  if (site.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ ok: false });
  }
  db.sites = db.sites.filter(function (s) {
    return s.id !== req.params.id;
  });
  saveDB(db);
  addLog("SITE_DELETE", site.title);
  res.json({ ok: true });
});

/* ============ POSTS ============ */
app.get("/posts", function (req, res) {
  const db = getDB();
  const folders = db.folders || ["General"];
  const posts = db.posts || [];

  const content = [
    "<h1>Posts and Guides</h1>",
    "<div class='tabs'>",
    "<div class='tab on' data-f='ALL'>All</div>",
    folders
      .map(function (f) {
        return "<div class='tab' data-f='" + escapeHTML(f) + "'>" + escapeHTML(f) + "</div>";
      })
      .join(""),
    "</div>",
    "<div id='postList' class='grid g2'>",
    posts
      .map(function (p) {
        return [
          "<div class='card pf' data-folder='" + escapeHTML(p.folder || "General") + "'>",
          (p.pinned ? "<span class='badge gold'>Pinned</span> " : ""),
          "<span class='badge'>" + escapeHTML(p.folder || "General") + "</span>",
          "<h3 style='margin-top:10px'>" + escapeHTML(p.title) + "</h3>",
          "<p>" + escapeHTML((p.bio || (p.content || "")).slice(0, 100)) + "</p>",
          "<div class='row'><a class='btn btn-p btn-s' href='/post/" + escapeHTML(p.slug) + "'>Read</a>",
          "<span style='font-size:12px;color:var(--mut)'>" + (p.likes || 0) + " likes - " + (p.comments || []).length + " comments</span></div>",
          "</div>"
        ].join("");
      })
      .join("") || "<div class='card'><p>No posts yet.</p></div>",
    "</div>"
  ].join("");

  const script = [
    "<script>",
    "document.addEventListener('click',function(e){",
    "var t=e.target.closest('[data-f]');if(!t)return;",
    "var ts=document.querySelectorAll('.tab');for(var i=0;i<ts.length;i++)ts[i].classList.remove('on');t.classList.add('on');",
    "var f=t.getAttribute('data-f');var cs=document.querySelectorAll('.pf');",
    "for(var j=0;j<cs.length;j++){cs[j].style.display=(f==='ALL'||cs[j].getAttribute('data-folder')===f)?'':'none';}});",
    "</script>"
  ].join("");

  res.send(page("Posts", content, script, req));
});

app.get("/post/:slug", function (req, res) {
  const db = getDB();
  const post = db.posts.find(function (p) {
    return p.slug === req.params.slug;
  });
  if (!post) return res.status(404).send("Post Not Found");

  post.views = (post.views || 0) + 1;
  saveDB(db);

  const content = [
    "<div class='card'>",
    "<span class='badge'>" + escapeHTML(post.folder || "General") + "</span>",
    "<h1 style='margin-top:12px'>" + escapeHTML(post.title) + "</h1>",
    "<p style='font-size:13px'>By " + escapeHTML(post.author) + " - " + (post.views || 0) + " views</p>",
    "<div style='margin:18px 0;line-height:1.9;color:#e5e5ea;white-space:pre-wrap'>" + escapeHTML(post.content || "") + "</div>",
    "<button class='btn btn-g btn-s' id='likeBtn'>Like (" + (post.likes || 0) + ")</button>",
    "</div>",
    "<div class='card'>",
    "<h3>Comments (" + (post.comments || []).length + ")</h3>",
    (post.comments || [])
      .map(function (c) {
        return [
          "<div style='padding:12px 0;border-bottom:1px solid var(--bd)'>",
          "<strong>" + escapeHTML(c.author) + "</strong>",
          "<p style='margin:6px 0 0'>" + escapeHTML(c.text) + "</p>",
          "</div>"
        ].join("");
      })
      .join("") || "<p>No comments.</p>",
    "<div style='margin-top:16px'>",
    "<input class='inp' id='cA' placeholder='Your name'>",
    "<textarea class='inp' id='cT' placeholder='Comment'></textarea>",
    "<button class='btn btn-p btn-s' id='cB'>Post Comment</button>",
    "</div></div>"
  ].join("");

  const script = [
    "<script>",
    "document.getElementById('likeBtn').addEventListener('click',function(){",
    "fetch('/api/posts/" + post.id + "/like',{method:'POST'}).then(function(){location.reload();});});",
    "document.getElementById('cB').addEventListener('click',function(){",
    "fetch('/api/posts/" + post.id + "/comment',{method:'POST',headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({author:document.getElementById('cA').value,text:document.getElementById('cT').value})})",
    ".then(function(){location.reload();});});",
    "</script>"
  ].join("");

  res.send(page(post.title, content, script, req));
});

app.post("/api/posts/:id/like", function (req, res) {
  const db = getDB();
  const post = db.posts.find(function (p) {
    return p.id === req.params.id;
  });
  if (!post) return res.status(404).json({ ok: false });
  post.likes = (post.likes || 0) + 1;
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/posts/:id/comment", function (req, res) {
  const db = getDB();
  const post = db.posts.find(function (p) {
    return p.id === req.params.id;
  });
  if (!post) return res.status(404).json({ ok: false });
  post.comments = post.comments || [];
  post.comments.push({
    id: genId(6),
    author: String(req.body.author || "Anonymous").slice(0, 40),
    text: String(req.body.text || "").slice(0, 800),
    date: new Date().toISOString()
  });
  saveDB(db);
  res.json({ ok: true });
});

/* ============ ADMIN PANEL ============ */
app.get("/admin", function (req, res) {
  const content = [
    "<div class='card' style='max-width:400px;margin:60px auto'>",
    "<h2>Admin Login</h2>",
    "<input class='inp' id='pw' type='password' placeholder='Password / PIN'>",
    "<button class='btn btn-p' style='width:100%' id='lb'>Unlock</button>",
    "</div>",
    "<div id='panel' style='display:none'>",
    "<div class='card row' style='justify-content:space-between'>",
    "<h1 style='margin:0'>Control Panel</h1>",
    "<a href='/' style='color:var(--mut);font-size:13px'>View Site</a>",
    "</div>",
    "<div class='grid g2' id='stats'></div>",
    "<div class='card'><h2>Users</h2><div class='tw' id='uT'></div></div>",
    "<div class='card'><h2>Websites</h2><div class='tw' id='sT'></div></div>",
    "<div class='card'><h2>Settings</h2>",
    "<input class='inp' id='sName' placeholder='Site name'>",
    "<input class='inp' id='sAnn' placeholder='Announcement'>",
    "<label style='display:flex;gap:8px;align-items:center;margin-bottom:10px'>",
    "<input type='checkbox' id='sAnnOn'> Show Announcement</label>",
    "<label style='display:flex;gap:8px;align-items:center;margin-bottom:10px'>",
    "<input type='checkbox' id='sMaint'> Maintenance Mode</label>",
    "<button class='btn btn-p' id='sSave'>Save Settings</button>",
    "<a class='btn btn-g' style='margin-left:10px' href='/api/admin/backup-download'>Download Backup</a>",
    "</div>",
    "<div class='card'><h2>Logs</h2><div class='tw' id='lT'></div></div>",
    "</div>"
  ].join("");

  const script = [
    "<script>",
    "function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}",
    "function api(u,o){return fetch(u,o||{}).then(function(r){return r.json();});}",
    "document.getElementById('lb').addEventListener('click',function(){",
    "api('/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({password:document.getElementById('pw').value})})",
    ".then(function(d){if(d.ok){boot();}else{alert('Wrong password');}});});",
    "api('/api/admin/ping').then(function(d){if(d.ok)boot();});",
    "function boot(){",
    "document.querySelector('.card[style*=max-width]').style.display='none';",
    "document.getElementById('panel').style.display='block';",
    "load();}",
    "function load(){",
    "api('/api/admin/all').then(function(d){",
    "if(!d.ok)return;",
    "var tv=0;d.sites.forEach(function(s){tv+=s.views||0;});",
    "document.getElementById('stats').innerHTML=",
    "'<div class=stat><b>'+d.users.length+'</b><span>Users</span></div>'+",
    "'<div class=stat><b>'+d.sites.length+'</b><span>Sites</span></div>'+",
    "'<div class=stat><b>'+d.posts.length+'</b><span>Posts</span></div>'+",
    "'<div class=stat><b>'+tv+'</b><span>Views</span></div>';",
    "document.getElementById('sName').value=d.settings.siteName||'';",
    "document.getElementById('sAnn').value=d.settings.announcement||'';",
    "document.getElementById('sAnnOn').checked=!!d.settings.announcementActive;",
    "document.getElementById('sMaint').checked=!!d.settings.maintenanceMode;",
    "var uh='<table class=tbl><tr><th>User</th><th>Status</th><th>Actions</th></tr>';",
    "d.users.forEach(function(u){",
    "uh+='<tr><td>'+esc(u.username)+'</td><td>'+(u.banned?'Banned':'Active')+'</td>'+",
    "'<td><button class=\"btn btn-g btn-s\" data-ban=\"'+u.id+'\">'+(u.banned?'Unban':'Ban')+'</button>'+",
    "'<button class=\"btn btn-d btn-s\" data-delu=\"'+u.id+'\">Delete</button></td></tr>';});",
    "document.getElementById('uT').innerHTML=uh+'</table>';",
    "var sh='<table class=tbl><tr><th>Title</th><th>Author</th><th>Views</th><th>Actions</th></tr>';",
    "d.sites.forEach(function(s){",
    "sh+='<tr><td>'+esc(s.title)+'</td><td>'+esc(s.authorName)+'</td><td>'+(s.views||0)+'</td>'+",
    "'<td><a class=\"btn btn-g btn-s\" target=_blank href=/site/'+esc(s.slug)+'>View</a>'+",
    "'<button class=\"btn btn-d btn-s\" data-dels=\"'+s.id+'\">Delete</button></td></tr>';});",
    "document.getElementById('sT').innerHTML=sh+'</table>';",
    "var lh='<table class=tbl><tr><th>Time</th><th>Action</th><th>Details</th></tr>';",
    "(d.logs||[]).forEach(function(l){",
    "lh+='<tr><td>'+esc(l.timestamp)+'</td><td>'+esc(l.action)+'</td><td>'+esc(l.details)+'</td></tr>';});",
    "document.getElementById('lT').innerHTML=lh+'</table>';});}",
    "document.addEventListener('click',function(e){var t=e.target;",
    "if(t.closest('[data-ban]')){api('/api/admin/user/'+t.closest('[data-ban]').getAttribute('data-ban')+'/ban',{method:'POST'}).then(load);}",
    "else if(t.closest('[data-delu]')){if(confirm('Delete?'))api('/api/admin/user/'+t.closest('[data-delu]').getAttribute('data-delu'),{method:'DELETE'}).then(load);}",
    "else if(t.closest('[data-dels]')){if(confirm('Delete?'))api('/api/admin/sites/'+t.closest('[data-dels]').getAttribute('data-dels'),{method:'DELETE'}).then(load);}});",
    "document.getElementById('sSave').addEventListener('click',function(){",
    "api('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({siteName:document.getElementById('sName').value,",
    "announcement:document.getElementById('sAnn').value,",
    "announcementActive:document.getElementById('sAnnOn').checked,",
    "maintenanceMode:document.getElementById('sMaint').checked})})",
    ".then(function(){alert('Saved');});});",
    "</script>"
  ].join("");

  res.send(page("Admin", content, script, req));
});

app.post("/api/admin/auth", function (req, res) {
  if (req.body.password !== ADMIN_PASS && req.body.password !== ADMIN_PIN) {
    return res.status(401).json({ ok: false });
  }
  const tok = genId(24);
  adminSessions.set(tok, true);
  res.cookie("sj_admin_token", tok, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400000 });
  addLog("ADMIN_LOGIN", "Admin logged in");
  res.json({ ok: true });
});

app.get("/api/admin/ping", function (req, res) {
  res.json({ ok: isLoggedAdmin(req) });
});

app.get("/api/admin/all", requireAdmin, function (req, res) {
  const db = getDB();
  res.json({
    ok: true,
    users: db.users,
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
  addLog("SETTINGS_UPDATE", "Settings updated");
  res.json({ ok: true });
});

app.get("/api/admin/backup-download", requireAdmin, function (req, res) {
  const db = getDB();
  res.setHeader("Content-Disposition", "attachment; filename=\"sjemar-backup-" + Date.now() + ".json\"");
  res.type("json").send(JSON.stringify(db, null, 2));
});

app.post("/api/admin/user/:id/ban", requireAdmin, function (req, res) {
  const db = getDB();
  const user = db.users.find(function (u) {
    return u.id === req.params.id;
  });
  if (!user) return res.status(404).json({ ok: false });
  user.banned = !user.banned;
  saveDB(db);
  addLog("USER_BAN_TOGGLE", user.username);
  res.json({ ok: true });
});

app.delete("/api/admin/user/:id", requireAdmin, function (req, res) {
  const db = getDB();
  db.users = db.users.filter(function (u) {
    return u.id !== req.params.id;
  });
  db.sites = db.sites.filter(function (s) {
    return s.userId !== req.params.id;
  });
  saveDB(db);
  addLog("USER_DELETE", req.params.id);
  res.json({ ok: true });
});

app.delete("/api/admin/sites/:id", requireAdmin, function (req, res) {
  const db = getDB();
  db.sites = db.sites.filter(function (s) {
    return s.id !== req.params.id;
  });
  saveDB(db);
  addLog("ADMIN_SITE_DELETE", req.params.id);
  res.json({ ok: true });
});

app.post("/api/admin/folder-post", requireAdmin, function (req, res) {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ ok: false, error: "Title required" });
  const db = getDB();
  if (b.folder && db.folders.indexOf(b.folder) === -1) db.folders.push(b.folder);
  db.posts.unshift({
    id: genId(),
    folder: b.folder || "General",
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
  addLog("ADMIN_POST_CREATE", b.title);
  res.json({ ok: true });
});

/* ============ HEALTH + 404 ============ */
app.get("/healthz", function (req, res) {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use(function (req, res) {
  res.status(404).send(
    page(
      "404",
      "<div class='card' style='text-align:center;padding:60px 20px'><h1>404</h1><p>Page not found.</p><a class='btn btn-p' href='/'>Home</a></div>",
      "",
      req
    )
  );
});

/* ============ START ============ */
app.listen(PORT, "0.0.0.0", function () {
  console.log("=================================================");
  console.log("SJEMAR OLED v8.0 ONLINE");
  console.log("Port: " + PORT);
  console.log("Admin: " + ADMIN_PASS + " | PIN: " + ADMIN_PIN);
  console.log("=================================================");
});
