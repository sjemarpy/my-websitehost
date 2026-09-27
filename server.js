/**
 * ============================================================================
 * SJEMAR NEXT-GEN OLED ENGINE (FIREBASE & iOS GLASS EDITION)
 * Complete Single-File Node.js Backend & Cyber OLED Frontend
 * ============================================================================
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || "py.py.php";
const ADMIN_PIN = "5768"; // Admin Unlock PIN
const SPECIAL_VIP_ID = "899987"; // Special VIP User ID

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "database.json");

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* =========================================================
   DATABASE INITIALIZATION & MANAGEMENT (JSON ENGINE)
========================================================= */

const initialDB = {
  settings: {
    siteName: "SJEMAR OLED",
    maintenanceMode: false,
    announcement: "⚡ Welcome to SJEMAR Next-Gen Engine. Secure HTML Hosting Active.",
    announcementActive: true,
    globalHeaderCode: "",
    globalFooterCode: "",
    defaultAntiTheft: true
  },
  users: [],
  sites: [],
  folders: ["General", "Updates", "Guides", "VIP Codes", "Tools", "APKs"],
  posts: [
    {
      id: "p1",
      folder: "Updates",
      title: "SJEMAR Next-Gen OLED Engine Released",
      slug: "sjemar-engine-v2",
      bio: "Official release notes of the secure Firebase-integrated HTML platform.",
      content: "Welcome to SJEMAR. Build, host, and protect your projects with real-time Firebase Auth and OLED Glass UI.",
      author: "Admin",
      views: 0,
      likes: 0,
      pinned: true,
      comments: [],
      createdAt: new Date().toISOString()
    }
  ],
  versions: [
    { id: "v1", title: "Version 1.0", subtitle: "TikTok & Facebook Video Engine", link: "#" },
    { id: "v9", title: "Version 6.0", subtitle: "OLED Anti-Theft & Firebase Protection", link: "#" }
  ],
  resources: [
    { id: "r1", section: "RESOURCE", ribbon: "FREE", badge: "100% Free", title: "Free Website", icon: "triangle", slug: "create" },
    { id: "r2", section: "APK", ribbon: "APK", badge: "Android Build", title: "APK Builder", icon: "valorant", slug: "create" },
    { id: "r3", section: "REVIEW", ribbon: "REV", badge: "Community", title: "Review Project", icon: "spinner", slug: "posts" }
  ],
  logs: []
};

function initDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialDB, null, 2), "utf8");
    }
  } catch (err) {
    console.error("Database Init Error:", err);
  }
}

function getDB() {
  try {
    initDB();
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      return { ...initialDB, ...data, settings: { ...initialDB.settings, ...(data.settings || {}) } };
    }
  } catch (err) {
    console.error("Database Read Error:", err);
  }
  return { ...initialDB };
}

function saveDB(db) {
  try {
    initDB();
    fs.writeFileSync(DATA_FILE, JSON.stringify(db || initialDB, null, 2), "utf8");
  } catch (err) {
    console.error("Database Save Error:", err);
  }
}

function addLog(action, details = "") {
  try {
    const db = getDB();
    db.logs = db.logs || [];
    db.logs.unshift({ id: genId(6), action, details, timestamp: new Date().toISOString() });
    if (db.logs.length > 200) db.logs = db.logs.slice(0, 200);
    saveDB(db);
  } catch {}
}

initDB();

/* =========================================================
   SECURITY, HASHING & SESSIONS
========================================================= */

function genId(len = 10) { return crypto.randomBytes(len).toString("hex"); }
function hashPassword(pass) { return crypto.createHash("sha256").update(String(pass) + "SJEMAR_ULTIMATE_2026").digest("hex"); }
function slugify(text) {
  return String(text || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function escapeHTML(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const userSessions = new Map();
const adminSessions = new Map();

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  for (const part of cookies.split(";")) {
    const item = part.trim();
    if (item.startsWith(name + "=")) return decodeURIComponent(item.substring(name.length + 1));
  }
  return null;
}

function getLoggedUser(req) {
  const token = getCookie(req, "sj_user_token");
  if (!token) return null;
  const sess = userSessions.get(token);
  if (!sess) return null;
  if (Date.now() - sess.created > 60 * 24 * 60 * 60 * 1000) { userSessions.delete(token); return null; }
  const db = getDB();
  const user = db.users.find((u) => u.id === sess.userId);
  if (user && user.banned) return null;
  return user || null;
}

function isLoggedAdmin(req) {
  const token = getCookie(req, "sj_admin_token");
  if (!token) return false;
  return adminSessions.has(token);
}

function requireAdmin(req, res, next) {
  if (!isLoggedAdmin(req)) return res.status(401).json({ ok: false, error: "Admin access required." });
  next();
}

function requireUser(req, res, next) {
  const user = getLoggedUser(req);
  if (isLoggedAdmin(req)) { req.user = { id: "admin", username: "Super Admin", role: "admin" }; return next(); }
  if (!user) return res.status(401).json({ ok: false, error: "Authentication required" });
  req.user = user;
  next();
}

app.use((req, res, next) => {
  const db = getDB();
  if (db.settings && db.settings.maintenanceMode) {
    if (isLoggedAdmin(req) || req.path.startsWith("/admin") || req.path.startsWith("/api/admin")) return next();
    return res.status(503).send(`<h1>⚙️ SYSTEM MAINTENANCE</h1><p>We are upgrading our servers.</p>`);
  }
  next();
});

const ANTI_THEFT_SCRIPT = `
<script>
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.onkeydown = function(e) {
    if(e.keyCode == 123) return false;
    if(e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'C'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0))) return false;
    if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false;
  };
</script>`;

/* =========================================================
   iOS OLED DARK GLASS BLUR UI ENGINE
========================================================= */

function page(title, content, script = "", req = { path: "" }) {
  const db = getDB();
  const ann = db.settings.announcementActive && db.settings.announcement;
  const user = getLoggedUser(req);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${escapeHTML(title)} | SJEMAR OLED</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000; --glass: rgba(28, 28, 30, 0.65); --glass-heavy: rgba(15, 15, 15, 0.85);
      --glass-border: rgba(255, 255, 255, 0.08); --text: #ffffff; --text-secondary: #8e8e93;
      --accent: #0a84ff; --accent-glow: rgba(10, 132, 255, 0.4); --danger: #ff453a; --success: #32d74b;
      --blur: blur(40px) saturate(180%);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif; min-height: 100vh; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
    body::before {
      content: ''; position: fixed; top: -50%; left: -50%; width: 200%; height: 200%;
      background: radial-gradient(circle at 15% 15%, rgba(10, 132, 255, 0.15), transparent 40%), radial-gradient(circle at 85% 85%, rgba(255, 55, 95, 0.08), transparent 40%);
      z-index: -1; animation: ambient 25s infinite alternate ease-in-out;
    }
    @keyframes ambient { 0% { transform: translate(0, 0) rotate(0deg); } 100% { transform: translate(-5%, -5%) rotate(15deg); } }
    .ambient-3d { position: fixed; z-index: -1; opacity: 0.15; filter: blur(8px); animation: float3d 20s infinite alternate ease-in-out; }
    .ambient-3d.tl { top: 10%; left: 10%; } .ambient-3d.br { bottom: 10%; right: 10%; animation-delay: -10s; }
    @keyframes float3d { 0% { transform: translateZ(0) rotateX(0) rotateY(0); } 100% { transform: translateZ(50px) rotateX(20deg) rotateY(20deg); } }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .nav-bar { position: sticky; top: 0; z-index: 100; background: var(--glass-heavy); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); border-bottom: 1px solid var(--glass-border); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent), #5e5ce6); border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px var(--accent-glow); }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: var(--text-secondary); text-decoration: none; font-weight: 500; font-size: 15px; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--text); }
    .glass { background: var(--glass); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); border: 1px solid var(--glass-border); border-radius: 24px; padding: 28px; box-shadow: 0 12px 40px rgba(0,0,0,0.6); margin-bottom: 24px; }
    .glass-input { width: 100%; padding: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; color: var(--text); font-size: 16px; outline: none; transition: all 0.3s; }
    .glass-input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-glow); background: rgba(255,255,255,0.08); }
    .btn { padding: 14px 28px; border: none; border-radius: 14px; font-weight: 600; font-size: 16px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .btn:active { transform: scale(0.96); }
    .btn-primary { background: var(--accent); color: white; box-shadow: 0 6px 20px var(--accent-glow); }
    .btn-glass { background: rgba(255,255,255,0.1); color: var(--text); border: 1px solid var(--glass-border); }
    .grid { display: grid; gap: 20px; } .grid-3 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); } .grid-2 { grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); }
    h1 { font-size: 36px; font-weight: 800; letter-spacing: -1px; margin-bottom: 12px; } h2 { font-size: 28px; font-weight: 700; margin-bottom: 16px; } h3 { font-size: 20px; font-weight: 600; margin-bottom: 12px; }
    p { color: var(--text-secondary); line-height: 1.6; font-size: 15px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: rgba(10, 132, 255, 0.15); color: var(--accent); border: 1px solid rgba(10, 132, 255, 0.3); }
    .profile-pic { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--glass-border); box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
    .announce { background: linear-gradient(90deg, rgba(10,132,255,0.1), rgba(255,55,95,0.1)); border: 1px solid var(--glass-border); padding: 12px; text-align: center; border-radius: 16px; margin-bottom: 24px; font-size: 14px; font-weight: 500; }
    ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
    @media (max-width: 768px) { .nav-links { display: none; } h1 { font-size: 28px; } .glass { padding: 20px; border-radius: 20px; } }
  </style>
</head>
<body>
  <svg class="ambient-3d tl" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0a84ff;stop-opacity:1" /><stop offset="100%" style="stop-color:#5e5ce6;stop-opacity:1" /></linearGradient></defs><path d="M100,10 L190,100 L100,190 L10,100 Z" fill="url(#grad1)" /></svg>
  <svg class="ambient-3d br" width="250" height="250" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="none" stroke="#ff453a" stroke-width="2" opacity="0.5"/><circle cx="100" cy="100" r="50" fill="none" stroke="#32d74b" stroke-width="1" opacity="0.5"/></svg>

  <nav class="nav-bar">
    <div class="logo">
      <div class="logo-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon></svg></div>
      SJEMAR <span style="color: var(--accent)">OLED</span>
    </div>
    <div class="nav-links">
      <a href="/" class="${req.path === '/' ? 'active' : ''}">Home</a>
      <a href="/create" class="${req.path === '/create' ? 'active' : ''}">Publish</a>
      <a href="/posts" class="${req.path === '/posts' ? 'active' : ''}">Posts</a>
      <a href="/dashboard" class="${req.path === '/dashboard' ? 'active' : ''}">Vault</a>
      <a href="/admin" class="${req.path === '/admin' ? 'active' : ''}">Admin</a>
    </div>
    <div id="user-profile-nav" style="display:${user ? 'flex' : 'none'}; align-items:center; gap:12px;">
      <img class="profile-pic" src="${user ? user.photoURL : ''}" alt="Profile">
      <span style="font-weight:600; font-size:14px;">${user ? escapeHTML(user.username) : ''}</span>
      <button class="btn btn-glass" style="padding:8px 12px; font-size:12px;" onclick="logoutUser()">Logout</button>
    </div>
  </nav>

  <div class="container">
    ${ann ? `<div class="announce">✨ ${escapeHTML(ann)}</div>` : ""}
    ${content}
  </div>

  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
  <script>
    const firebaseConfig = {
      apiKey: "AIzaSyBTNUdaOHUrdFluaJAt2RQi6kZ5SjhVS8s", authDomain: "sifatby-38886.firebaseapp.com",
      databaseURL: "https://sifatby-38886-default-rtdb.firebaseio.com", projectId: "sifatby-38886",
      storageBucket: "sifatby-38886.firebasestorage.app", messagingSenderId: "571558461802",
      appId: "1:571558461802:web:34dc103c19aa3ed4b5a513", measurementId: "G-BJ04Q1WZ8Y"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdToken();
        fetch('/api/auth/firebase-login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, email: user.email, displayName: user.displayName || user.email.split('@')[0], photoURL: user.photoURL || 'https://ui-avatars.com/api/?background=0a84ff&color=fff&name=' + (user.displayName || user.email), token: token })
        }).then(r => r.json()).then(data => { if(data.ok && window.location.pathname === '/create') location.reload(); });
      }
    });
    window.firebaseAuth = auth;
    window.logoutUser = () => { auth.signOut().then(() => { fetch('/api/auth/logout', {method:'POST'}).then(() => location.reload()); }); };
  </script>
  ${script}
</body>
</html>`;
}

/* =========================================================
   ROUTES & CONTROLLERS
========================================================= */

app.get("/", (req, res) => {
  const db = getDB();
  res.send(page("Home", `
    <h1>Next-Gen HTML Hosting</h1>
    <p style="margin-bottom:30px;">Secure, isolated, and protected by Firebase & Anti-Theft Engine.</p>
    <div class="grid grid-3">
      ${(db.resources || []).map(r => `
        <div class="glass" style="text-align:center; transition:transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
          <span class="badge">${escapeHTML(r.ribbon)}</span>
          <h3 style="margin-top:16px;">${escapeHTML(r.title)}</h3>
          <p>${escapeHTML(r.badge)}</p>
          <a href="/${encodeURIComponent(r.slug)}" class="btn btn-primary" style="margin-top:20px; width:100%;">EXPLORE</a>
        </div>
      `).join("")}
    </div>
  `, "", req));
});

app.get("/create", (req, res) => {
  const user = getLoggedUser(req);
  const authUI = user ? `
    <div class="glass" style="text-align:center;">
      <img src="${user.photoURL}" class="profile-pic" style="width:80px;height:80px;margin-bottom:16px;">
      <h3>Welcome, ${escapeHTML(user.username)}</h3>
      <p style="margin-bottom:20px;">You are authenticated via Firebase. Ready to publish.</p>
    </div>` : `
    <div class="glass" style="text-align:center;">
      <h2>🔒 Authentication Required</h2>
      <p style="margin-bottom:24px;">Login via Firebase to claim project ownership.</p>
      <button id="googleLoginBtn" class="btn btn-primary" style="width:100%;margin-bottom:12px;">Continue with Google</button>
      <div id="emailAuthForm" style="display:none; text-align:left; margin-top:20px;">
        <input type="email" id="fbEmail" class="glass-input" placeholder="Email" style="margin-bottom:12px;">
        <input type="password" id="fbPass" class="glass-input" placeholder="Password" style="margin-bottom:12px;">
        <button id="emailLoginBtn" class="btn btn-primary" style="width:100%;">Login / Register</button>
      </div>
      <p style="margin-top:16px; font-size:13px; cursor:pointer; color:var(--accent);" onclick="document.getElementById('emailAuthForm').style.display='block'">Or use Email & Password</p>
    </div>`;

  const pubUI = user ? `
    <div class="glass">
      <h2>Publish HTML to Link</h2>
      <form id="publishForm">
        <div class="grid grid-2" style="margin-bottom:16px;">
          <input type="text" name="title" class="glass-input" placeholder="Project Title *" required>
          <input type="text" name="slug" class="glass-input" placeholder="Unique Slug *" required>
        </div>
        <textarea name="html" class="glass-input" rows="10" placeholder="HTML Code *" required style="font-family:monospace; margin-bottom:16px;"></textarea>
        <label style="display:flex; align-items:center; gap:10px; margin-bottom:24px; cursor:pointer;">
          <input type="checkbox" name="antiTheft" checked style="width:20px; height:20px;"> Enable Anti-Theft Protection
        </label>
        <button type="submit" class="btn btn-primary" style="width:100%;">Publish & Generate Link</button>
      </form>
      <div id="publishResult" style="display:none; margin-top:20px; padding:20px; background:rgba(50,215,75,0.1); border:1px solid rgba(50,215,75,0.3); border-radius:16px; text-align:center;">
        <h3 style="color:var(--success);">Website Published!</h3>
        <a id="siteLink" href="#" target="_blank" class="btn btn-glass" style="margin-top:12px;">Visit Site</a>
      </div>
    </div>` : '';

  res.send(page("Publish", authUI + pubUI, `
    <script>
      const googleBtn = document.getElementById('googleLoginBtn');
      if(googleBtn) googleBtn.onclick = () => firebaseAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      const emailLoginBtn = document.getElementById('emailLoginBtn');
      if(emailLoginBtn) emailLoginBtn.onclick = async () => {
        const email = document.getElementById('fbEmail').value, pass = document.getElementById('fbPass').value;
        try { await firebaseAuth.signInWithEmailAndPassword(email, pass); } catch(e) { try { await firebaseAuth.createUserWithEmailAndPassword(email, pass); } catch(err) { alert(err.message); } }
      };
      const form = document.getElementById('publishForm');
      if(form) form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form), data = Object.fromEntries(fd.entries()); data.antiTheft = fd.has('antiTheft');
        const res = await fetch('/api/publish', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        const json = await res.json();
        if(json.ok) { document.getElementById('siteLink').href = json.site.url; document.getElementById('publishResult').style.display = 'block'; form.reset(); } else alert(json.error);
      };
    </script>
  `, req));
});

app.post("/api/auth/firebase-login", (req, res) => {
  const { uid, email, displayName, photoURL } = req.body;
  if (!uid) return res.status(400).json({ ok: false, error: "UID required" });
  const db = getDB();
  let user = db.users.find((u) => u.firebaseUid === uid);
  if (!user) {
    user = { id: uid, firebaseUid: uid, username: displayName, email: email, photoURL: photoURL, role: "user", banned: false, createdAt: new Date().toISOString() };
    db.users.push(user); saveDB(db); addLog("USER_REGISTER_FIREBASE", `User registered: ${email}`);
  }
  if (user.banned) return res.status(403).json({ ok: false, error: "Account suspended" });
  const tok = genId(24);
  userSessions.set(tok, { userId: user.id, saveMe: true, created: Date.now() });
  res.cookie("sj_user_token", tok, { httpOnly: true, maxAge: 60 * 24 * 60 * 60 * 1000, path: "/" });
  res.json({ ok: true, user: { id: user.id, username: user.username, photoURL: user.photoURL } });
});

app.post("/api/auth/logout", (req, res) => {
  const tok = getCookie(req, "sj_user_token"); if (tok) userSessions.delete(tok);
  res.clearCookie("sj_user_token", { path: "/" }); res.json({ ok: true });
});

app.post("/api/publish", requireUser, (req, res) => {
  const { title, bio, html, antiTheft } = req.body; const db = getDB(); let slug = slugify(req.body.slug || title);
  if (!title || !html) return res.status(400).json({ ok: false, error: "Title and HTML are required" });
  if (db.sites.some((s) => s.slug === slug)) return res.status(409).json({ ok: false, error: "Slug taken" });
  let fullHtml = html; if (antiTheft) fullHtml += "\n" + ANTI_THEFT_SCRIPT;
  const site = { id: genId(), userId: req.user.id, authorName: req.user.username, title, slug, bio: bio || "", html: fullHtml, published: true, views: 0, createdAt: new Date().toISOString() };
  db.sites.unshift(site); saveDB(db); addLog("SITE_PUBLISH", `Site published: ${title}`);
  res.json({ ok: true, site: { url: `/site/${site.slug}` } });
});

app.get("/site/:slug", (req, res) => {
  const db = getDB(); const site = db.sites.find((s) => s.slug === req.params.slug);
  if (!site) return res.status(404).send("Not Found");
  site.views = Number(site.views || 0) + 1; saveDB(db); res.type("html").send(site.html);
});

app.get("/dashboard", requireUser, (req, res) => {
  const db = getDB(); const mySites = db.sites.filter((s) => s.userId === req.user.id);
  res.send(page("Vault", `
    <h1>My Project Vault</h1>
    <div class="grid grid-2">
      ${mySites.map(s => `
        <div class="glass">
          <h3>${escapeHTML(s.title)}</h3>
          <p>/${escapeHTML(s.slug)} • ${s.views} Views</p>
          <div style="display:flex; gap:10px; margin-top:16px;">
            <a href="/site/${s.slug}" target="_blank" class="btn btn-primary" style="flex:1;">Visit</a>
            <button class="btn btn-glass" style="color:var(--danger);" onclick="deleteSite('${s.id}')">Delete</button>
          </div>
        </div>
      `).join("") || '<p>No sites published yet.</p>'}
    </div>
  `, `<script>
    async function deleteSite(id) { if(confirm('Delete?')) { await fetch('/api/sites/'+id, {method:'DELETE'}); location.reload(); } }
  </script>`, req));
});

app.delete("/api/sites/:id", requireUser, (req, res) => {
  const db = getDB(); db.sites = db.sites.filter((s) => s.id !== req.params.id); saveDB(db); res.json({ ok: true });
});

app.get("/posts", (req, res) => {
  const db = getDB();
  res.send(page("Posts", `
    <h1>System Posts & Guides</h1>
    <div class="grid grid-2">
      ${db.posts.map(p => `
        <div class="glass">
          <span class="badge">${escapeHTML(p.folder)}</span>
          <h3 style="margin-top:12px;">${escapeHTML(p.title)}</h3>
          <p>${escapeHTML(p.bio || p.content.slice(0, 100))}</p>
          <p style="margin-top:12px; font-size:12px;">❤️ ${p.likes} Views: ${p.views}</p>
        </div>
      `).join("")}
    </div>
  `, "", req));
});

app.get("/admin", (req, res) => {
  res.send(page("Admin Control", `
    <div class="glass" style="text-align:center;" id="adminLock">
      <h1>🔒 Admin Master Suite</h1>
      <p style="margin-bottom:24px;">Enter Security PIN to access system controls.</p>
      <input type="password" id="adminPin" class="glass-input" placeholder="Enter PIN (5768)" style="max-width:300px; margin:0 auto 16px; text-align:center;">
      <button class="btn btn-primary" onclick="unlockAdmin()">Unlock System</button>
    </div>
    <div id="adminPanel" style="display:none;">
      <div class="grid grid-3" style="margin-bottom:24px;">
        <div class="glass" style="text-align:center;"><h3 id="statUsers">0</h3><p>Total Users</p></div>
        <div class="glass" style="text-align:center;"><h3 id="statSites">0</h3><p>Total Websites</p></div>
        <div class="glass" style="text-align:center;"><h3 id="statPosts">0</h3><p>Total Posts</p></div>
      </div>
      <div class="glass">
        <h2>⚙️ 5768 Edit Info & System Settings</h2>
        <input type="text" id="setSiteName" class="glass-input" placeholder="Site Brand Name" style="margin-bottom:12px;">
        <input type="text" id="setAnnouncement" class="glass-input" placeholder="Global Announcement" style="margin-bottom:20px;">
        <label style="display:flex; align-items:center; gap:10px; margin-bottom:20px; cursor:pointer;">
          <input type="checkbox" id="setMaintenance" style="width:20px; height:20px;"> ⚠️ Enable Maintenance Mode
        </label>
        <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
        <a href="/api/admin/backup-download" class="btn btn-glass" style="margin-left:12px;">Download JSON Backup</a>
      </div>
      <div class="glass">
        <h2>👥 User Management (899987 VIP System)</h2>
        <div id="userList" class="grid grid-2"></div>
      </div>
    </div>
  `, `
    <script>
      async function unlockAdmin() {
        const pin = document.getElementById('adminPin').value;
        const res = await fetch('/api/admin/auth', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: pin }) });
        if((await res.json()).ok) { document.getElementById('adminLock').style.display = 'none'; document.getElementById('adminPanel').style.display = 'block'; loadAdminData(); } else alert('Incorrect PIN');
      }
      async function loadAdminData() {
        const data = await (await fetch('/api/admin/all')).json();
        if(data.ok) {
          document.getElementById('statUsers').innerText = data.users.length;
          document.getElementById('statSites').innerText = data.sites.length;
          document.getElementById('setSiteName').value = data.settings.siteName;
          document.getElementById('setAnnouncement').value = data.settings.announcement;
          document.getElementById('setMaintenance').checked = data.settings.maintenanceMode;
          document.getElementById('userList').innerHTML = data.users.map(u => \`
            <div class="glass" style="padding:16px; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:12px;">
                <img src="\${u.photoURL || 'https://ui-avatars.com/api/?name='+u.username}" class="profile-pic" style="width:40px;height:40px;">
                <div><strong>\${u.username}</strong> \${u.id === '899987' || u.firebaseUid === '899987' ? '<span class="badge" style="background:rgba(255,215,0,0.2);color:gold;border-color:gold;margin-left:8px;">VIP 899987</span>' : ''}<p style="font-size:12px;">\${u.email || 'User'}</p></div>
              </div>
              <button class="btn btn-glass" style="padding:8px 12px; font-size:12px;" onclick="toggleBan('\${u.id}')">\${u.banned ? 'Unban' : 'Ban'}</button>
            </div>\`).join('');
        }
      }
      async function saveSettings() {
        await fetch('/api/admin/settings', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ siteName: document.getElementById('setSiteName').value, announcement: document.getElementById('setAnnouncement').value, maintenanceMode: document.getElementById('setMaintenance').checked }) });
        alert('Settings Saved!');
      }
      async function toggleBan(id) { await fetch('/api/admin/user/' + id + '/ban', {method:'POST'}); loadAdminData(); }
    </script>
  `, req));
});

app.post("/api/admin/auth", (req, res) => {
  if (req.body.password !== ADMIN_PASS && req.body.password !== ADMIN_PIN) return res.status(401).json({ ok: false });
  const tok = genId(24); adminSessions.set(tok, true);
  res.cookie("sj_admin_token", tok, { httpOnly: true, path: "/" }); res.json({ ok: true });
});

app.get("/api/admin/all", requireAdmin, (req, res) => { const db = getDB(); res.json({ ok: true, users: db.users, sites: db.sites, settings: db.settings }); });
app.post("/api/admin/settings", requireAdmin, (req, res) => { const db = getDB(); db.settings = { ...db.settings, ...req.body }; saveDB(db); res.json({ ok: true }); });
app.post("/api/admin/user/:id/ban", requireAdmin, (req, res) => { const db = getDB(); const u = db.users.find(x=>x.id===req.params.id); if(u){ u.banned = !u.banned; saveDB(db); } res.json({ok:true}); });
app.get("/api/admin/backup-download", requireAdmin, (req, res) => { res.setHeader("Content-Disposition", `attachment; filename="backup.json"`); res.type("json").send(JSON.stringify(getDB(), null, 2)); });

app.use((req, res) => res.status(404).send(page("404", `<h1>404 NOT FOUND</h1><a href="/" class="btn btn-primary">RETURN HOME</a>`, "", req)));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SJEMAR Next-Gen OLED Engine Online!`);
  console.log(`📡 Port: ${PORT} | 🛡️ Admin PIN: ${ADMIN_PIN}`);
});
