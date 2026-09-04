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
   DATABASE INITIALIZATION
========================================================= */

const initialDB = {
  users: [],
  sites: [],
  notes: [],
  images: [],
  posts: [],
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
   SECURITY & SESSIONS
========================================================= */

function genId(len = 10) {
  return crypto.randomBytes(len).toString("hex");
}

function hashPassword(pass) {
  return crypto.createHash("sha256").update(String(pass) + "AURA_SALT_2026").digest("hex");
}

function slugify(text) {
  return String(text || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

function escapeHTML(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
  const token = getCookie(req, "aura_user_token");
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
  const token = getCookie(req, "aura_admin_token");
  if (!token) return false;
  return adminSessions.has(token);
}

function requireAdmin(req, res, next) {
  if (!isLoggedAdmin(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized Admin" });
  }
  next();
}

function requireUser(req, res, next) {
  const user = getLoggedUser(req);
  if (!user && !isLoggedAdmin(req)) {
    return res.status(401).json({ ok: false, error: "Please log in first" });
  }
  req.user = user || { id: "admin", username: "Super Admin", role: "admin" };
  next();
}

/* =========================================================
   AURA FFX CYBER DESIGN TEMPLATE
========================================================= */

function page(title, content, script = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#030712">
<title>${escapeHTML(title)} — AURA FFX</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">

<style>
:root{
  --cyan: #00f2fe;
  --cyan-glow: rgba(0, 242, 254, 0.45);
  --blue-dark: #030814;
  --card-bg: rgba(6, 18, 38, 0.65);
  --border-cyan: rgba(0, 242, 254, 0.3);
}

*{
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Rajdhani', -apple-system, sans-serif;
  -webkit-tap-highlight-color: transparent;
}

html, body{
  background: #020611;
  color: #fff;
  min-height: 100vh;
  overflow-x: hidden;
}

/* CYBER GLOW BACKGROUND & MOON */
body{
  background: 
    radial-gradient(circle at 80% 20%, rgba(0, 242, 254, 0.08), transparent 30%),
    radial-gradient(circle at 20% 80%, rgba(79, 172, 254, 0.06), transparent 40%),
    linear-gradient(180deg, #020611 0%, #030a1c 100%);
  display: flex;
  flex-direction: column;
}

.moon-orb{
  position: absolute;
  top: 150px;
  right: 5%;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #2a3a52, #101926 80%);
  box-shadow: 0 0 45px rgba(0, 242, 254, 0.15), inset -8px -8px 15px rgba(0,0,0,0.8);
  opacity: 0.65;
  pointer-events: none;
  z-index: 0;
}
.moon-crater1{
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #172435;
  top: 35%;
  left: 25%;
}
.moon-crater2{
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #172435;
  top: 60%;
  left: 55%;
}

/* NAVBAR */
.nav{
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(3, 10, 25, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 242, 254, 0.15);
  height: 62px;
  display: flex;
  align-items: center;
}
.nav-inner{
  width: min(500px, 92%);
  margin: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.brand{
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
.brand-icon{
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00f2fe, #4facfe);
  display: grid;
  place-items: center;
  box-shadow: 0 0 15px var(--cyan);
}
.brand span{
  color: var(--cyan);
  text-shadow: 0 0 10px var(--cyan-glow);
}

.nav-actions{
  display: flex;
  gap: 8px;
}
.btn-nav{
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid var(--border-cyan);
  background: rgba(0, 242, 254, 0.08);
  color: var(--cyan);
  transition: .2s;
  cursor: pointer;
}
.btn-nav:hover{
  background: var(--cyan);
  color: #000;
  box-shadow: 0 0 15px var(--cyan);
}

/* APP CONTAINER */
.container{
  width: min(480px, 92%);
  margin: 0 auto;
  padding: 25px 0 60px;
  position: relative;
  z-index: 1;
}

/* SECTION HEADER */
.section-title{
  text-align: center;
  font-family: 'Orbitron', sans-serif;
  font-size: 14px;
  letter-spacing: 3px;
  color: var(--cyan);
  text-shadow: 0 0 10px var(--cyan-glow);
  margin: 35px 0 18px;
  text-transform: uppercase;
}

/* CYBER GLASS CARD */
.cyber-card{
  position: relative;
  overflow: hidden;
  background: var(--card-bg);
  border: 1px solid var(--border-cyan);
  border-radius: 20px;
  padding: 30px 20px 22px;
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(0, 242, 254, 0.05);
  margin-bottom: 25px;
  text-align: center;
  transition: transform 0.25s ease, border-color 0.25s ease;
}
.cyber-card:hover{
  transform: translateY(-3px);
  border-color: rgba(0, 242, 254, 0.6);
  box-shadow: 0 20px 50px rgba(0, 242, 254, 0.15);
}

/* CORNER RIBBON */
.corner-ribbon{
  position: absolute;
  top: 18px;
  left: -32px;
  transform: rotate(-45deg);
  background: linear-gradient(90deg, #00f2fe, #4facfe);
  color: #000;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 9px;
  letter-spacing: 1px;
  padding: 4px 35px;
  box-shadow: 0 0 15px rgba(0, 242, 254, 0.6);
  text-transform: uppercase;
}

.card-top-pill{
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(0, 242, 254, 0.1);
  border: 1px solid rgba(0, 242, 254, 0.25);
  color: #a0d8ef;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 15px;
}

.card-title{
  font-family: 'Orbitron', sans-serif;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #fff;
  margin-bottom: 20px;
  text-transform: lowercase;
}

.card-icon-wrap{
  height: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 25px;
}

/* GLOWING ACTION BUTTON */
.btn-cyber-view{
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  color: #000;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 25px rgba(0, 242, 254, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  transition: .2s;
}
.btn-cyber-view:hover{
  box-shadow: 0 0 35px rgba(0, 242, 254, 0.8);
  transform: scale(1.02);
}

/* CONNECT SOCIAL BAR */
.social-wrap{
  background: var(--card-bg);
  border: 1px solid var(--border-cyan);
  border-radius: 20px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  backdrop-filter: blur(25px);
  margin-bottom: 30px;
}
.social-icon{
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid;
  transition: .25s;
  text-decoration: none;
}
.social-icon.yt{ border-color: #ff0033; box-shadow: 0 0 15px rgba(255, 0, 51, 0.4); color: #ff0033; }
.social-icon.fb{ border-color: #1877f2; box-shadow: 0 0 15px rgba(24, 119, 242, 0.4); color: #1877f2; }
.social-icon.tt{ border-color: #00f2fe; box-shadow: 0 0 15px rgba(0, 242, 254, 0.4); color: #00f2fe; }
.social-icon.ig{ border-color: #e1306c; box-shadow: 0 0 15px rgba(225, 48, 108, 0.4); color: #e1306c; }
.social-icon.dc{ border-color: #5865f2; box-shadow: 0 0 15px rgba(88, 101, 242, 0.4); color: #5865f2; }
.social-icon:hover{ transform: scale(1.12); }

/* WEATHER CARD */
.weather-card{
  background: var(--card-bg);
  border: 1px solid var(--border-cyan);
  border-radius: 24px;
  padding: 24px;
  backdrop-filter: blur(25px);
  position: relative;
}
.weather-top{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.weather-temp{
  font-family: 'Orbitron', sans-serif;
  font-size: 38px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -1px;
}
.weather-loc-badge{
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(0, 242, 254, 0.08);
  border: 1px solid rgba(0, 242, 254, 0.2);
  color: #a0d8ef;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-top: 6px;
}
.weather-status{
  text-align: right;
}
.weather-status span{
  font-family: 'Orbitron', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--cyan);
  text-shadow: 0 0 8px var(--cyan-glow);
}
.weather-bottom{
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(0, 242, 254, 0.12);
  padding-top: 14px;
  color: #7b9ab8;
  font-size: 13px;
  font-weight: 600;
}

/* POPUP MODAL (VERSION) */
.modal-overlay{
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(15px);
  z-index: 1000;
  display: none;
  place-items: center;
  padding: 20px;
}
.modal-overlay.active{ display: grid; }
.modal-box{
  width: min(380px, 100%);
  background: #040c1e;
  border: 1px solid var(--border-cyan);
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 0 50px rgba(0, 242, 254, 0.25);
  position: relative;
  max-height: 85vh;
  overflow-y: auto;
}
.modal-head{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(0, 242, 254, 0.15);
  padding-bottom: 12px;
}
.modal-head h2{
  font-family: 'Orbitron', sans-serif;
  font-size: 15px;
  letter-spacing: 2px;
  color: #fff;
  margin: 0;
}
.modal-close{
  background: transparent;
  border: none;
  color: #777;
  font-size: 20px;
  cursor: pointer;
}
.modal-close:hover{ color: var(--cyan); }
.version-item{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: rgba(0, 242, 254, 0.04);
  border: 1px solid rgba(0, 242, 254, 0.12);
  border-radius: 12px;
  margin-bottom: 10px;
}
.version-info h4{
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  color: var(--cyan);
  margin-bottom: 2px;
}
.version-info p{
  font-size: 11px;
  color: #888;
}
.btn-v-view{
  padding: 6px 14px;
  background: rgba(0, 242, 254, 0.1);
  border: 1px solid var(--border-cyan);
  color: #fff;
  font-family: 'Orbitron', sans-serif;
  font-size: 10px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
}
.btn-v-view:hover{
  background: var(--cyan);
  color: #000;
}

/* FORM STYLING */
.field{ margin-bottom: 16px; }
label{ display: block; font-size: 12px; font-weight: 700; color: #8ba9c9; margin-bottom: 6px; letter-spacing: 1px; }
input, textarea, select{
  width: 100%;
  padding: 13px 15px;
  border-radius: 12px;
  background: rgba(2, 8, 20, 0.8);
  border: 1px solid var(--border-cyan);
  color: #fff;
  font-size: 14px;
  outline: none;
}
input:focus, textarea:focus, select:focus{
  border-color: var(--cyan);
  box-shadow: 0 0 15px var(--cyan-glow);
}
textarea{ min-height: 250px; font-family: monospace; font-size: 13px; }

.notice{
  display: none;
  padding: 14px;
  border-radius: 12px;
  background: rgba(0, 242, 254, 0.08);
  border: 1px solid var(--border-cyan);
  color: var(--cyan);
  font-size: 13px;
  margin: 14px 0;
}
.notice.show{ display: block; }
.result{
  display: none;
  padding: 16px;
  border-radius: 14px;
  background: rgba(0,0,0,0.8);
  border: 1px solid var(--border-cyan);
  margin-top: 15px;
}
.result.show{ display: block; }
.result code{
  display: block;
  padding: 10px;
  margin: 8px 0;
  background: #000;
  border-radius: 8px;
  color: var(--cyan);
  font-family: monospace;
  font-size: 13px;
  word-break: break-all;
}

/* FOOTER */
.footer{
  text-align: center;
  padding: 30px 0;
  color: #4a6382;
  font-size: 11px;
  letter-spacing: 1px;
  border-top: 1px solid rgba(0, 242, 254, 0.1);
  margin-top: auto;
}
</style>
</head>
<body>

<div class="moon-orb">
  <div class="moon-crater1"></div>
  <div class="moon-crater2"></div>
</div>

<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="brand">
      <div class="brand-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#000"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13.5h-13L12 6.5z"/></svg>
      </div>
      AURA <span>FFX</span>
    </a>
    <div class="nav-actions">
      <button class="btn-nav" onclick="openVersionModal()">VERSIONS</button>
      <a href="/dashboard" class="btn-nav" id="navDash">VAULT</a>
    </div>
  </div>
</nav>

${content}

<footer class="footer">
  &copy; 2026 AURA FFX. All Rights Reserved.
</footer>

<!-- VERSION POPUP MODAL -->
<div class="modal-overlay" id="versionModal">
  <div class="modal-box">
    <div class="modal-head">
      <h2>VERSION</h2>
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
        <a href="\${v.link || '#'}" class="btn-v-view">VIEW</a>
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
   1. HOME PAGE (AURA FFX SCREENSHOT REPLICA)
========================================================= */

app.get("/", (req, res) => {
  const db = getDB();
  const resources = db.resources || [];

  res.send(
    page(
      "Home",
      `
<main class="container">
  
  <!-- DYNAMIC RESOURCE CARDS -->
  ${resources
    .map(
      (r) => `
    <div class="section-title">${escapeHTML(r.section)}</div>
    <div class="cyber-card">
      <div class="corner-ribbon">${escapeHTML(r.ribbon)}</div>
      <div class="card-top-pill">${escapeHTML(r.badge)}</div>
      <h3 class="card-title">${escapeHTML(r.title)}</h3>
      
      <div class="card-icon-wrap">
        ${
          r.icon === "valorant"
            ? `<svg width="45" height="45" viewBox="0 0 100 100" fill="var(--cyan)"><path d="M50 85L85 20H65L50 60L35 20H15L50 85Z"/></svg>`
            : r.icon === "spinner"
            ? `<svg width="35" height="35" viewBox="0 0 50 50" stroke="var(--cyan)" fill="none" stroke-width="4"><circle cx="25" cy="25" r="20" stroke-dasharray="80" stroke-dashoffset="60"></circle></svg>`
            : `<svg width="40" height="40" viewBox="0 0 100 100" fill="var(--cyan)"><polygon points="50 15, 85 80, 15 80"/></svg>`
        }
      </div>

      <a href="/${encodeURIComponent(r.slug)}" class="btn-cyber-view">
        VIEW
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      </a>
    </div>
  `
    )
    .join("")}

  <!-- CONNECT SOCIALS -->
  <div class="section-title">CONNECT</div>
  <div class="social-wrap">
    <a href="https://youtube.com" target="_blank" class="social-icon yt">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/></svg>
    </a>
    <a href="https://facebook.com" target="_blank" class="social-icon fb">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.595 0 9 1.583 9 4.615V8z"/></svg>
    </a>
    <a href="https://tiktok.com" target="_blank" class="social-icon tt">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
    </a>
    <a href="https://instagram.com" target="_blank" class="social-icon ig">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
    </a>
    <a href="https://discord.com" target="_blank" class="social-icon dc">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
    </a>
  </div>

  <!-- WEATHER WIDGET -->
  <div class="section-title">WEATHER</div>
  <div class="weather-card">
    <div class="weather-top">
      <div>
        <div class="weather-temp" id="wTemp">30.9°C</div>
        <div class="weather-loc-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--cyan)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span id="wLoc">BANGLADESH</span>
        </div>
      </div>
      <div class="weather-status">
        <svg width="45" height="45" viewBox="0 0 64 64">
          <circle cx="38" cy="26" r="14" fill="#ffb703"/>
          <path d="M20 44h28a10 10 0 0 0 0-20 14 14 0 0 0-27-2A10 10 0 0 0 20 44z" fill="#ffffff"/>
        </svg>
        <div style="margin-top:4px"><span id="wCond">CLEAR SKY</span></div>
      </div>
    </div>
    <div class="weather-bottom">
      <div>💨 Wind <span id="wWind">12km/h</span></div>
      <div>💧 Humidity <span id="wHum">45%</span></div>
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
   2. HTML WEB HOSTING & CREATOR (ANTI-THEFT)
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
      <label>WEBSITE TITLE *</label>
      <input id="siteTitle" placeholder="My Cyber Project">
    </div>
    <div class="field">
      <label>CUSTOM URL SLUG (OPTIONAL)</label>
      <input id="siteSlug" placeholder="project-2026">
    </div>
    <div class="field">
      <label>HTML CODE *</label>
      <textarea id="siteHtml" placeholder="<!DOCTYPE html>&#10;<html>&#10;<body><h1>Hello World</h1></body>&#10;</html>"></textarea>
    </div>

    <div id="authPrompt" style="padding:15px; border:1px solid var(--border-cyan); border-radius:14px; background:rgba(0,0,0,0.5); margin:15px 0">
      <label style="color:var(--cyan)">SECURE OWNERSHIP (USER & PASS)</label>
      <p style="font-size:11px; color:#777; margin-bottom:10px">Set credentials so nobody can steal or edit your site.</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
        <input id="qUser" placeholder="Username">
        <input id="qPass" type="password" placeholder="Password">
      </div>
    </div>

    <div id="pubNotice" class="notice"></div>

    <button id="pubBtn" class="btn-cyber-view" style="margin-top:10px">PUBLISH SECURE HTML</button>

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
        return res.status(401).json({ ok: false, error: "Username already exists with different password" });
      }
      user = exist;
    } else {
      user = { id: genId(), username: qU, password: hashPassword(qP), createdAt: new Date().toISOString() };
      db.users.push(user);
      saveDB(db);
    }

    const tok = genId(20);
    userSessions.set(tok, { userId: user.id, saveMe: true, created: Date.now() });
    res.cookie("aura_user_token", tok, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });
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
   3. USER VAULT & AUTH DASHBOARD
========================================================= */

app.get("/dashboard", (req, res) => {
  const user = getLoggedUser(req);
  if (!user && !isLoggedAdmin(req)) {
    return res.redirect("/login");
  }

  res.send(
    page(
      "User Vault",
      `
<main class="container">
  <div class="section-title">MY PROJECT VAULT</div>

  <div class="cyber-card" style="text-align:left">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
      <h3 style="margin:0; font-family:'Orbitron'">WELCOME, ${escapeHTML(user ? user.username : "ADMIN")}</h3>
      <button onclick="logout()" class="btn-nav" style="border-color:#ff0033; color:#ff0033">LOGOUT</button>
    </div>
    <p style="color:#777; font-size:12px; margin-bottom:20px">Your codes are encrypted and cannot be modified by other users.</p>
    
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
    <div style="padding:12px; border:1px solid var(--border-cyan); border-radius:12px; margin-bottom:10px; background:rgba(0,0,0,0.4)">
      <h4 style="color:var(--cyan); margin:0">\${s.title}</h4>
      <p style="font-size:11px; color:#777">/site/\${s.slug} | Views: \${s.views || 0}</p>
      <div style="display:flex; gap:8px; margin-top:8px">
        <a href="/site/\${s.slug}" target="_blank" class="btn-nav">VISIT</a>
        <button onclick="delSite('\${s.id}')" class="btn-nav" style="border-color:#ff0033; color:#ff0033">DELETE</button>
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
      "User Sign In",
      `
<main class="container">
  <div class="section-title">ACCESS VAULT</div>
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
    <button id="logBtn" class="btn-cyber-view" style="margin-top:10px">UNLOCK VAULT</button>
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
  res.cookie("aura_user_token", tok, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });
  res.json({ ok: true });
});

app.post("/api/auth/logout", (req, res) => {
  const tok = getCookie(req, "aura_user_token");
  if (tok) userSessions.delete(tok);
  res.clearCookie("aura_user_token", { path: "/" });
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
   4. SUPER ADMIN CONTROL ROOM (WITH HTML ASSIGN)
========================================================= */

app.get("/admin", (req, res) => {
  res.send(
    page(
      "Admin Panel",
      `
<main class="container">
  <div class="section-title">ADMIN MASTER ROOM</div>

  <div id="adminLoginBox" class="cyber-card" style="text-align:left">
    <div class="field">
      <label>MASTER ADMIN KEY</label>
      <input id="adKey" type="password" placeholder="••••••••">
    </div>
    <div id="adNotice" class="notice"></div>
    <button id="adBtn" class="btn-cyber-view">LOGIN ADMIN</button>
  </div>

  <div id="adminDashBox" style="display:none">
    <!-- ASSIGN HTML TO USER -->
    <div class="cyber-card" style="text-align:left">
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

    <!-- MANAGE HOME CARDS -->
    <div class="cyber-card" style="text-align:left">
      <div class="section-title" style="margin-top:0">CREATE HOME RESOURCE CARD</div>
      <div class="field"><input id="rcSection" placeholder="Section (e.g. RESOURCE)"></div>
      <div class="field"><input id="rcRibbon" placeholder="Ribbon Text (e.g. FREE)"></div>
      <div class="field"><input id="rcTitle" placeholder="Card Title (e.g. Free Website)"></div>
      <div class="field"><input id="rcSlug" placeholder="Link (e.g. create)"></div>
      <button onclick="addResourceCard()" class="btn-cyber-view">ADD NEW CARD</button>
    </div>

    <!-- ALL USERS & ALL SITES -->
    <div class="cyber-card" style="text-align:left">
      <div class="section-title" style="margin-top:0">ALL USERS & SITES</div>
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
    if(!r.ok || !d.ok) throw new Error("Incorrect Admin Key");
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
    <h4 style="color:var(--cyan); margin-bottom:10px">Registered Users (\${d.users.length})</h4>
    \${d.users.map(u => \`<div style="font-size:12px; color:#aaa; margin-bottom:4px">\${u.username} (ID: \${u.id})</div>\`).join("")}
    
    <h4 style="color:var(--cyan); margin:18px 0 10px">Hosted Sites (\${d.sites.length})</h4>
    \${d.sites.map(s => \`
      <div style="padding:8px; border:1px solid var(--border-cyan); border-radius:8px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center">
        <div>\${s.title} (/site/\${s.slug}) - <i>\${s.authorName}</i></div>
        <button onclick="adminDelSite('\${s.id}')" class="btn-nav" style="color:#ff0033; border-color:#ff0033">DEL</button>
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
  alert("HTML assigned to user successfully!");
  loadAdminStats();
}

async function addResourceCard(){
  await fetch("/api/admin/add-card", {
    method:"POST",
    headers:{ "Content-Type": "application/json" },
    body:JSON.stringify({
      section: document.getElementById("rcSection").value,
      ribbon: document.getElementById("rcRibbon").value,
      title: document.getElementById("rcTitle").value,
      slug: document.getElementById("rcSlug").value
    })
  });
  alert("Home card added!");
  location.href = "/";
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
  res.cookie("aura_admin_token", tok, { httpOnly: true, path: "/" });
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

app.post("/api/admin/add-card", requireAdmin, (req, res) => {
  const { section, ribbon, title, slug } = req.body;
  const db = getDB();
  db.resources.push({
    id: genId(6),
    section: section || "RESOURCE",
    ribbon: ribbon || "FREE",
    badge: "100% Free",
    title: title || "New Project",
    icon: "triangle",
    slug: slug || "create"
  });
  saveDB(db);
  res.json({ ok: true });
});

/* =========================================================
   START SERVER
========================================================= */

app.use((req, res) => {
  res.status(404).send(page("404", `<div class="container" style="text-align:center; padding:80px 0"><h1 style="color:var(--cyan)">404 NOT FOUND</h1><a href="/" class="btn-cyber-view" style="display:inline-flex; width:auto; margin-top:20px">RETURN HOME</a></div>`));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AURA FFX Cyber Engine Running on port ${PORT}`);
});
