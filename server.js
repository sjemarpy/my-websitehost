/**
 * ============================================================================
 * SJEMAR NEXT-GEN OLED ENGINE (ULTIMATE EDITION)
 * Complete Single-File Node.js Backend & Cyber OLED Frontend
 * Ready for Render / Railway / VPS Deployment
 * ============================================================================
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || "py.py.php";

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
      slug: "sjemar-engine-v1",
      bio: "Official release notes of the secure HTML to link publishing platform.",
      content: "Welcome to SJEMAR. Build, host, and protect your HTML, CSS, and JS projects with real-time anti-theft encryption, custom slugs, and dedicated isolation.",
      author: "Admin",
      views: 0,
      likes: 0,
      pinned: true,
      comments: [
        { id: "c1", author: "System", text: "Welcome everyone! Feel free to share your thoughts.", date: new Date().toISOString() }
      ],
      createdAt: new Date().toISOString()
    }
  ],
  versions: [
    { id: "v1", title: "Version 1.0", subtitle: "TikTok & Facebook Video Engine", link: "#" },
    { id: "v2", title: "Version 2.0", subtitle: "Temp Mail Web Infrastructure", link: "#" },
    { id: "v3", title: "Version 2.5", subtitle: "Bio Link Interactive Builder", link: "#" },
    { id: "v4", title: "Version 3.0", subtitle: "AI Intelligent Website Generator", link: "#" },
    { id: "v5", title: "Version 3.5", subtitle: "UID Identity Checker Tool", link: "#" },
    { id: "v6", title: "Version 4.0", subtitle: "AI Background Removal Suite", link: "#" },
    { id: "v7", title: "Version 4.5", subtitle: "Cloud Hosting Architecture", link: "#" },
    { id: "v8", title: "Version 5.0", subtitle: "Premium Developer Resources", link: "#" },
    { id: "v9", title: "Version 6.0", subtitle: "OLED Anti-Theft Protection Engine", link: "#" }
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
      return {
        ...initialDB,
        ...data,
        settings: { ...initialDB.settings, ...(data.settings || {}) }
      };
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
    db.logs.unshift({
      id: genId(6),
      action,
      details,
      timestamp: new Date().toISOString()
    });
    if (db.logs.length > 200) db.logs = db.logs.slice(0, 200);
    saveDB(db);
  } catch {}
}

initDB();

/* =========================================================
   SECURITY, HASHING & SESSIONS
========================================================= */

function genId(len = 10) {
  return crypto.randomBytes(len).toString("hex");
}

function hashPassword(pass) {
  return crypto.createHash("sha256").update(String(pass) + "SJEMAR_ULTIMATE_2026").digest("hex");
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
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  if (Date.now() - sess.created > (sess.saveMe ? 60 : 2) * 24 * 60 * 60 * 1000) {
    userSessions.delete(token);
    return null;
  }
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
  if (!isLoggedAdmin(req)) {
    return res.status(401).json({ ok: false, error: "Admin access required. Please authenticate." });
  }
  next();
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

// Maintenance Mode Middleware
app.use((req, res, next) => {
  const db = getDB();
  if (db.settings && db.settings.maintenanceMode) {
    if (isLoggedAdmin(req) || req.path.startsWith("/admin") || req.path.startsWith("/api/admin")) {
      return next();
    }
    return res.status(503).send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Under Maintenance</title></head>
      <body style="background:#000; color:#fff; font-family:sans-serif; text-align:center; padding:100px 20px;">
        <h1 style="font-size:32px; letter-spacing:2px">⚙️ SYSTEM MAINTENANCE</h1>
        <p style="color:#888; margin-top:10px">We are upgrading our servers. Please check back shortly.</p>
      </body>
      </html>
    `);
  }
  next();
});

/* =========================================================
   ANTI-THEFT JAVASCRIPT INJECTION SCRIPT
========================================================= */

const ANTI_THEFT_SCRIPT = `
<script>
(function(){
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); return false; });
  document.addEventListener('keydown', function(e){
    if(e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || (e.ctrlKey && e.keyCode === 85)){
      e.preventDefault();
      return false;
    }
  });
  document.addEventListener('dragstart', function(e){ e.preventDefault(); });
})();
</script>
`;

/* =========================================================
   OLED DARK GLASS ENGINE UI
========================================================= */

function page(title, content, script = "") {
  const db = getDB();
  const ann = db.settings.announcementActive && db.settings.announcement;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#000000">
<title>${escapeHTML(title)} — ${escapeHTML(db.settings.siteName || "SJEMAR")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=SF+Pro+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
${db.settings.globalHeaderCode || ""}

<style>
:root {
  --bg: #000000;
  --white: #ffffff;
  --accent: #00f2fe;
  --glass-bg: rgba(14, 14, 14, 0.78);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-glow: rgba(255, 255, 255, 0.05);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  background: var(--bg);
  color: var(--white);
  min-height: 100vh;
  overflow-x: hidden;
}

body {
  background: radial-gradient(circle at 50% -10%, rgba(255, 255, 255, 0.08), transparent 45%), #000000;
  display: flex;
  flex-direction: column;
}

.container {
  width: min(520px, 94%);
  margin: 0 auto;
  padding: 20px 0 120px;
  position: relative;
  z-index: 1;
}

/* BROADCAST NOTICE */
.announcement-bar {
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 15px;
  font-size: 11px;
  text-align: center;
  color: #ccc;
  backdrop-filter: blur(10px);
}

/* ROTATING BORDER ANIMATION */
@keyframes spinGlow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.rotating-border-box {
  position: relative;
  border-radius: 26px;
  background: rgba(10, 10, 10, 0.9);
  padding: 1.5px;
  overflow: hidden;
  margin-bottom: 24px;
}

.rotating-border-box::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    transparent 0deg,
    transparent 100deg,
    rgba(255, 255, 255, 0.85) 180deg,
    transparent 260deg,
    transparent 360deg
  );
  animation: spinGlow 4s linear infinite;
  z-index: 0;
  pointer-events: none;
}

.cyber-card {
  position: relative;
  z-index: 1;
  background: var(--glass-bg);
  backdrop-filter: blur(35px) saturate(180%);
  -webkit-backdrop-filter: blur(35px) saturate(180%);
  border-radius: 24.5px;
  padding: 24px 20px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.corner-ribbon {
  position: absolute;
  top: 18px;
  left: -32px;
  transform: rotate(-45deg);
  background: #ffffff;
  color: #000000;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 9px;
  letter-spacing: 1px;
  padding: 4px 35px;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  z-index: 2;
}

.card-top-pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 14px;
}

.card-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #ffffff;
  margin-bottom: 18px;
  text-transform: lowercase;
}

.card-icon-wrap {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.btn-cyber-view {
  width: 100%;
  padding: 13px;
  border-radius: 14px;
  background: #ffffff;
  color: #000000;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  transition: all 0.25s ease;
}
.btn-cyber-view:hover {
  background: #e5e5e5;
  box-shadow: 0 0 35px rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
}

.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  height: 62px;
  display: flex;
  align-items: center;
}
.nav-inner {
  width: min(520px, 94%);
  margin: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 17px;
  letter-spacing: 2px;
  color: #fff;
  text-decoration: none;
}
.brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #ffffff;
  color: #000000;
  font-weight: 900;
  display: grid;
  place-items: center;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
}

/* FLOATING DOCK BAR */
.dock-bar {
  position: fixed;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: min(480px, calc(100% - 24px));
  height: 62px;
  background: rgba(18, 18, 18, 0.88);
  backdrop-filter: blur(35px) saturate(180%);
  -webkit-backdrop-filter: blur(35px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 22px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 6px;
  z-index: 999;
  box-shadow: 0 20px 40px rgba(0,0,0,0.85);
}
.dock-item {
  color: #777777;
  text-decoration: none;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 10px;
  border-radius: 12px;
  transition: .2s;
}
.dock-item:hover, .dock-item.active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}
.dock-item svg { width: 18px; height: 18px; fill: currentColor; }

.section-title {
  text-align: center;
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  letter-spacing: 3px;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  margin: 30px 0 14px;
  text-transform: uppercase;
}

/* FORM ELEMENTS */
.field { margin-bottom: 15px; }
label { display: block; font-size: 11px; font-weight: 700; color: #888888; margin-bottom: 6px; letter-spacing: 1px; }
input, textarea, select {
  width: 100%;
  padding: 13px 15px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: .2s;
}
input:focus, textarea:focus, select:focus {
  border-color: #ffffff;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
}
textarea { min-height: 180px; font-family: monospace; font-size: 13px; }

.notice {
  display: none;
  padding: 13px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 13px;
  margin: 14px 0;
}
.notice.show { display: block; }
.result {
  display: none;
  padding: 16px;
  border-radius: 14px;
  background: rgba(0,0,0,0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  margin-top: 15px;
}
.result.show { display: block; }
.result code {
  display: block;
  padding: 10px;
  margin: 8px 0;
  background: #050505;
  border-radius: 8px;
  color: #ffffff;
  font-family: monospace;
  font-size: 13px;
  word-break: break-all;
}

.btn-nav {
  padding: 7px 14px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: .2s;
}
.btn-nav:hover { background: #ffffff; color: #000000; }

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(25px);
  z-index: 1000;
  display: none;
  place-items: center;
  padding: 20px;
}
.modal-overlay.active { display: grid; }
.modal-box {
  width: min(440px, 100%);
  background: rgba(12, 12, 12, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 22px;
  padding: 22px;
  max-height: 85vh;
  overflow-y: auto;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
}
.modal-head h2 { font-family: 'Orbitron', sans-serif; font-size: 15px; color: #fff; }
.modal-close { background: transparent; border: none; color: #777; font-size: 24px; cursor: pointer; }
.version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  margin-bottom: 10px;
}

/* SOCIAL & WEATHER */
.social-wrap {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  backdrop-filter: blur(35px);
  margin-bottom: 25px;
}
.social-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  transition: .25s;
  text-decoration: none;
}
.social-icon:hover {
  background: #ffffff;
  color: #000000;
  transform: scale(1.1);
}

.weather-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 22px;
  backdrop-filter: blur(35px);
}
</style>
</head>
<body>

${ann ? `<div class="announcement-bar">${escapeHTML(ann)}</div>` : ""}

<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="brand">
      <div class="brand-icon">S</div>
      ${escapeHTML(db.settings.siteName || "SJEMAR")}
    </a>
    <button class="btn-nav" onclick="openVersionModal()">VERSIONS</button>
  </div>
</nav>

${content}

<!-- FLOATING DOCK BAR -->
<div class="dock-bar">
  <a href="/" class="dock-item">
    <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
    Home
  </a>
  <a href="/create" class="dock-item">
    <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
    Publish
  </a>
  <a href="/posts" class="dock-item">
    <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
    Posts
  </a>
  <a href="/dashboard" class="dock-item">
    <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
    Vault
  </a>
  <a href="/admin" class="dock-item">
    <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
    Admin
  </a>
</div>

<!-- VERSION MODAL -->
<div class="modal-overlay" id="versionModal">
  <div class="modal-box">
    <div class="modal-head">
      <h2>SYSTEM VERSIONS</h2>
      <button class="modal-close" onclick="closeVersionModal()">&times;</button>
    </div>
    <div id="versionListContent"></div>
  </div>
</div>

<script>
function openVersionModal(){
  document.getElementById("versionModal").classList.add("active");
  loadVersions();
}
function closeVersionModal(){
  document.getElementById("versionModal").classList.remove("active");
}
async function loadVersions(){
  try{
    const r = await fetch("/api/public/versions");
    const d = await r.json();
    const el = document.getElementById("versionListContent");
    el.innerHTML = d.versions.map(v => \`
      <div class="version-item">
        <div>
          <h4 style="font-family:'Orbitron'; font-size:12px; color:#fff">\${v.title}</h4>
          <p style="font-size:11px; color:#777">\${v.subtitle}</p>
        </div>
        <a href="\${v.link || '#'}" class="btn-nav" style="padding:4px 10px; font-size:10px">VIEW</a>
      </div>
    \`).join("");
  }catch{}
}
</script>

${script}
${db.settings.globalFooterCode || ""}
</body>
</html>`;
}

/* =========================================================
   1. HOME PAGE ROUTE
========================================================= */

app.get("/", (req, res) => {
  const db = getDB();
  const resources = db.resources || [];

  res.send(
    page(
      "Home",
      `
<main class="container">
  ${resources
    .map(
      (r) => `
    <div class="section-title">${escapeHTML(r.section)}</div>
    <div class="rotating-border-box">
      <div class="cyber-card">
        <div class="corner-ribbon">${escapeHTML(r.ribbon)}</div>
        <div class="card-top-pill">${escapeHTML(r.badge)}</div>
        <h3 class="card-title">${escapeHTML(r.title)}</h3>
        
        <div class="card-icon-wrap">
          ${
            r.icon === "valorant"
              ? `<svg width="45" height="45" viewBox="0 0 100 100" fill="#ffffff"><path d="M50 85L85 20H65L50 60L35 20H15L50 85Z"/></svg>`
              : r.icon === "spinner"
              ? `<svg width="35" height="35" viewBox="0 0 50 50" stroke="#ffffff" fill="none" stroke-width="4"><circle cx="25" cy="25" r="20" stroke-dasharray="80" stroke-dashoffset="60"></circle></svg>`
              : `<svg width="40" height="40" viewBox="0 0 100 100" fill="#ffffff"><polygon points="50 15, 85 80, 15 80"/></svg>`
          }
        </div>

        <a href="/${encodeURIComponent(r.slug)}" class="btn-cyber-view">
          EXPLORE
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </a>
      </div>
    </div>
  `
    )
    .join("")}

  <div class="section-title">CONNECT</div>
  <div class="social-wrap">
    <a href="https://youtube.com" target="_blank" class="social-icon">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/></svg>
    </a>
    <a href="https://facebook.com" target="_blank" class="social-icon">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.595 0 9 1.583 9 4.615V8z"/></svg>
    </a>
    <a href="https://tiktok.com" target="_blank" class="social-icon">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
    </a>
    <a href="https://discord.com" target="_blank" class="social-icon">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
    </a>
  </div>

  <div class="section-title">WEATHER</div>
  <div class="weather-card">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
      <div>
        <div style="font-family:'Orbitron'; font-size:36px; font-weight:800">30.9°C</div>
        <div style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); font-size:11px; margin-top:5px">
          BANGLADESH
        </div>
      </div>
      <div style="text-align:right">
        <svg width="45" height="45" viewBox="0 0 64 64">
          <circle cx="38" cy="26" r="14" fill="#ffffff"/>
          <path d="M20 44h28a10 10 0 0 0 0-20 14 14 0 0 0-27-2A10 10 0 0 0 20 44z" fill="#777777"/>
        </svg>
        <div style="margin-top:4px; font-size:12px; color:#aaa">CLEAR SKY</div>
      </div>
    </div>
  </div>
</main>
`
    )
  );
});

app.get("/api/public/versions", (req, res) => {
  const db = getDB();
  res.json({ ok: true, versions: db.versions || [] });
});

/* =========================================================
   2. HTML TO LINK CREATOR (ADVANCED SUITE)
========================================================= */

app.get("/create", (req, res) => {
  res.send(
    page(
      "Publish HTML to Link",
      `
<main class="container">
  <div class="section-title">HTML TO LINK SUITE</div>

  <!-- AUTH GATE BOX -->
  <div id="authGateBox" class="cyber-card" style="text-align:left; display:none; margin-bottom:20px">
    <div class="card-top-pill">AUTHENTICATION REQUIRED</div>
    <h3 style="font-family:'Orbitron'; font-size:16px; margin:10px 0 4px">Login or Create Account</h3>
    <p style="color:#777; font-size:12px; margin-bottom:16px">Claim your project ownership with real isolation protection.</p>

    <div class="field">
      <label>USERNAME</label>
      <input id="gateUser" placeholder="e.g. cyber_creator">
    </div>
    <div class="field">
      <label>PASSWORD</label>
      <input id="gatePass" type="password" placeholder="••••••••">
    </div>

    <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#aaa; margin-bottom:15px; cursor:pointer">
      <input type="checkbox" id="gateSaveMe" checked style="width:16px; height:16px">
      Save Me (Stay logged in for 60 days)
    </label>

    <div id="gateNotice" class="notice"></div>
    <button id="gateBtn" class="btn-cyber-view">CONTINUE TO PUBLISHER</button>
  </div>

  <!-- PUBLISHER SUITE -->
  <div id="publisherSuite" class="cyber-card" style="text-align:left">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
      <span id="userBadge" class="card-top-pill" style="margin:0">LOGGED IN</span>
      <button onclick="logout()" class="btn-nav" style="padding:4px 8px; font-size:10px">LOGOUT</button>
    </div>

    <div class="field">
      <label>PROJECT TITLE *</label>
      <input id="pTitle" placeholder="My Next-Gen Website">
    </div>

    <div class="field">
      <label>UNIQUE SLUG (NEVER USED BEFORE) *</label>
      <div style="position:relative">
        <input id="pSlug" placeholder="my-awesome-site" oninput="checkSlugAvailability()">
        <span id="slugStatus" style="position:absolute; right:12px; top:13px; font-size:11px; font-weight:700"></span>
      </div>
    </div>

    <div class="field">
      <label>PROJECT BIO / DESCRIPTION</label>
      <input id="pBio" placeholder="Short description of this website...">
    </div>

    <div class="field">
      <label>OPTIONAL SITE ACCESS PASSWORD</label>
      <input id="pSitePass" type="password" placeholder="Leave empty for public site">
    </div>

    <div class="field">
      <label>UPLOAD .HTML FILE (OPTIONAL)</label>
      <input id="fileUpload" type="file" accept=".html,.htm,.txt">
    </div>

    <div class="field">
      <label>HTML CODE *</label>
      <textarea id="pHtml" placeholder="<!DOCTYPE html>&#10;<html>&#10;<body><h1>Hello World</h1></body>&#10;</html>"></textarea>
    </div>

    <div class="field">
      <label>CUSTOM JAVASCRIPT (OPTIONAL)</label>
      <textarea id="pJs" style="min-height:100px" placeholder="// console.log('Custom JS injected');"></textarea>
    </div>

    <div class="field">
      <label>CUSTOM CSS (OPTIONAL)</label>
      <textarea id="pCss" style="min-height:100px" placeholder="/* body { background: #000; } */"></textarea>
    </div>

    <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#aaa; margin-bottom:18px; cursor:pointer">
      <input type="checkbox" id="pAntiTheft" checked style="width:16px; height:16px">
      Enable Anti-Theft (Disable right click & Inspect element)
    </label>

    <div id="pubNotice" class="notice"></div>
    <button id="pubBtn" class="btn-cyber-view">PUBLISH & GENERATE LINK</button>

    <!-- RESULT CARD -->
    <div id="pubResult" class="result">
      <strong style="color:#fff">Website Published Successfully!</strong>
      <code id="pubUrl"></code>
      <div style="display:flex; gap:8px; margin-top:10px">
        <a id="pubOpen" target="_blank" class="btn-cyber-view">VISIT SITE</a>
        <button id="pubCopy" class="btn-nav" style="width:50%">COPY LINK</button>
      </div>
    </div>
  </div>
</main>
`,
      `
<script>
let currentUser = null;

async function syncAuth(){
  const r = await fetch("/api/auth/me");
  const d = await r.json();
  if(d.ok && d.user){
    currentUser = d.user;
    document.getElementById("authGateBox").style.display = "none";
    document.getElementById("publisherSuite").style.display = "block";
    document.getElementById("userBadge").textContent = "AUTHOR: " + d.user.username;
  } else {
    document.getElementById("authGateBox").style.display = "block";
    document.getElementById("publisherSuite").style.display = "none";
  }
}
syncAuth();

// GATE AUTH
document.getElementById("gateBtn").onclick = async () => {
  const username = document.getElementById("gateUser").value.trim();
  const password = document.getElementById("gatePass").value.trim();
  const saveMe = document.getElementById("gateSaveMe").checked;
  const not = document.getElementById("gateNotice");

  if(!username || !password){
    not.textContent = "Username and password required!";
    not.className = "notice show";
    return;
  }

  try{
    const r = await fetch("/api/auth/quick-auth", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ username, password, saveMe })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Authentication failed");
    syncAuth();
  }catch(e){
    not.textContent = e.message;
    not.className = "notice show";
  }
};

// FILE UPLOAD READER
document.getElementById("fileUpload").onchange = (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById("pHtml").value = ev.target.result;
    if(!document.getElementById("pTitle").value){
      document.getElementById("pTitle").value = file.name.replace(/\\.[^/.]+$/, "");
    }
  };
  reader.readAsText(file);
};

// LIVE SLUG CHECK
let slugTimer;
async function checkSlugAvailability(){
  clearTimeout(slugTimer);
  const slug = document.getElementById("pSlug").value.trim();
  const status = document.getElementById("slugStatus");
  if(!slug){ status.textContent = ""; return; }
  
  slugTimer = setTimeout(async () => {
    const r = await fetch("/api/check-slug?slug=" + encodeURIComponent(slug));
    const d = await r.json();
    if(d.available){
      status.textContent = "AVAILABLE ✓";
      status.style.color = "#00ffaa";
    } else {
      status.textContent = "TAKEN ✕";
      status.style.color = "#ff4444";
    }
  }, 300);
}

// PUBLISH ACTION
document.getElementById("pubBtn").onclick = async () => {
  const title = document.getElementById("pTitle").value.trim();
  const slug = document.getElementById("pSlug").value.trim();
  const bio = document.getElementById("pBio").value.trim();
  const pass = document.getElementById("pSitePass").value.trim();
  const html = document.getElementById("pHtml").value.trim();
  const js = document.getElementById("pJs").value.trim();
  const css = document.getElementById("pCss").value.trim();
  const antiTheft = document.getElementById("pAntiTheft").checked;
  const not = document.getElementById("pubNotice");

  if(!title || !html){
    not.textContent = "Title and HTML code are required!";
    not.className = "notice show";
    return;
  }

  try{
    const r = await fetch("/api/publish", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ title, slug, bio, sitePassword: pass, html, js, css, antiTheft })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Publish failed");

    document.getElementById("pubUrl").textContent = d.site.url;
    document.getElementById("pubOpen").href = d.site.url;
    document.getElementById("pubResult").className = "result show";
    not.textContent = "Project Published & Secured!";
    not.className = "notice show";
  }catch(e){
    not.textContent = e.message;
    not.className = "notice show";
  }
};

document.getElementById("pubCopy").onclick = async () => {
  await navigator.clipboard.writeText(document.getElementById("pubUrl").textContent);
  document.getElementById("pubCopy").textContent = "COPIED!";
  setTimeout(() => document.getElementById("pubCopy").textContent = "COPY LINK", 1500);
};

async function logout(){
  await fetch("/api/auth/logout", { method:"POST" });
  syncAuth();
}
</script>
`
    )
  );
});

/* UNIQUE SLUG CHECK API */
app.get("/api/check-slug", (req, res) => {
  const slug = slugify(req.query.slug);
  const db = getDB();
  const exist = db.sites.some((s) => s.slug === slug);
  res.json({ ok: true, available: !exist && slug.length >= 2 });
});

/* AUTH CONTROLLERS */
app.post("/api/auth/quick-auth", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();
  const saveMe = Boolean(req.body.saveMe);

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: "Username and password required" });
  }

  const db = getDB();
  let user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());

  if (user) {
    if (user.banned) {
      return res.status(403).json({ ok: false, error: "This account has been suspended by Admin" });
    }
    if (user.password !== hashPassword(password)) {
      return res.status(401).json({ ok: false, error: "Incorrect password for this account" });
    }
  } else {
    user = {
      id: genId(),
      username,
      password: hashPassword(password),
      role: "user",
      banned: false,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    saveDB(db);
    addLog("USER_REGISTER", `User registered: ${username}`);
  }

  const tok = genId(24);
  userSessions.set(tok, { userId: user.id, saveMe, created: Date.now() });
  res.cookie("sj_user_token", tok, {
    httpOnly: true,
    maxAge: (saveMe ? 60 : 2) * 24 * 60 * 60 * 1000,
    path: "/"
  });

  res.json({ ok: true, user: { id: user.id, username: user.username } });
});

app.post("/api/auth/logout", (req, res) => {
  const tok = getCookie(req, "sj_user_token");
  if (tok) userSessions.delete(tok);
  res.clearCookie("sj_user_token", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const user = getLoggedUser(req);
  if (user) return res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
  if (isLoggedAdmin(req)) return res.json({ ok: true, user: { id: "admin", username: "Super Admin", role: "admin" } });
  res.json({ ok: false });
});

/* PUBLISH ENDPOINT WITH CUSTOM JS/CSS/ANTI-THEFT INJECTION */
app.post("/api/publish", requireUser, (req, res) => {
  const { title, bio, sitePassword, html, js, css, antiTheft } = req.body;
  const db = getDB();
  let slug = slugify(req.body.slug || title);

  if (!title || !html) return res.status(400).json({ ok: false, error: "Title and HTML are required" });

  if (!slug) slug = "site-" + genId(4);

  if (db.sites.some((s) => s.slug === slug)) {
    return res.status(409).json({ ok: false, error: "This slug is already taken. Please choose another." });
  }

  let fullHtml = html;
  if (css && css.trim()) {
    fullHtml = `<style>\n${css}\n</style>\n` + fullHtml;
  }
  if (js && js.trim()) {
    fullHtml = fullHtml + `\n<script>\n${js}\n</script>`;
  }
  if (antiTheft) {
    fullHtml = fullHtml + "\n" + ANTI_THEFT_SCRIPT;
  }

  const site = {
    id: genId(),
    userId: req.user.id,
    authorName: req.user.username,
    title,
    slug,
    bio: bio || "",
    rawHtml: html,
    rawCss: css || "",
    rawJs: js || "",
    antiTheft: Boolean(antiTheft),
    sitePassword: sitePassword ? hashPassword(sitePassword) : null,
    html: fullHtml,
    published: true,
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.sites.unshift(site);
  saveDB(db);
  addLog("SITE_PUBLISH", `Site published: ${title} (/site/${slug}) by ${req.user.username}`);

  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");

  res.json({ ok: true, site: { url: `${proto}://${host}/site/${site.slug}` } });
});

/* SITE SERVING (WITH PASSWORD PROTECTION GATE) */
app.get("/site/:slug", (req, res) => {
  const db = getDB();
  const site = db.sites.find((s) => s.slug === req.params.slug);
  if (!site || site.published === false) return res.status(404).send("Website Not Found or Private.");

  if (site.sitePassword) {
    const enteredPass = req.query.pass;
    if (!enteredPass || hashPassword(enteredPass) !== site.sitePassword) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Protected Site — SJEMAR</title>
          <style>
            body { background: #000; color: #fff; font-family: -apple-system, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; }
            .box { background: rgba(20,20,20,0.9); border: 1px solid rgba(255,255,255,0.15); padding: 30px; border-radius: 20px; width: min(340px, 90%); text-align: center; }
            input { width: 100%; padding: 12px; border-radius: 12px; background: #000; border: 1px solid #333; color: #fff; margin: 15px 0; box-sizing: border-box; }
            button { width: 100%; padding: 12px; border-radius: 12px; background: #fff; color: #000; font-weight: bold; border: none; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="box">
            <h3>🔒 Password Protected</h3>
            <p style="color:#777; font-size:12px; margin-top:5px">This website is locked by its author.</p>
            <form method="GET">
              <input type="password" name="pass" placeholder="Enter Access Password" required>
              <button type="submit">UNLOCK SITE</button>
            </form>
          </div>
        </body>
        </html>
      `);
    }
  }

  site.views = Number(site.views || 0) + 1;
  saveDB(db);
  res.type("html").send(site.html);
});

/* DOWNLOAD RAW HTML EXPORT */
app.get("/site/:slug/download", (req, res) => {
  const db = getDB();
  const site = db.sites.find((s) => s.slug === req.params.slug);
  if (!site) return res.status(404).send("Not Found");
  res.setHeader("Content-Disposition", `attachment; filename="${site.slug}.html"`);
  res.type("html").send(site.html);
});

/* =========================================================
   3. USER VAULT (CRUD, STATS & DUPLICATE)
========================================================= */

app.get("/dashboard", (req, res) => {
  const user = getLoggedUser(req);
  if (!user && !isLoggedAdmin(req)) return res.redirect("/create");

  res.send(
    page(
      "My Vault",
      `
<main class="container">
  <div class="section-title">MY PROJECT VAULT</div>

  <div class="cyber-card" style="text-align:left">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
      <h3 style="margin:0; font-family:'Orbitron'">AUTHOR: ${escapeHTML(user ? user.username : "ADMIN")}</h3>
      <a href="/create" class="btn-nav">+ NEW SITE</a>
    </div>
    <p style="color:#777; font-size:12px; margin-bottom:20px">Protected by Real-Time Anti-Theft Isolation.</p>
    
    <div id="vaultSites"></div>
  </div>
</main>
`,
      `
<script>
async function loadVault(){
  const r = await fetch("/api/user/vault-data");
  const d = await r.json();
  const el = document.getElementById("vaultSites");
  if(!d.sites || d.sites.length === 0){
    el.innerHTML = "<p style='color:#777'>No hosted sites found. Create your first site!</p>";
    return;
  }
  el.innerHTML = d.sites.map(s => \`
    <div style="padding:14px; border:1px solid rgba(255,255,255,0.12); border-radius:14px; margin-bottom:12px; background:rgba(0,0,0,0.6)">
      <div style="display:flex; justify-content:space-between; align-items:flex-start">
        <div>
          <h4 style="color:#ffffff; margin:0; font-size:16px">\${s.title}</h4>
          <p style="font-size:11px; color:#777; margin:4px 0">/site/\${s.slug} | Views: \${s.views || 0} \${s.sitePassword ? ' | 🔒 Password Protected' : ''}</p>
          <p style="font-size:12px; color:#aaa">\${s.bio || 'No bio provided'}</p>
        </div>
      </div>
      <div style="display:flex; gap:6px; margin-top:12px; flex-wrap:wrap">
        <a href="/site/\${s.slug}" target="_blank" class="btn-nav">VISIT</a>
        <a href="/site/\${s.slug}/download" class="btn-nav">DOWNLOAD</a>
        <button onclick="cloneSite('\${s.id}')" class="btn-nav">CLONE</button>
        <button onclick="deleteSite('\${s.id}')" class="btn-nav" style="border-color:#ff4444; color:#ff4444">DELETE</button>
      </div>
    </div>
  \`).join("");
}

async function cloneSite(id){
  const r = await fetch("/api/sites/" + id + "/clone", { method:"POST" });
  const d = await r.json();
  if(d.ok){
    alert("Site Cloned Successfully!");
    loadVault();
  }
}

async function deleteSite(id){
  if(!confirm("Permanently delete this project?")) return;
  await fetch("/api/sites/" + id, { method:"DELETE" });
  loadVault();
}

loadVault();
</script>
`
    )
  );
});

app.get("/api/user/vault-data", requireUser, (req, res) => {
  const db = getDB();
  const mySites = db.sites.filter((s) => s.userId === req.user.id || req.user.role === "admin");
  res.json({ ok: true, sites: mySites });
});

app.post("/api/sites/:id/clone", requireUser, (req, res) => {
  const db = getDB();
  const site = db.sites.find((s) => s.id === req.params.id);
  if (!site) return res.status(404).json({ ok: false, error: "Site not found" });
  if (site.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Access Denied" });
  }

  const newSlug = site.slug + "-copy-" + genId(3);
  const cloned = {
    ...site,
    id: genId(),
    title: site.title + " (Copy)",
    slug: newSlug,
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.sites.unshift(cloned);
  saveDB(db);
  res.json({ ok: true, site: cloned });
});

app.delete("/api/sites/:id", requireUser, (req, res) => {
  const db = getDB();
  const site = db.sites.find((s) => s.id === req.params.id);
  if (!site) return res.status(404).json({ ok: false, error: "Site not found" });
  if (site.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Access Denied" });
  }
  db.sites = db.sites.filter((s) => s.id !== req.params.id);
  saveDB(db);
  addLog("SITE_DELETE", `Site deleted: ${site.title} by ${req.user.username}`);
  res.json({ ok: true });
});

/* =========================================================
   4. POSTS & FOLDER DISCUSSIONS
========================================================= */

app.get("/posts", (req, res) => {
  const db = getDB();
  const folders = db.folders || ["General"];
  const posts = db.posts || [];

  res.send(
    page(
      "Posts & Articles",
      `
<main class="container">
  <div class="section-title">POSTS & GUIDES</div>

  <!-- FOLDER TABS -->
  <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:12px; margin-bottom:15px">
    <button class="btn-nav" onclick="filterFolder('ALL')">ALL</button>
    ${folders.map((f) => `<button class="btn-nav" onclick="filterFolder('${escapeHTML(f)}')">${escapeHTML(f)}</button>`).join("")}
  </div>

  <div id="postsList">
    ${posts
      .map(
        (p) => `
      <div class="rotating-border-box post-card" data-folder="${escapeHTML(p.folder || "General")}">
        <div class="cyber-card" style="text-align:left">
          <div style="display:flex; justify-content:space-between; align-items:center">
            <span class="card-top-pill">${p.pinned ? "📌 " : ""}${escapeHTML(p.folder || "General")}</span>
            <span style="font-size:11px; color:#777">${new Date(p.createdAt).toLocaleDateString()}</span>
          </div>
          <h3 style="font-family:'Orbitron'; font-size:17px; margin:8px 0">${escapeHTML(p.title)}</h3>
          <p style="color:#888; font-size:13px; margin-bottom:14px">${escapeHTML(p.bio || p.content.slice(0, 100))}</p>
          <div style="display:flex; justify-content:space-between; align-items:center">
            <a href="/post/${encodeURIComponent(p.slug)}" class="btn-cyber-view" style="width:auto; padding:8px 18px">READ ARTICLE</a>
            <span style="font-size:12px; color:#666">❤️ ${p.likes || 0} | 💬 ${(p.comments || []).length}</span>
          </div>
        </div>
      </div>
    `
      )
      .join("")}
  </div>
</main>
`,
      `
<script>
function filterFolder(name){
  const cards = document.querySelectorAll(".post-card");
  cards.forEach(c => {
    if(name === 'ALL' || c.getAttribute('data-folder') === name){
      c.style.display = 'block';
    } else {
      c.style.display = 'none';
    }
  });
}
</script>
`
    )
  );
});

app.get("/post/:slug", (req, res) => {
  const db = getDB();
  const post = db.posts.find((p) => p.slug === req.params.slug);
  if (!post) return res.status(404).send("Post Not Found");

  post.views = Number(post.views || 0) + 1;
  saveDB(db);

  res.send(
    page(
      post.title,
      `
<main class="container">
  <div class="cyber-card" style="text-align:left">
    <div class="card-top-pill">${post.pinned ? "📌 " : ""}${escapeHTML(post.folder || "General")}</div>
    <h1 style="font-family:'Orbitron'; font-size:22px; margin:10px 0">${escapeHTML(post.title)}</h1>
    <p style="color:#777; font-size:12px; margin-bottom:16px">Published by ${escapeHTML(post.author)} on ${new Date(post.createdAt).toLocaleDateString()} | Views: ${post.views}</p>
    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:15px 0">
    <div style="color:#ccc; font-size:15px; line-height:1.75; white-space:pre-wrap">${escapeHTML(post.content)}</div>

    <div style="margin-top:25px; display:flex; gap:10px">
      <button onclick="likePost('${post.id}')" class="btn-nav">❤️ LIKE (<span id="likeCount">${post.likes || 0}</span>)</button>
    </div>

    <!-- COMMENTS SECTION -->
    <div style="margin-top:30px; border-top:1px solid rgba(255,255,255,0.1); padding-top:20px">
      <h3 style="font-family:'Orbitron'; font-size:14px; margin-bottom:12px">COMMENTS</h3>
      
      <div id="commentsList" style="margin-bottom:15px">
        ${(post.comments || [])
          .map(
            (c) => `
          <div style="background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:10px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.06)">
            <div style="font-size:11px; color:#888; font-weight:bold">${escapeHTML(c.author)} <span style="font-weight:normal; font-size:10px">${new Date(c.date).toLocaleDateString()}</span></div>
            <div style="font-size:13px; color:#ddd; margin-top:4px">${escapeHTML(c.text)}</div>
          </div>
        `
          )
          .join("")}
      </div>

      <div class="field">
        <input id="cAuthor" placeholder="Your Name">
      </div>
      <div class="field">
        <input id="cText" placeholder="Write a comment...">
      </div>
      <button onclick="submitComment('${post.id}')" class="btn-cyber-view" style="font-size:11px; padding:10px">ADD COMMENT</button>
    </div>
  </div>
</main>
`,
      `
<script>
async function likePost(id){
  const r = await fetch("/api/posts/" + id + "/like", { method:"POST" });
  const d = await r.json();
  if(d.ok){
    document.getElementById("likeCount").textContent = d.likes;
  }
}

async function submitComment(id){
  const author = document.getElementById("cAuthor").value.trim() || "Anonymous";
  const text = document.getElementById("cText").value.trim();
  if(!text) return;

  const r = await fetch("/api/posts/" + id + "/comment", {
    method:"POST",
    headers:{ "Content-Type": "application/json" },
    body:JSON.stringify({ author, text })
  });
  const d = await r.json();
  if(d.ok) location.reload();
}
</script>
`
    )
  );
});

app.post("/api/posts/:id/like", (req, res) => {
  const db = getDB();
  const post = db.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ ok: false });
  post.likes = (post.likes || 0) + 1;
  saveDB(db);
  res.json({ ok: true, likes: post.likes });
});

app.post("/api/posts/:id/comment", (req, res) => {
  const db = getDB();
  const post = db.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ ok: false });
  post.comments = post.comments || [];
  post.comments.push({
    id: genId(6),
    author: req.body.author || "Anonymous",
    text: req.body.text || "",
    date: new Date().toISOString()
  });
  saveDB(db);
  res.json({ ok: true });
});

/* =========================================================
   5. SUPER ADMIN MASTER SUITE (FULL CONTROL)
========================================================= */

app.get("/admin", (req, res) => {
  res.send(
    page(
      "Admin Control Master",
      `
<main class="container" style="width:min(600px, 94%)">
  <div class="section-title">ADMIN MASTER SUITE</div>

  <div id="adminLoginBox" class="cyber-card" style="text-align:left">
    <div class="field">
      <label>SUPER ADMIN PASSWORD</label>
      <input id="adKey" type="password" placeholder="••••••••">
    </div>
    <div id="adNotice" class="notice"></div>
    <button id="adBtn" class="btn-cyber-view">LOGIN ADMIN</button>
  </div>

  <div id="adminDashBox" style="display:none">

    <!-- ADMIN TABS -->
    <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:12px; margin-bottom:15px">
      <button class="btn-nav" onclick="showTab('tab-stats')">STATS</button>
      <button class="btn-nav" onclick="showTab('tab-users')">USERS</button>
      <button class="btn-nav" onclick="showTab('tab-sites')">SITES</button>
      <button class="btn-nav" onclick="showTab('tab-posts')">POSTS</button>
      <button class="btn-nav" onclick="showTab('tab-settings')">SETTINGS</button>
      <button class="btn-nav" onclick="showTab('tab-logs')">LOGS</button>
    </div>

    <!-- TAB 1: STATS & QUICK ACTIONS -->
    <div id="tab-stats" class="admin-tab cyber-card" style="text-align:left">
      <h3 style="font-family:'Orbitron'; font-size:16px; margin-bottom:15px">SYSTEM OVERVIEW</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px">
        <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:14px; text-align:center">
          <div style="font-size:24px; font-weight:bold" id="statUsers">0</div>
          <div style="font-size:11px; color:#888">TOTAL USERS</div>
        </div>
        <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:14px; text-align:center">
          <div style="font-size:24px; font-weight:bold" id="statSites">0</div>
          <div style="font-size:11px; color:#888">TOTAL WEBSITES</div>
        </div>
      </div>
      <a href="/api/admin/backup-download" class="btn-cyber-view" style="margin-bottom:10px">DOWNLOAD FULL JSON BACKUP</a>
    </div>

    <!-- TAB 2: USER MANAGEMENT -->
    <div id="tab-users" class="admin-tab cyber-card" style="text-align:left; display:none">
      <h3 style="font-family:'Orbitron'; font-size:16px; margin-bottom:15px">USER MANAGEMENT</h3>
      <div id="usersListContent"></div>
    </div>

    <!-- TAB 3: SITE ASSIGN & SITES LIST -->
    <div id="tab-sites" class="admin-tab cyber-card" style="text-align:left; display:none">
      <h3 style="font-family:'Orbitron'; font-size:16px; margin-bottom:15px">ASSIGN HTML CODE TO USER</h3>
      <div class="field">
        <label>TARGET USER</label>
        <select id="targetUserSelect"></select>
      </div>
      <div class="field"><input id="asTitle" placeholder="Custom Website Title"></div>
      <div class="field"><input id="asSlug" placeholder="custom-unique-slug"></div>
      <div class="field"><textarea id="asHtml" placeholder="<!DOCTYPE html>..."></textarea></div>
      <button onclick="assignHtmlToUser()" class="btn-cyber-view" style="margin-bottom:25px">ASSIGN CODE TO USER</button>

      <h3 style="font-family:'Orbitron'; font-size:16px; margin-bottom:15px">ALL HOSTED WEBSITES</h3>
      <div id="sitesListContent"></div>
    </div>

    <!-- TAB 4: POSTS & FOLDERS -->
    <div id="tab-posts" class="admin-tab cyber-card" style="text-align:left; display:none">
      <h3 style="font-family:'Orbitron'; font-size:16px; margin-bottom:15px">CREATE FOLDER POST</h3>
      <div class="field">
        <label>FOLDER</label>
        <select id="adPostFolder"></select>
      </div>
      <div class="field"><input id="adNewFolderName" placeholder="Or create new folder name..."></div>
      <div class="field"><input id="adPostTitle" placeholder="Article Title"></div>
      <div class="field"><input id="adPostBio" placeholder="Short Summary"></div>
      <div class="field"><textarea id="adPostContent" placeholder="Full Article Content..."></textarea></div>
      <button onclick="publishFolderPost()" class="btn-cyber-view">PUBLISH POST</button>
    </div>

    <!-- TAB 5: SYSTEM SETTINGS -->
    <div id="tab-settings" class="admin-tab cyber-card" style="text-align:left; display:none">
      <h3 style="font-family:'Orbitron'; font-size:16px; margin-bottom:15px">GLOBAL SYSTEM SETTINGS</h3>
      <div class="field">
        <label>SITE BRAND NAME</label>
        <input id="setSiteName">
      </div>
      <div class="field">
        <label>GLOBAL ANNOUNCEMENT MESSAGE</label>
        <input id="setAnnouncement">
      </div>
      <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#aaa; margin-bottom:15px; cursor:pointer">
        <input type="checkbox" id="setAnnounceActive" style="width:16px; height:16px"> Enable Announcement Bar
      </label>
      <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#ff4444; margin-bottom:20px; cursor:pointer">
        <input type="checkbox" id="setMaintenance" style="width:16px; height:16px"> ⚠️ Enable Maintenance Mode
      </label>
      <button onclick="saveSystemSettings()" class="btn-cyber-view">SAVE SETTINGS</button>
    </div>

    <!-- TAB 6: AUDIT LOGS -->
    <div id="tab-logs" class="admin-tab cyber-card" style="text-align:left; display:none">
      <h3 style="font-family:'Orbitron'; font-size:16px; margin-bottom:15px">SYSTEM AUDIT TRAIL</h3>
      <div id="logsContent" style="font-family:monospace; font-size:11px; max-height:300px; overflow-y:auto"></div>
    </div>

  </div>
</main>
`,
      `
<script>
function showTab(id){
  document.querySelectorAll(".admin-tab").forEach(t => t.style.display = "none");
  document.getElementById(id).style.display = "block";
}

document.getElementById("adBtn").onclick = async () => {
  const p = document.getElementById("adKey").value;
  try{
    const r = await fetch("/api/admin/auth", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ password: p })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error("Incorrect Password");
    document.getElementById("adminLoginBox").style.display = "none";
    document.getElementById("adminDashBox").style.display = "block";
    loadAdminStats();
  }catch(e){
    const not = document.getElementById("adNotice");
    not.textContent = e.message;
    not.className = "notice show";
  }
};

async function loadAdminStats(){
  const r = await fetch("/api/admin/all");
  const d = await r.json();

  document.getElementById("statUsers").textContent = d.users.length;
  document.getElementById("statSites").textContent = d.sites.length;

  document.getElementById("targetUserSelect").innerHTML = d.users.map(u => \`<option value="\${u.id}">\${u.username}</option>\`).join("");
  document.getElementById("adPostFolder").innerHTML = d.folders.map(f => \`<option value="\${f}">\${f}</option>\`).join("");

  // Populate Users
  document.getElementById("usersListContent").innerHTML = d.users.map(u => \`
    <div style="padding:10px; border:1px solid rgba(255,255,255,0.08); border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center">
      <div>
        <strong>\${u.username}</strong> \${u.banned ? '<span style="color:#ff4444">(BANNED)</span>' : ''}
        <div style="font-size:10px; color:#777">ID: \${u.id}</div>
      </div>
      <div style="display:flex; gap:4px">
        <button onclick="toggleBan('\${u.id}')" class="btn-nav" style="padding:4px 8px; font-size:10px">\${u.banned ? 'UNBAN' : 'BAN'}</button>
        <button onclick="adminDelUser('\${u.id}')" class="btn-nav" style="padding:4px 8px; font-size:10px; color:#ff4444">DEL</button>
      </div>
    </div>
  \`).join("");

  // Populate Sites
  document.getElementById("sitesListContent").innerHTML = d.sites.map(s => \`
    <div style="padding:10px; border:1px solid rgba(255,255,255,0.08); border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center">
      <div>
        <strong>\${s.title}</strong> (/site/\${s.slug})
        <div style="font-size:10px; color:#777">Author: \${s.authorName} | Views: \${s.views || 0}</div>
      </div>
      <button onclick="adminDelSite('\${s.id}')" class="btn-nav" style="padding:4px 8px; font-size:10px; color:#ff4444">DEL</button>
    </div>
  \`).join("");

  // Settings
  if(d.settings){
    document.getElementById("setSiteName").value = d.settings.siteName || "";
    document.getElementById("setAnnouncement").value = d.settings.announcement || "";
    document.getElementById("setAnnounceActive").checked = Boolean(d.settings.announcementActive);
    document.getElementById("setMaintenance").checked = Boolean(d.settings.maintenanceMode);
  }

  // Logs
  document.getElementById("logsContent").innerHTML = (d.logs || []).map(l => \`
    <div style="margin-bottom:4px; color:#aaa">[\${new Date(l.timestamp).toLocaleTimeString()}] \${l.action}: \${l.details}</div>
  \`).join("");
}

async function publishFolderPost(){
  const customFolder = document.getElementById("adNewFolderName").value.trim();
  const folder = customFolder || document.getElementById("adPostFolder").value;
  const title = document.getElementById("adPostTitle").value.trim();
  const bio = document.getElementById("adPostBio").value.trim();
  const content = document.getElementById("adPostContent").value.trim();

  await fetch("/api/admin/folder-post", {
    method:"POST",
    headers:{ "Content-Type": "application/json" },
    body:JSON.stringify({ folder, title, bio, content })
  });
  alert("Post published successfully!");
  loadAdminStats();
}

async function assignHtmlToUser(){
  await fetch("/api/admin/assign", {
    method:"POST",
    headers:{ "Content-Type": "application/json" },
    body:JSON.stringify({
      userId: document.getElementById("targetUserSelect").value,
      title: document.getElementById("asTitle").value,
      slug: document.getElementById("asSlug").value,
      html: document.getElementById("asHtml").value
    })
  });
  alert("HTML assigned to user successfully!");
  loadAdminStats();
}

async function toggleBan(id){
  await fetch("/api/admin/user/" + id + "/ban", { method:"POST" });
  loadAdminStats();
}

async function adminDelUser(id){
  if(confirm("Delete user and all their sites?")){
    await fetch("/api/admin/user/" + id, { method:"DELETE" });
    loadAdminStats();
  }
}

async function adminDelSite(id){
  if(confirm("Delete site?")){
    await fetch("/api/sites/" + id, { method:"DELETE" });
    loadAdminStats();
  }
}

async function saveSystemSettings(){
  await fetch("/api/admin/settings", {
    method:"POST",
    headers:{ "Content-Type": "application/json" },
    body:JSON.stringify({
      siteName: document.getElementById("setSiteName").value,
      announcement: document.getElementById("setAnnouncement").value,
      announcementActive: document.getElementById("setAnnounceActive").checked,
      maintenanceMode: document.getElementById("setMaintenance").checked
    })
  });
  alert("Settings Saved!");
  loadAdminStats();
}
</script>
`
    )
  );
});

/* ADMIN API ENDPOINTS */
app.post("/api/admin/auth", (req, res) => {
  if (req.body.password !== ADMIN_PASS) return res.status(401).json({ ok: false });
  const tok = genId(24);
  adminSessions.set(tok, true);
  res.cookie("sj_admin_token", tok, { httpOnly: true, path: "/" });
  addLog("ADMIN_LOGIN", "Super Admin logged in");
  res.json({ ok: true });
});

app.get("/api/admin/all", requireAdmin, (req, res) => {
  const db = getDB();
  res.json({
    ok: true,
    users: db.users,
    sites: db.sites,
    folders: db.folders,
    settings: db.settings,
    logs: db.logs
  });
});

app.post("/api/admin/settings", requireAdmin, (req, res) => {
  const db = getDB();
  db.settings = { ...db.settings, ...req.body };
  saveDB(db);
  addLog("SETTINGS_UPDATE", "System settings updated");
  res.json({ ok: true });
});

app.get("/api/admin/backup-download", requireAdmin, (req, res) => {
  const db = getDB();
  res.setHeader("Content-Disposition", `attachment; filename="sjemar-backup-${Date.now()}.json"`);
  res.type("json").send(JSON.stringify(db, null, 2));
});

app.post("/api/admin/user/:id/ban", requireAdmin, (req, res) => {
  const db = getDB();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ ok: false });
  user.banned = !user.banned;
  saveDB(db);
  addLog("USER_BAN_TOGGLE", `User ${user.username} ban set to ${user.banned}`);
  res.json({ ok: true, banned: user.banned });
});

app.delete("/api/admin/user/:id", requireAdmin, (req, res) => {
  const db = getDB();
  db.users = db.users.filter((u) => u.id !== req.params.id);
  db.sites = db.sites.filter((s) => s.userId !== req.params.id);
  saveDB(db);
  addLog("USER_DELETE", `User ID ${req.params.id} deleted`);
  res.json({ ok: true });
});

app.post("/api/admin/folder-post", requireAdmin, (req, res) => {
  const { folder, title, bio, content } = req.body;
  const db = getDB();

  if (folder && !db.folders.includes(folder)) {
    db.folders.push(folder);
  }

  db.posts.unshift({
    id: genId(),
    folder: folder || "General",
    title: title || "New Post",
    slug: slugify(title) || "post-" + genId(4),
    bio: bio || "",
    content: content || "",
    author: "Admin",
    views: 0,
    likes: 0,
    pinned: false,
    comments: [],
    createdAt: new Date().toISOString()
  });

  saveDB(db);
  addLog("ADMIN_POST_CREATE", `Post created: ${title}`);
  res.json({ ok: true });
});

app.post("/api/admin/assign", requireAdmin, (req, res) => {
  const { userId, title, html } = req.body;
  const db = getDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });

  const slug = slugify(req.body.slug || title) || "assigned-" + genId(4);

  db.sites.unshift({
    id: genId(),
    userId: user.id,
    authorName: user.username,
    title: title || "Assigned Website",
    slug,
    bio: "Assigned by Administrator",
    html: html || "<h1>Site Assigned by Admin</h1>",
    rawHtml: html,
    published: true,
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  saveDB(db);
  addLog("ADMIN_SITE_ASSIGN", `Assigned site ${title} to ${user.username}`);
  res.json({ ok: true });
});

/* =========================================================
   404 NOT FOUND & SERVER BOOTSTRAP
========================================================= */

app.use((req, res) => {
  res.status(404).send(
    page(
      "404",
      `<div class="container" style="text-align:center; padding:80px 0">
        <h1 style="font-family:'Orbitron'; font-size:32px">404 NOT FOUND</h1>
        <p style="color:#777; margin:10px 0 20px">The requested page or hosted site does not exist.</p>
        <a href="/" class="btn-cyber-view" style="display:inline-flex; width:auto">RETURN HOME</a>
      </div>`
    )
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`=================================================`);
  console.log(`🚀 SJEMAR Next-Gen OLED Engine Online!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🛡️ Admin Access Pass: ${ADMIN_PASS}`);
  console.log(`=================================================`);
});
