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

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

/* =========================================================
   DATABASE INITIALIZATION & PERSISTENCE
========================================================= */

const initialDB = {
  users: [],
  sites: [],
  notes: [],
  images: [],
  posts: [
    {
      id: "p1",
      title: "iOS OLED Glassmorphism Engine Release",
      slug: "ios-oled-glass-release",
      content: "Welcome to the next-generation OLED black glass hosting architecture. Zero color noise, pure contrast, anti-theft code isolation.",
      author: "Admin",
      views: 0,
      createdAt: new Date().toISOString()
    }
  ],
  versions: [
    { id: "v1", title: "Version 1.0", subtitle: "TikTok Facebook video download", link: "#" },
    { id: "v2", title: "Version 2.0", subtitle: "temp mail website", link: "#" },
    { id: "v3", title: "Version 2.5", subtitle: "bio link website", link: "#" },
    { id: "v4", title: "Version 3.0", subtitle: "ai website", link: "#" },
    { id: "v5", title: "Version 3.5", subtitle: "UID checker", link: "#" },
    { id: "v6", title: "Version 4.0", subtitle: "Background Removal Tool", link: "#" },
    { id: "v7", title: "Version 4.5", subtitle: "hosting code", link: "#" },
    { id: "v8", title: "Version 5.0", subtitle: "Premium Resources", link: "#" },
    { id: "v9", title: "Version 5.5", subtitle: "Html security", link: "#" }
  ],
  resources: [
    { id: "r1", section: "RESOURCE", ribbon: "FREE", badge: "100% Free", title: "Free Website", icon: "triangle", slug: "create" },
    { id: "r2", section: "APK", ribbon: "APK", badge: "100% Free", title: "apk building", icon: "valorant", slug: "create" },
    { id: "r3", section: "REVIEW", ribbon: "REV", badge: "100% Free", title: "review project", icon: "spinner", slug: "posts" }
  ]
};

function initDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialDB, null, 2), "utf8");
    }
  } catch (err) {
    console.error("DB Init Error:", err);
  }
}

function getDB() {
  try {
    initDB();
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      return { ...initialDB, ...data };
    }
  } catch (err) {
    console.error("DB Read Error:", err);
  }
  return { ...initialDB };
}

function saveDB(db) {
  try {
    initDB();
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("DB Save Error:", err);
  }
}

initDB();

/* =========================================================
   SECURITY & AUTH HELPERS
========================================================= */

function genId(len = 10) {
  return crypto.randomBytes(len).toString("hex");
}

function hashPassword(pass) {
  return crypto.createHash("sha256").update(String(pass) + "OLED_SALT_2026").digest("hex");
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
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
  const token = getCookie(req, "oled_user_token");
  if (!token) return null;
  const sess = userSessions.get(token);
  if (!sess) return null;
  if (Date.now() - sess.created > (sess.saveMe ? 30 : 1) * 24 * 60 * 60 * 1000) {
    userSessions.delete(token);
    return null;
  }
  const db = getDB();
  return db.users.find((u) => u.id === sess.userId) || null;
}

function isLoggedAdmin(req) {
  const token = getCookie(req, "oled_admin_token");
  if (!token) return false;
  return adminSessions.has(token);
}

function requireAdmin(req, res, next) {
  if (!isLoggedAdmin(req)) return res.status(401).json({ ok: false, error: "Unauthorized Admin" });
  next();
}

function requireUser(req, res, next) {
  const user = getLoggedUser(req);
  if (!user && !isLoggedAdmin(req)) return res.status(401).json({ ok: false, error: "Login required" });
  req.user = user || { id: "admin", username: "Admin", role: "admin" };
  next();
}

/* =========================================================
   iOS OLED DARK GLASS ENGINE (MONOCHROME BLACK & WHITE)
========================================================= */

function page(title, content, script = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#000000">
<title>${escapeHTML(title)} — AURA FFX</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=SF+Pro+Display:wght@400;500;600;700&display=swap" rel="stylesheet">

<style>
:root {
  --bg: #000000;
  --white: #ffffff;
  --glass-bg: rgba(18, 18, 18, 0.65);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-hover: rgba(255, 255, 255, 0.22);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  background: var(--bg);
  color: var(--white);
  min-height: 100vh;
  overflow-x: hidden;
}

body {
  background:
    radial-gradient(circle at 50% -10%, rgba(255, 255, 255, 0.08), transparent 45%),
    radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.03), transparent 50%),
    #000000;
  display: flex;
  flex-direction: column;
}

/* ROTATING BORDER ANIMATION */
@keyframes spinBorder {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.rotating-border-box {
  position: relative;
  border-radius: 24px;
  background: rgba(10, 10, 10, 0.7);
  padding: 1px;
  overflow: hidden;
  margin-bottom: 25px;
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
    transparent 120deg,
    rgba(255, 255, 255, 0.85) 180deg,
    transparent 240deg,
    transparent 360deg
  );
  animation: spinBorder 4s linear infinite;
  z-index: 0;
  pointer-events: none;
}

.cyber-card {
  position: relative;
  z-index: 1;
  background: rgba(12, 12, 12, 0.85);
  backdrop-filter: blur(35px) saturate(180%);
  -webkit-backdrop-filter: blur(35px) saturate(180%);
  border-radius: 23px;
  padding: 30px 20px 22px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

/* CORNER RIBBON - MONOCHROME */
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
  letter-spacing: 0.5px;
  margin-bottom: 15px;
}

.card-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #ffffff;
  margin-bottom: 20px;
  text-transform: lowercase;
}

.card-icon-wrap {
  height: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 22px;
}

/* PURE WHITE BUTTON */
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
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
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
  transform: translateY(-1px);
}

/* NAVBAR */
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  height: 64px;
  display: flex;
  align-items: center;
}
.nav-inner {
  width: min(500px, 92%);
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
  font-size: 16px;
  letter-spacing: 2px;
  color: #fff;
  text-decoration: none;
}
.brand-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: #ffffff;
  display: grid;
  place-items: center;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
}
.brand span {
  color: #888888;
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
  transition: .2s;
}
.btn-nav:hover {
  background: #ffffff;
  color: #000000;
}

/* APP CONTAINER */
.container {
  width: min(480px, 92%);
  margin: 0 auto;
  padding: 25px 0 60px;
  position: relative;
  z-index: 1;
}

.section-title {
  text-align: center;
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  letter-spacing: 3px;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  margin: 35px 0 18px;
  text-transform: uppercase;
}

/* SOCIAL CONNECT BAR (MONOCHROME OLED) */
.social-wrap {
  background: rgba(12, 12, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  backdrop-filter: blur(35px);
  margin-bottom: 30px;
}
.social-icon {
  width: 44px;
  height: 44px;
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
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  transform: scale(1.1);
}

/* WEATHER CARD */
.weather-card {
  background: rgba(12, 12, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 24px;
  backdrop-filter: blur(35px);
}
.weather-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.weather-temp {
  font-family: 'Orbitron', sans-serif;
  font-size: 38px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -1px;
}
.weather-loc-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  margin-top: 6px;
}
.weather-status {
  text-align: right;
  font-family: 'Orbitron', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #ffffff;
}
.weather-bottom {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 14px;
  color: #888888;
  font-size: 13px;
  font-weight: 600;
}

/* MODAL - OLED FROSTED */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(25px);
  z-index: 1000;
  display: none;
  place-items: center;
  padding: 20px;
}
.modal-overlay.active { display: grid; }
.modal-box {
  width: min(380px, 100%);
  background: rgba(12, 12, 12, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 22px;
  padding: 22px;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.9);
  max-height: 85vh;
  overflow-y: auto;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
}
.modal-head h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 15px;
  letter-spacing: 2px;
  color: #ffffff;
}
.modal-close {
  background: transparent;
  border: none;
  color: #777;
  font-size: 24px;
  cursor: pointer;
}
.modal-close:hover { color: #fff; }
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
.version-info h4 {
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  color: #ffffff;
  margin-bottom: 2px;
}
.version-info p {
  font-size: 11px;
  color: #777;
}

/* FORM ELEMENTS */
.field { margin-bottom: 16px; }
label { display: block; font-size: 11px; font-weight: 700; color: #888888; margin-bottom: 6px; letter-spacing: 1px; text-transform: uppercase; }
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
textarea { min-height: 220px; font-family: monospace; font-size: 13px; }

.notice {
  display: none;
  padding: 14px;
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

.footer {
  text-align: center;
  padding: 30px 0;
  color: #555555;
  font-size: 11px;
  letter-spacing: 1px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: auto;
}
</style>
</head>
<body>

<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="brand">
      <div class="brand-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#000"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13.5h-13L12 6.5z"/></svg>
      </div>
      AURA <span>FFX</span>
    </a>
    <div style="display:flex; gap:8px">
      <button class="btn-nav" onclick="openVersionModal()">VERSIONS</button>
      <a href="/dashboard" class="btn-nav">VAULT</a>
    </div>
  </div>
</nav>

${content}

<footer class="footer">
  &copy; 2026 AURA FFX. ALL RIGHTS RESERVED.
</footer>

<!-- VERSION POPUP MODAL -->
<div class="modal-overlay" id="versionModal">
  <div class="modal-box">
    <div class="modal-head">
      <h2>VERSIONS</h2>
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
        <div class="version-info">
          <h4>\${v.title}</h4>
          <p>\${v.subtitle}</p>
        </div>
        <a href="\${v.link || '#'}" class="btn-nav" style="padding:4px 10px; font-size:10px">VIEW</a>
      </div>
    \`).join("");
  }catch{}
}
</script>

${script}

</body>
</html>`;
}

/* =========================================================
   1. HOME PAGE (OLED BLACK GLASS + ROTATING BORDERS)
========================================================= */

app.get("/", (req, res) => {
  const db = getDB();
  const resources = db.resources || [];

  res.send(
    page(
      "Home",
      `
<main class="container">
  
  <!-- DYNAMIC RESOURCE CARDS WITH ROTATING BORDER -->
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
          VIEW
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </a>
      </div>
    </div>
  `
    )
    .join("")}

  <!-- CONNECT SOCIALS (MONOCHROME OLED) -->
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
    <a href="https://instagram.com" target="_blank" class="social-icon">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
    </a>
    <a href="https://discord.com" target="_blank" class="social-icon">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
    </a>
  </div>

  <!-- WEATHER WIDGET -->
  <div class="section-title">WEATHER</div>
  <div class="weather-card">
    <div class="weather-top">
      <div>
        <div class="weather-temp">30.9°C</div>
        <div class="weather-loc-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          BANGLADESH
        </div>
      </div>
      <div class="weather-status">
        <svg width="45" height="45" viewBox="0 0 64 64">
          <circle cx="38" cy="26" r="14" fill="#ffffff"/>
          <path d="M20 44h28a10 10 0 0 0 0-20 14 14 0 0 0-27-2A10 10 0 0 0 20 44z" fill="#777777"/>
        </svg>
        <div style="margin-top:4px">CLEAR SKY</div>
      </div>
    </div>
    <div class="weather-bottom">
      <div>💨 Wind 12km/h</div>
      <div>💧 Humidity 45%</div>
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
   2. HTML WEB HOSTING & CREATION (ANTI-THEFT)
========================================================= */

app.get("/create", (req, res) => {
  res.send(
    page(
      "Deploy Website",
      `
<main class="container">
  <div class="section-title">DEPLOY HTML CODE</div>

  <div class="cyber-card" style="text-align:left">
    <div class="field">
      <label>Website Title *</label>
      <input id="siteTitle" placeholder="My Website Title">
    </div>
    <div class="field">
      <label>Custom URL Slug</label>
      <input id="siteSlug" placeholder="my-app">
    </div>
    <div class="field">
      <label>HTML Code *</label>
      <textarea id="siteHtml" placeholder="<!DOCTYPE html>&#10;<html>&#10;<body><h1>Hello OLED Glass</h1></body>&#10;</html>"></textarea>
    </div>

    <div id="authPrompt" style="padding:15px; border:1px solid rgba(255,255,255,0.12); border-radius:14px; background:rgba(0,0,0,0.5); margin:15px 0">
      <label style="color:#ffffff">PROTECT CODE (USERNAME & PASSWORD)</label>
      <p style="font-size:11px; color:#777; margin-bottom:10px">Only you will be able to edit/delete this code.</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
        <input id="qUser" placeholder="Choose Username">
        <input id="qPass" type="password" placeholder="Choose Password">
      </div>
    </div>

    <div id="pubNotice" class="notice"></div>

    <button id="pubBtn" class="btn-cyber-view" style="margin-top:10px">PUBLISH PROTECTED WEBSITE</button>

    <div id="pubResult" class="result">
      <strong style="color:#fff">Website Live!</strong>
      <code id="pubUrl"></code>
      <a id="pubOpen" target="_blank" class="btn-cyber-view" style="margin-top:10px">OPEN LIVE WEBSITE</a>
    </div>
  </div>
</main>
`,
      `
<script>
document.getElementById("pubBtn").onclick = async () => {
  const title = document.getElementById("siteTitle").value.trim();
  const slug = document.getElementById("siteSlug").value.trim();
  const html = document.getElementById("siteHtml").value.trim();
  const quickUser = document.getElementById("qUser").value.trim();
  const quickPass = document.getElementById("qPass").value.trim();
  const notice = document.getElementById("pubNotice");

  if(!title || !html){
    notice.textContent = "Title and HTML code are required!";
    notice.className = "notice show";
    return;
  }

  try{
    const r = await fetch("/api/publish", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ title, slug, html, quickUser, quickPass })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Publish failed");

    document.getElementById("pubUrl").textContent = d.site.url;
    document.getElementById("pubOpen").href = d.site.url;
    document.getElementById("pubResult").className = "result show";
    notice.textContent = "Website secured and published!";
    notice.className = "notice show";
  }catch(e){
    notice.textContent = e.message;
    notice.className = "notice show";
  }
};
</script>
`
    )
  );
});

app.post("/api/publish", (req, res) => {
  let user = getLoggedUser(req);
  const db = getDB();

  if (!user && req.body.quickUser && req.body.quickPass) {
    const qU = String(req.body.quickUser).trim();
    const qP = String(req.body.quickPass).trim();

    let exist = db.users.find((u) => u.username.toLowerCase() === qU.toLowerCase());
    if (exist) {
      if (exist.password !== hashPassword(qP)) {
        return res.status(401).json({ ok: false, error: "Username exists. Password incorrect!" });
      }
      user = exist;
    } else {
      user = { id: genId(), username: qU, password: hashPassword(qP), createdAt: new Date().toISOString() };
      db.users.push(user);
      saveDB(db);
    }

    const tok = genId(20);
    userSessions.set(tok, { userId: user.id, saveMe: true, created: Date.now() });
    res.cookie("oled_user_token", tok, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });
  }

  const title = String(req.body.title || "").trim();
  const html = req.body.html;
  let slug = slugify(req.body.slug || title) || "site-" + genId(4);

  if (!title || !html) return res.status(400).json({ ok: false, error: "Title and HTML required" });

  if (db.sites.some((s) => s.slug === slug)) {
    slug = slug + "-" + genId(3);
  }

  const site = {
    id: genId(),
    userId: user ? user.id : "admin",
    authorName: user ? user.username : "Admin",
    title,
    slug,
    html,
    published: true,
    views: 0,
    createdAt: new Date().toISOString()
  };

  db.sites.unshift(site);
  saveDB(db);

  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");

  res.json({ ok: true, site: { url: `${proto}://${host}/site/${site.slug}` } });
});

app.get("/site/:slug", (req, res) => {
  const db = getDB();
  const site = db.sites.find((s) => s.slug === req.params.slug);
  if (!site || site.published === false) return res.status(404).send("Site Not Found");
  site.views = Number(site.views || 0) + 1;
  saveDB(db);
  res.type("html").send(site.html);
});

/* =========================================================
   3. POSTS / ARTICLES (iOS OLED GLASS LIST)
========================================================= */

app.get("/posts", (req, res) => {
  const db = getDB();
  const posts = db.posts || [];

  res.send(
    page(
      "Posts & Articles",
      `
<main class="container">
  <div class="section-title">PROJECT REVIEWS & POSTS</div>

  ${posts
    .map(
      (p) => `
    <div class="rotating-border-box">
      <div class="cyber-card" style="text-align:left">
        <div class="card-top-pill">${new Date(p.createdAt).toLocaleDateString()}</div>
        <h3 style="font-family:'Orbitron'; font-size:18px; margin-bottom:8px">${escapeHTML(p.title)}</h3>
        <p style="color:#888; font-size:13px; line-height:1.6; margin-bottom:15px">${escapeHTML(p.content.slice(0, 140))}...</p>
        <a href="/post/${encodeURIComponent(p.slug)}" class="btn-cyber-view">READ FULL POST</a>
      </div>
    </div>
  `
    )
    .join("")}
</main>
`
    )
  );
});

app.get("/post/:slug", (req, res) => {
  const db = getDB();
  const post = db.posts.find((p) => p.slug === req.params.slug);
  if (!post) return res.status(404).send("Post Not Found");

  res.send(
    page(
      post.title,
      `
<main class="container">
  <div class="cyber-card" style="text-align:left">
    <div class="card-top-pill">${new Date(post.createdAt).toLocaleDateString()}</div>
    <h1 style="font-family:'Orbitron'; font-size:24px; margin:10px 0">${escapeHTML(post.title)}</h1>
    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:18px 0">
    <div style="color:#cccccc; font-size:15px; line-height:1.75; white-space:pre-wrap">${escapeHTML(post.content)}</div>
  </div>
</main>
`
    )
  );
});

/* =========================================================
   4. USER VAULT & AUTHENTICATION
========================================================= */

app.get("/dashboard", (req, res) => {
  const user = getLoggedUser(req);
  if (!user && !isLoggedAdmin(req)) return res.redirect("/login");

  res.send(
    page(
      "User Vault",
      `
<main class="container">
  <div class="section-title">MY SECURED VAULT</div>

  <div class="cyber-card" style="text-align:left">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
      <h3 style="margin:0; font-family:'Orbitron'">WELCOME, ${escapeHTML(user ? user.username : "ADMIN")}</h3>
      <button onclick="logout()" class="btn-nav" style="background:#ffffff; color:#000000">LOGOUT</button>
    </div>
    <p style="color:#777; font-size:12px; margin-bottom:20px">Protected by Anti-Theft Isolation.</p>
    
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
  el.innerHTML = d.sites.map(s => \`
    <div style="padding:14px; border:1px solid rgba(255,255,255,0.12); border-radius:14px; margin-bottom:10px; background:rgba(0,0,0,0.5)">
      <h4 style="color:#ffffff; margin:0">\${s.title}</h4>
      <p style="font-size:11px; color:#777">/site/\${s.slug} | Views: \${s.views || 0}</p>
      <div style="display:flex; gap:8px; margin-top:10px">
        <a href="/site/\${s.slug}" target="_blank" class="btn-nav">VISIT</a>
        <button onclick="delSite('\${s.id}')" class="btn-nav" style="border-color:rgba(255,255,255,0.3)">DELETE</button>
      </div>
    </div>
  \`).join("") || "<p style='color:#777'>No hosted sites found.</p>";
}
async function delSite(id){
  if(!confirm("Permanently delete this project?")) return;
  await fetch("/api/sites/" + id, { method:"DELETE" });
  loadVault();
}
async function logout(){
  await fetch("/api/auth/logout", { method:"POST" });
  location.href = "/";
}
loadVault();
</script>
`
    )
  );
});

app.get("/login", (req, res) => {
  res.send(
    page(
      "Sign In",
      `
<main class="container">
  <div class="section-title">SIGN IN</div>
  <div class="cyber-card" style="text-align:left">
    <div class="field">
      <label>USERNAME</label>
      <input id="uName" placeholder="Enter username">
    </div>
    <div class="field">
      <label>PASSWORD</label>
      <input id="uPass" type="password" placeholder="••••••••">
    </div>
    <div id="logNotice" class="notice"></div>
    <button id="logBtn" class="btn-cyber-view" style="margin-top:10px">SIGN IN</button>
  </div>
</main>
`,
      `
<script>
document.getElementById("logBtn").onclick = async () => {
  const u = document.getElementById("uName").value.trim();
  const p = document.getElementById("uPass").value.trim();
  const not = document.getElementById("logNotice");
  try{
    const r = await fetch("/api/auth/login", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ username: u, password: p, saveMe: true })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Login failed");
    location.href = "/dashboard";
  }catch(e){
    not.textContent = e.message;
    not.className = "notice show";
  }
};
</script>
`
    )
  );
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const db = getDB();
  const user = db.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase() && u.password === hashPassword(password));
  if (!user) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const tok = genId(20);
  userSessions.set(tok, { userId: user.id, saveMe: true, created: Date.now() });
  res.cookie("oled_user_token", tok, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });
  res.json({ ok: true });
});

app.post("/api/auth/logout", (req, res) => {
  const tok = getCookie(req, "oled_user_token");
  if (tok) userSessions.delete(tok);
  res.clearCookie("oled_user_token", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/user/vault-data", requireUser, (req, res) => {
  const db = getDB();
  const mySites = db.sites.filter((s) => s.userId === req.user.id || req.user.role === "admin");
  res.json({ ok: true, sites: mySites });
});

app.delete("/api/sites/:id", requireUser, (req, res) => {
  const db = getDB();
  const site = db.sites.find((s) => s.id === req.params.id);
  if (!site) return res.status(404).json({ ok: false, error: "Not found" });
  if (site.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Access Denied: You do not own this site" });
  }
  db.sites = db.sites.filter((s) => s.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

/* =========================================================
   5. SUPER ADMIN CONTROL ROOM (WITH HTML ASSIGN)
========================================================= */

app.get("/admin", (req, res) => {
  res.send(
    page(
      "Admin Control",
      `
<main class="container">
  <div class="section-title">ADMIN MASTER ROOM</div>

  <div id="adminLoginBox" class="cyber-card" style="text-align:left">
    <div class="field">
      <label>ADMIN PASSWORD</label>
      <input id="adKey" type="password" placeholder="••••••••">
    </div>
    <div id="adNotice" class="notice"></div>
    <button id="adBtn" class="btn-cyber-view">LOGIN ADMIN</button>
  </div>

  <div id="adminDashBox" style="display:none">
    
    <!-- ASSIGN HTML TO USER -->
    <div class="cyber-card" style="text-align:left; margin-bottom:20px">
      <div class="section-title" style="margin-top:0">ASSIGN HTML TO USER</div>
      <div class="field">
        <label>TARGET USER</label>
        <select id="targetUserSelect"></select>
      </div>
      <div class="field">
        <label>SITE TITLE</label>
        <input id="asTitle" placeholder="Custom Website Title">
      </div>
      <div class="field">
        <label>URL SLUG</label>
        <input id="asSlug" placeholder="assigned-app">
      </div>
      <div class="field">
        <label>HTML CODE</label>
        <textarea id="asHtml" placeholder="<!DOCTYPE html>..."></textarea>
      </div>
      <button onclick="assignHtmlToUser()" class="btn-cyber-view">GIVE HTML TO USER</button>
    </div>

    <!-- PUBLISH POST -->
    <div class="cyber-card" style="text-align:left; margin-bottom:20px">
      <div class="section-title" style="margin-top:0">PUBLISH ARTICLE / POST</div>
      <div class="field"><input id="adPostT" placeholder="Post Title"></div>
      <div class="field"><textarea id="adPostC" placeholder="Content..."></textarea></div>
      <button onclick="publishAdminPost()" class="btn-cyber-view">PUBLISH POST</button>
    </div>

    <!-- ALL USERS & SITES -->
    <div class="cyber-card" style="text-align:left">
      <div class="section-title" style="margin-top:0">SYSTEM USERS & SITES</div>
      <div id="adminDataList"></div>
    </div>

  </div>
</main>
`,
      `
<script>
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

  document.getElementById("targetUserSelect").innerHTML = d.users.map(u => \`<option value="\${u.id}">\${u.username}</option>\`).join("");

  document.getElementById("adminDataList").innerHTML = \`
    <h4 style="color:#ffffff; margin-bottom:10px">Users (\${d.users.length})</h4>
    \${d.users.map(u => \`<div style="font-size:12px; color:#888; margin-bottom:4px">\${u.username} (ID: \${u.id})</div>\`).join("")}
    
    <h4 style="color:#ffffff; margin:18px 0 10px">Websites (\${d.sites.length})</h4>
    \${d.sites.map(s => \`
      <div style="padding:10px; border:1px solid rgba(255,255,255,0.1); border-radius:10px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center">
        <div>\${s.title} (/site/\${s.slug}) - <i>\${s.authorName}</i></div>
        <button onclick="adminDelSite('\${s.id}')" class="btn-nav">DEL</button>
      </div>
    \`).join("")}
  \`;
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
  alert("HTML assigned successfully!");
  loadAdminStats();
}

async function publishAdminPost(){
  await fetch("/api/admin/posts", {
    method:"POST",
    headers:{ "Content-Type": "application/json" },
    body:JSON.stringify({
      title: document.getElementById("adPostT").value,
      content: document.getElementById("adPostC").value
    })
  });
  alert("Post published!");
}

async function adminDelSite(id){
  if(confirm("Delete site?")){
    await fetch("/api/sites/" + id, { method:"DELETE" });
    loadAdminStats();
  }
}
</script>
`
    )
  );
});

app.post("/api/admin/auth", (req, res) => {
  if (req.body.password !== ADMIN_PASS) return res.status(401).json({ ok: false });
  const tok = genId(20);
  adminSessions.set(tok, true);
  res.cookie("oled_admin_token", tok, { httpOnly: true, path: "/" });
  res.json({ ok: true });
});

app.get("/api/admin/all", requireAdmin, (req, res) => {
  const db = getDB();
  res.json({ ok: true, users: db.users, sites: db.sites });
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
    title: title || "Assigned App",
    slug,
    html: html || "<h1>Site Assigned by Admin</h1>",
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
    title: title || "New Post",
    slug: slugify(title) || "post-" + genId(4),
    content: content || "",
    author: "Admin",
    views: 0,
    createdAt: new Date().toISOString()
  });
  saveDB(db);
  res.json({ ok: true });
});

/* =========================================================
   START SERVER
========================================================= */

app.use((req, res) => {
  res.status(404).send(
    page(
      "404",
      `<div class="container" style="text-align:center; padding:80px 0"><h1>404 NOT FOUND</h1><a href="/" class="btn-cyber-view" style="display:inline-flex; width:auto; margin-top:20px">RETURN HOME</a></div>`
    )
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`iOS OLED Dark Glass Engine Running on port ${PORT}`);
});
