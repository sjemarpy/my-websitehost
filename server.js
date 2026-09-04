const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || "py.py.php";

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "database.json");

const MAX_BODY_LIMIT = "30mb";

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({ limit: MAX_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: MAX_BODY_LIMIT }));

/* =========================================================
   DATABASE INITIALIZATION & STORAGE
========================================================= */

const defaultDB = {
  users: [],
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
        users: Array.isArray(parsed.users) ? parsed.users : [],
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
   SECURITY & HELPER FUNCTIONS
========================================================= */

function genId(len = 12) {
  return crypto.randomBytes(len).toString("hex");
}

function genSecret() {
  return crypto.randomBytes(32).toString("hex");
}

function hashPassword(pass) {
  return crypto.createHash("sha256").update(String(pass) + "SJ_SALT_2026").digest("hex");
}

function slugify(val) {
  return String(val || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function validSlug(val) {
  return /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(val);
}

function cleanText(val, max = 100) {
  return String(val || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeHTML(val) {
  return String(val ?? "")
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
   SESSIONS & AUTHENTICATION MIDDLEWARES
========================================================= */

const userSessions = new Map();
const adminSessions = new Map();

function getUserFromSession(req) {
  const token = getCookie(req, "sj_user_token");
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

function isAdmin(req) {
  const token = getCookie(req, "sj_admin_token");
  if (!token) return false;
  const sess = adminSessions.get(token);
  if (!sess) return false;
  if (Date.now() - sess.created > 14 * 24 * 60 * 60 * 1000) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

function requireUser(req, res, next) {
  const user = getUserFromSession(req);
  if (!user && !isAdmin(req)) {
    return res.status(401).json({ ok: false, error: "Please login to your account first" });
  }
  req.user = user || { id: "admin", username: "Admin", role: "admin" };
  next();
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized Admin access" });
  }
  next();
}

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.path.startsWith("/site/")) {
    res.setHeader("Content-Security-Policy", "sandbox allow-scripts allow-forms allow-popups allow-modals");
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
<title>${escapeHTML(title)} — SJEMAR</title>
<style>
*{box-sizing:border-box}
html{background:#000}
body{
  margin:0;
  background:radial-gradient(circle at 50% -20%, rgba(255,255,255,.14), transparent 45%), #000;
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
.nav-user{
  display:flex;
  align-items:center;
  gap:8px;
}
.wrap{
  width:min(1140px,calc(100% - 30px));
  margin:auto;
}
.hero{
  padding:80px 0 45px;
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
  background:#00ffaa;
  box-shadow:0 0 12px #00ffaa;
}
.hero h1{
  margin:20px auto 14px;
  max-width:880px;
  font-size:clamp(38px, 8vw, 80px);
  line-height:.96;
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
.pill.owner{
  border-color:rgba(0,255,170,.3);
  color:#00ffaa;
  background:rgba(0,255,170,.05);
}
.card h3{margin:20px 0 6px;font-size:20px;letter-spacing:-.03em}
.card p{margin:0;color:#888;line-height:1.5;font-size:13px}
.view{display:inline-flex;margin-top:16px;font-size:12px;font-weight:700}
.form{
  max-width:800px;
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
  background:rgba(0,0,0,.65);
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
.checkbox-field{
  display:flex;
  align-items:center;
  gap:10px;
  margin:15px 0;
  cursor:pointer;
  user-select:none;
}
.checkbox-field input{
  width:18px;
  height:18px;
  margin:0;
  cursor:pointer;
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
  .grid, .grid-4{grid-template-columns:1fr 1fr}
}
@media(max-width:550px){
  .grid, .grid-4{grid-template-columns:1fr}
  .nav-menu{display:none}
  .hero h1{font-size:42px}
  .form{padding:18px}
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
      <a href="/create">HTML Web</a>
      <a href="/notepad">Notepad</a>
      <a href="/images">Images</a>
      <a href="/posts">Posts</a>
    </div>
    <div class="nav-user" id="authNav">
      <a href="/login" class="btn">LOGIN</a>
      <a href="/register" class="btn primary">SIGN UP</a>
    </div>
  </div>
</nav>

${content}

<footer class="footer">
  <div class="wrap">
    SJEMAR Engine &copy; 2026 — Protected & Secured Platform
  </div>
</footer>

<script>
async function syncNav(){
  try{
    const r = await fetch("/api/auth/me");
    const d = await r.json();
    const nav = document.getElementById("authNav");
    if(d.ok && d.user){
      nav.innerHTML = \`
        <a href="/dashboard" class="btn">DASHBOARD (\${d.user.username})</a>
        <button onclick="logout()" class="btn danger">LOGOUT</button>
      \`;
    }
  }catch{}
}
async function logout(){
  await fetch("/api/auth/logout", { method:"POST" });
  location.href = "/login";
}
syncNav();
</script>

${script}

</body>
</html>`;
}

/* =========================================================
   1. AUTHENTICATION (REGISTER / LOGIN / LOGOUT / ME)
========================================================= */

app.get("/register", (req, res) => {
  res.send(
    page(
      "Create Account",
      `
<main class="wrap">
  <section class="form" style="max-width:480px; margin:70px auto">
    <div class="badge"><span class="badge-dot"></span> SECURE REGISTRATION</div>
    <h1 style="font-size:36px; margin:16px 0 6px">Create Account</h1>
    <p style="color:#777; margin-bottom:20px">Sign up to host your websites and secure your code.</p>

    <div class="field">
      <label>Choose Username *</label>
      <input id="regUser" placeholder="e.g. cyber_dev" maxlength="30">
    </div>
    <div class="field">
      <label>Choose Password *</label>
      <input id="regPass" type="password" placeholder="••••••••">
    </div>

    <label class="checkbox-field">
      <input type="checkbox" id="saveMeReg" checked>
      <span>Save Me (Keep me logged in on this device)</span>
    </label>

    <div id="regNotice" class="notice"></div>
    <button id="regBtn" class="btn primary" style="width:100%; margin-top:10px">CREATE ACCOUNT</button>
    <p style="text-align:center; color:#777; margin-top:18px; font-size:13px">
      Already have an account? <a href="/login" style="color:#fff; text-decoration:underline">Sign In</a>
    </p>
  </section>
</main>
`,
      `
<script>
document.getElementById("regBtn").onclick = async () => {
  const username = document.getElementById("regUser").value.trim();
  const password = document.getElementById("regPass").value.trim();
  const saveMe = document.getElementById("saveMeReg").checked;
  const notice = document.getElementById("regNotice");

  if(!username || !password){
    notice.textContent = "Username and password are required!";
    notice.className = "notice show";
    return;
  }

  try{
    const r = await fetch("/api/auth/register", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ username, password, saveMe })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Registration failed");

    notice.textContent = "Account created! Redirecting...";
    notice.className = "notice show";
    setTimeout(() => location.href = "/dashboard", 800);
  }catch(err){
    notice.textContent = err.message;
    notice.className = "notice show";
  }
};
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
<main class="wrap">
  <section class="form" style="max-width:480px; margin:70px auto">
    <div class="badge"><span class="badge-dot"></span> WELCOME BACK</div>
    <h1 style="font-size:36px; margin:16px 0 6px">Sign In</h1>
    <p style="color:#777; margin-bottom:20px">Access your protected dashboard and websites.</p>

    <div class="field">
      <label>Username</label>
      <input id="logUser" placeholder="Enter username">
    </div>
    <div class="field">
      <label>Password</label>
      <input id="logPass" type="password" placeholder="••••••••">
    </div>

    <label class="checkbox-field">
      <input type="checkbox" id="saveMeLog" checked>
      <span>Save Me (Remember me)</span>
    </label>

    <div id="logNotice" class="notice"></div>
    <button id="logBtn" class="btn primary" style="width:100%; margin-top:10px">SIGN IN</button>
    <p style="text-align:center; color:#777; margin-top:18px; font-size:13px">
      New here? <a href="/register" style="color:#fff; text-decoration:underline">Create an Account</a>
    </p>
  </section>
</main>
`,
      `
<script>
document.getElementById("logBtn").onclick = async () => {
  const username = document.getElementById("logUser").value.trim();
  const password = document.getElementById("logPass").value.trim();
  const saveMe = document.getElementById("saveMeLog").checked;
  const notice = document.getElementById("logNotice");

  try{
    const r = await fetch("/api/auth/login", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ username, password, saveMe })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Login failed");

    notice.textContent = "Welcome back! Redirecting...";
    notice.className = "notice show";
    setTimeout(() => location.href = "/dashboard", 600);
  }catch(err){
    notice.textContent = err.message;
    notice.className = "notice show";
  }
};
</script>
`
    )
  );
});

/* API AUTH */
app.post("/api/auth/register", (req, res) => {
  const username = cleanText(req.body.username, 30);
  const password = String(req.body.password || "").trim();
  const saveMe = Boolean(req.body.saveMe);

  if (!username || username.length < 3) {
    return res.status(400).json({ ok: false, error: "Username must be at least 3 characters" });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ ok: false, error: "Password must be at least 4 characters" });
  }

  const db = getDB();
  if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ ok: false, error: "Username is already taken! Choose another." });
  }

  const user = {
    id: genId(),
    username,
    password: hashPassword(password),
    role: "user",
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  saveDB(db);

  const token = genSecret();
  userSessions.set(token, { userId: user.id, saveMe, created: Date.now() });

  res.cookie("sj_user_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: (saveMe ? 30 : 1) * 24 * 60 * 60 * 1000,
    path: "/"
  });

  res.json({ ok: true, user: { id: user.id, username: user.username } });
});

app.post("/api/auth/login", (req, res) => {
  const username = cleanText(req.body.username, 30);
  const password = String(req.body.password || "").trim();
  const saveMe = Boolean(req.body.saveMe);

  const db = getDB();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === hashPassword(password)
  );

  if (!user) {
    return res.status(401).json({ ok: false, error: "Invalid username or password" });
  }

  const token = genSecret();
  userSessions.set(token, { userId: user.id, saveMe, created: Date.now() });

  res.cookie("sj_user_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: (saveMe ? 30 : 1) * 24 * 60 * 60 * 1000,
    path: "/"
  });

  res.json({ ok: true, user: { id: user.id, username: user.username } });
});

app.post("/api/auth/logout", (req, res) => {
  const token = getCookie(req, "sj_user_token");
  if (token) userSessions.delete(token);
  res.clearCookie("sj_user_token", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const user = getUserFromSession(req);
  if (user) {
    return res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
  }
  if (isAdmin(req)) {
    return res.json({ ok: true, user: { id: "admin", username: "Super Admin", role: "admin" } });
  }
  res.json({ ok: false });
});

/* =========================================================
   2. USER DASHBOARD (PROTECTED CODES & SITES)
========================================================= */

app.get("/dashboard", (req, res) => {
  const user = getUserFromSession(req);
  if (!user && !isAdmin(req)) {
    return res.redirect("/login");
  }

  res.send(
    page(
      "My Dashboard",
      `
<main class="wrap" style="padding:40px 0">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; flex-wrap:wrap; gap:10px">
    <div>
      <div class="badge"><span class="badge-dot"></span> PERSONAL VAULT</div>
      <h1 style="font-size:36px; margin:8px 0 0">My Projects</h1>
    </div>
    <div class="actions">
      <a href="/create" class="btn primary">+ CREATE HTML WEBSITE</a>
      <a href="/notepad" class="btn">+ NEW NOTE</a>
    </div>
  </div>

  <div id="dashNotice" class="notice"></div>

  <div class="section-head" style="margin-top:30px">
    <h2>My Hosted Websites</h2>
    <p>Only you own and control these sites.</p>
  </div>
  <div id="mySites" class="grid"></div>

  <div class="section-head" style="margin-top:40px">
    <h2>My Notes & Pastes</h2>
  </div>
  <div id="myNotes" class="grid"></div>
</main>
`,
      `
<script>
async function loadMyData(){
  try{
    const r = await fetch("/api/user/my-data");
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Failed to load data");

    const sEl = document.getElementById("mySites");
    sEl.innerHTML = d.sites.map(s => \`
      <div class="card">
        <div class="card-top">
          <span class="pill owner">Owned by You</span>
          <span class="pill">\${s.views || 0} views</span>
        </div>
        <h3>\${s.title}</h3>
        <p style="color:#777">/site/\${s.slug}</p>
        <div class="actions" style="justify-content:flex-start; margin-top:15px">
          <a class="btn primary" target="_blank" href="/site/\${s.slug}">VISIT</a>
          <button class="btn danger" onclick="deleteMySite('\${s.id}')">DELETE</button>
        </div>
      </div>
    \`).join("") || "<div class='card'><p>No websites created yet. <a href='/create' style='text-decoration:underline'>Create one now</a></p></div>";

    const nEl = document.getElementById("myNotes");
    nEl.innerHTML = d.notes.map(n => \`
      <div class="card">
        <div class="card-top">
          <span class="pill owner">Note</span>
          <span class="pill">\${n.lang}</span>
        </div>
        <h3>\${n.title}</h3>
        <div class="actions" style="justify-content:flex-start; margin-top:15px">
          <a class="btn" target="_blank" href="/note/\${n.slug}">VIEW</a>
          <button class="btn danger" onclick="deleteMyNote('\${n.id}')">DELETE</button>
        </div>
      </div>
    \`).join("") || "<div class='card'><p>No notes created yet.</p></div>";
  }catch(e){
    document.getElementById("dashNotice").textContent = e.message;
    document.getElementById("dashNotice").className = "notice show";
  }
}

async function deleteMySite(id){
  if(!confirm("Are you sure you want to permanently delete your site?")) return;
  const r = await fetch("/api/sites/" + id, { method:"DELETE" });
  const d = await r.json();
  if(d.ok) loadMyData();
  else alert(d.error);
}

async function deleteMyNote(id){
  if(!confirm("Permanently delete this note?")) return;
  const r = await fetch("/api/notes/" + id, { method:"DELETE" });
  const d = await r.json();
  if(d.ok) loadMyData();
  else alert(d.error);
}

loadMyData();
</script>
`
    )
  );
});

app.get("/api/user/my-data", requireUser, (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const mySites = db.sites.filter((s) => s.userId === userId || (req.user.role === "admin" && s.userId === "admin"));
  const myNotes = db.notes.filter((n) => n.userId === userId || (req.user.role === "admin" && n.userId === "admin"));
  res.json({ ok: true, sites: mySites, notes: myNotes });
});

/* =========================================================
   3. HTML HOSTING MODULE (ANTI-THEFT BOUND TO USER)
========================================================= */

app.get("/create", (req, res) => {
  res.send(
    page(
      "Create Website — HTML to Link",
      `
<main class="wrap">
  <section class="hero" style="padding-bottom:15px">
    <div class="badge"><span class="badge-dot"></span> SECURE HTML HOSTING</div>
    <h1>Host your HTML.</h1>
    <p>Paste any custom HTML/CSS/JS code to generate a live, protected public link.</p>
  </section>

  <section class="form">
    <div id="authAlert" style="display:none; padding:12px; background:rgba(0,255,170,.08); border:1px solid rgba(0,255,170,.25); border-radius:12px; color:#00ffaa; margin-bottom:15px; font-size:13px">
      You are logged in. This website will be permanently secured under your account.
    </div>

    <div class="field">
      <label>Website Title *</label>
      <input id="title" placeholder="My Awesome Project" maxlength="80">
    </div>
    <div class="field">
      <label>Custom URL Slug (Optional)</label>
      <input id="slug" placeholder="e.g. portfolio-2026" maxlength="50">
    </div>
    <div class="field">
      <label>HTML Code *</label>
      <textarea id="html" placeholder="<!DOCTYPE html>&#10;<html>&#10;<head><title>App</title></head>&#10;<body><h1>Hello World</h1></body>&#10;</html>"></textarea>
    </div>

    <!-- INLINE AUTH IF NOT LOGGED IN -->
    <div id="guestBox" style="padding:18px; border:1px solid rgba(255,255,255,.12); border-radius:18px; background:rgba(0,0,0,.4); margin:18px 0">
      <h3 style="margin:0 0 6px; font-size:16px">Claim Ownership (Username & Password)</h3>
      <p style="color:#777; font-size:12px; margin:0 0 12px">Create credentials so no one else can steal or delete your project.</p>
      <div class="grid" style="grid-template-columns:1fr 1fr; gap:10px">
        <div><input id="quickUser" placeholder="Choose Username"></div>
        <div><input id="quickPass" type="password" placeholder="Choose Password"></div>
      </div>
      <label class="checkbox-field" style="margin-top:10px">
        <input type="checkbox" id="quickSaveMe" checked>
        <span>Save Me (Remember Login)</span>
      </label>
    </div>

    <div id="notice" class="notice"></div>
    <button id="publish" class="btn primary" style="width:100%">PUBLISH SECURE WEBSITE</button>

    <div id="result" class="result">
      <strong>Website Published Successfully!</strong>
      <p>Public URL:</p>
      <code id="url"></code>
      <div class="actions" style="justify-content:flex-start">
        <a id="open" class="btn primary" target="_blank">OPEN LIVE SITE</a>
        <button id="copy" class="btn">COPY LINK</button>
        <a href="/dashboard" class="btn">GO TO MY DASHBOARD</a>
      </div>
    </div>
  </section>
</main>
`,
      `
<script>
let currentUser = null;

async function checkAuth(){
  const r = await fetch("/api/auth/me");
  const d = await r.json();
  if(d.ok && d.user){
    currentUser = d.user;
    document.getElementById("authAlert").style.display = "block";
    document.getElementById("authAlert").textContent = "Logged in as " + d.user.username + ". This project will be locked to your account.";
    document.getElementById("guestBox").style.display = "none";
  }
}
checkAuth();

document.getElementById("publish").onclick = async () => {
  const title = document.getElementById("title").value.trim();
  const slug = document.getElementById("slug").value.trim();
  const html = document.getElementById("html").value.trim();
  const notice = document.getElementById("notice");
  const result = document.getElementById("result");
  const btn = document.getElementById("publish");

  if(!title || !html){
    notice.textContent = "Title and HTML code are required!";
    notice.className = "notice show";
    return;
  }

  let quickUser = "";
  let quickPass = "";
  let saveMe = true;

  if(!currentUser){
    quickUser = document.getElementById("quickUser").value.trim();
    quickPass = document.getElementById("quickPass").value.trim();
    saveMe = document.getElementById("quickSaveMe").checked;
    if(!quickUser || !quickPass){
      notice.textContent = "Please create a Username & Password to protect your site!";
      notice.className = "notice show";
      return;
    }
  }

  btn.disabled = true;
  btn.textContent = "Publishing & Securing...";

  try{
    const r = await fetch("/api/publish", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ title, slug, html, quickUser, quickPass, saveMe })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Publish failed");

    document.getElementById("url").textContent = d.site.url;
    document.getElementById("open").href = d.site.url;
    result.className = "result show";
    notice.textContent = "Website is live and secured!";
    notice.className = "notice show";
  }catch(e){
    notice.textContent = e.message;
    notice.className = "notice show";
  }finally{
    btn.disabled = false;
    btn.textContent = "PUBLISH SECURE WEBSITE";
  }
};

document.getElementById("copy").onclick = async () => {
  await navigator.clipboard.writeText(document.getElementById("url").textContent);
  const b = document.getElementById("copy");
  b.textContent = "COPIED!";
  setTimeout(() => b.textContent = "COPY LINK", 1500);
};
</script>
`
    )
  );
});

app.post("/api/publish", (req, res) => {
  try {
    let user = getUserFromSession(req);
    const db = getDB();

    // If user not logged in, auto-register them with their chosen username/pass
    if (!user && req.body.quickUser && req.body.quickPass) {
      const qUser = cleanText(req.body.quickUser, 30);
      const qPass = String(req.body.quickPass).trim();
      const saveMe = Boolean(req.body.saveMe);

      let existing = db.users.find((u) => u.username.toLowerCase() === qUser.toLowerCase());
      if (existing) {
        if (existing.password !== hashPassword(qPass)) {
          return res.status(401).json({ ok: false, error: "Username exists. Password incorrect!" });
        }
        user = existing;
      } else {
        user = {
          id: genId(),
          username: qUser,
          password: hashPassword(qPass),
          role: "user",
          createdAt: new Date().toISOString()
        };
        db.users.push(user);
        saveDB(db);
      }

      // Log in
      const token = genSecret();
      userSessions.set(token, { userId: user.id, saveMe, created: Date.now() });
      res.cookie("sj_user_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: (saveMe ? 30 : 1) * 24 * 60 * 60 * 1000,
        path: "/"
      });
    }

    if (!user && !isAdmin(req)) {
      return res.status(401).json({ ok: false, error: "Authentication required to publish." });
    }

    const title = cleanText(req.body.title, 80);
    const html = req.body.html;
    let slug = slugify(req.body.slug || title);

    if (!title || !html || typeof html !== "string") {
      return res.status(400).json({ ok: false, error: "Title and HTML required" });
    }

    if (!slug) slug = "site-" + genId(4);
    if (!validSlug(slug)) return res.status(400).json({ ok: false, error: "Invalid URL slug" });

    if (db.sites.some((s) => s.slug === slug)) {
      return res.status(409).json({ ok: false, error: "URL slug already taken. Try another." });
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
        url: `${proto}://${host}/site/${site.slug}`
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
      return res.status(404).send(notFound("Website not found or hidden by author."));
    }
    site.views = Number(site.views || 0) + 1;
    saveDB(db);
    res.type("html").send(site.html);
  } catch (err) {
    res.status(500).send(notFound("Error rendering site"));
  }
});

// ANTI-THEFT: DELETE SITE
app.delete("/api/sites/:id", requireUser, (req, res) => {
  const db = getDB();
  const site = db.sites.find((s) => s.id === req.params.id);
  if (!site) return res.status(404).json({ ok: false, error: "Site not found" });

  if (site.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Anti-Theft Protection: You do not own this site!" });
  }

  db.sites = db.sites.filter((s) => s.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

/* =========================================================
   4. NOTEPAD / PASTEBIN MODULE (BOUND TO USER)
========================================================= */

app.get("/notepad", (req, res) => {
  res.send(
    page(
      "Cloud Notepad & Code Pastebin",
      `
<main class="wrap">
  <section class="hero" style="padding-bottom:15px">
    <div class="badge"><span class="badge-dot"></span> NOTEPAD / PASTEBIN</div>
    <h1>Save notes & code snippets.</h1>
    <p>Share raw code or texts safely with permanent links.</p>
  </section>

  <section class="form">
    <div class="field">
      <label>Note Title *</label>
      <input id="nTitle" placeholder="My Script or Secret Note">
    </div>
    <div class="field">
      <label>Language / Code Type</label>
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
    <button id="nSave" class="btn primary" style="width:100%">SAVE PROTECTED NOTE</button>

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
document.getElementById("nSave").onclick = async () => {
  const title = document.getElementById("nTitle").value.trim();
  const lang = document.getElementById("nLang").value;
  const content = document.getElementById("nContent").value.trim();
  const notice = document.getElementById("nNotice");

  if(!title || !content){
    notice.textContent = "Title and content are required!";
    notice.className = "notice show";
    return;
  }

  try{
    const r = await fetch("/api/notes", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ title, lang, content })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Save error");

    document.getElementById("nUrl").textContent = d.note.url;
    document.getElementById("nRawUrl").textContent = d.note.rawUrl;
    document.getElementById("nOpen").href = d.note.url;
    document.getElementById("nResult").className = "result show";
    notice.textContent = "Note saved under your account!";
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

app.post("/api/notes", (req, res) => {
  const user = getUserFromSession(req);
  const title = cleanText(req.body.title, 100);
  const content = req.body.content;
  const lang = cleanText(req.body.lang, 20) || "text";

  if (!title || !content) return res.status(400).json({ ok: false, error: "Title and content required" });

  const db = getDB();
  const slug = slugify(title) || "note-" + genId(4);
  let finalSlug = slug;
  let count = 1;
  while (db.notes.some((n) => n.slug === finalSlug)) {
    finalSlug = `${slug}-${count++}`;
  }

  const note = {
    id: genId(),
    userId: user ? user.id : "guest",
    authorName: user ? user.username : "Guest",
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
});

app.get("/note/:slug", (req, res) => {
  const db = getDB();
  const note = db.notes.find((n) => n.slug === req.params.slug);
  if (!note || note.published === false) return res.status(404).send(notFound("Note not found"));

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
        <h1 style="margin:0;font-size:26px">${escapeHTML(note.title)}</h1>
        <p style="margin-top:6px;color:#777">Author: ${escapeHTML(note.authorName)} | Language: ${escapeHTML(note.lang)}</p>
      </div>
      <div class="actions">
        <a href="/raw/${encodeURIComponent(note.slug)}" class="btn" target="_blank">RAW</a>
        <button id="copyBtn" class="btn">COPY</button>
      </div>
    </div>
  </div>

  <div class="card" style="background:#050505">
    <pre style="margin:0; overflow-x:auto; font-family:monospace; font-size:14px; line-height:1.6; color:#00ffaa"><code id="codeText">${escapeHTML(note.content)}</code></pre>
  </div>
</main>
`,
      `
<script>
document.getElementById("copyBtn").onclick = async () => {
  await navigator.clipboard.writeText(document.getElementById("codeText").innerText);
  const b = document.getElementById("copyBtn");
  b.textContent = "COPIED!";
  setTimeout(() => b.textContent = "COPY", 1500);
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

// ANTI-THEFT: DELETE NOTE
app.delete("/api/notes/:id", requireUser, (req, res) => {
  const db = getDB();
  const note = db.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ ok: false, error: "Note not found" });

  if (note.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Anti-Theft: You cannot delete someone else's note!" });
  }

  db.notes = db.notes.filter((n) => n.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

/* =========================================================
   5. IMAGE HOSTING MODULE
========================================================= */

app.get("/images", (req, res) => {
  res.send(
    page(
      "Direct Image Hosting",
      `
<main class="wrap">
  <section class="hero" style="padding-bottom:15px">
    <div class="badge"><span class="badge-dot"></span> DIRECT IMAGE LINK GENERATOR</div>
    <h1>Upload Images.</h1>
    <p>Direct CDN image links with zero compression.</p>
  </section>

  <section class="form">
    <div class="field">
      <label>Image Title</label>
      <input id="imgTitle" placeholder="My Screenshot / Photo">
    </div>
    <div class="field">
      <label>Choose File</label>
      <input id="imgFile" type="file" accept="image/*">
    </div>
    <div id="imgNotice" class="notice"></div>
    <button id="imgBtn" class="btn primary" style="width:100%">UPLOAD NOW</button>

    <div id="imgResult" class="result">
      <strong>Image Uploaded!</strong>
      <p>Direct Link:</p>
      <code id="imgLink"></code>
      <div class="actions" style="justify-content:flex-start">
        <a id="imgOpen" class="btn primary" target="_blank">OPEN DIRECT LINK</a>
      </div>
    </div>
  </section>
</main>
`,
      `
<script>
let imgData = "";
let imgMime = "";

document.getElementById("imgFile").onchange = (e) => {
  const f = e.target.files[0];
  if(!f) return;
  imgMime = f.type;
  const reader = new FileReader();
  reader.onload = (ev) => { imgData = ev.target.result; };
  reader.readAsDataURL(f);
};

document.getElementById("imgBtn").onclick = async () => {
  const title = document.getElementById("imgTitle").value.trim();
  const notice = document.getElementById("imgNotice");
  if(!imgData){
    notice.textContent = "Please select an image file first!";
    notice.className = "notice show";
    return;
  }

  try{
    const r = await fetch("/api/images", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ title, data: imgData, mime: imgMime })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Upload failed");

    document.getElementById("imgLink").textContent = d.image.url;
    document.getElementById("imgOpen").href = d.image.url;
    document.getElementById("imgResult").className = "result show";
    notice.textContent = "Image uploaded successfully!";
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

app.post("/api/images", (req, res) => {
  const { title, data, mime } = req.body;
  if (!data || !mime) return res.status(400).json({ ok: false, error: "Image data required" });

  const id = genId(8);
  const db = getDB();
  db.images.unshift({
    id,
    title: cleanText(title || "Image", 60),
    mime: cleanText(mime, 40),
    data,
    views: 0,
    createdAt: new Date().toISOString()
  });
  saveDB(db);

  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");

  res.json({ ok: true, image: { id, url: `${proto}://${host}/img/${id}` } });
});

app.get("/img/:id", (req, res) => {
  const db = getDB();
  const img = db.images.find((x) => x.id === req.params.id);
  if (!img) return res.status(404).send("Image Not Found");

  img.views = Number(img.views || 0) + 1;
  saveDB(db);

  const matches = img.data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches) return res.status(500).send("Invalid format");

  const buf = Buffer.from(matches[2], "base64");
  res.writeHead(200, {
    "Content-Type": img.mime || matches[1],
    "Content-Length": buf.length,
    "Cache-Control": "public, max-age=86400"
  });
  res.end(buf);
});

/* =========================================================
   6. POSTS / COMMUNITY MODULE
========================================================= */

app.get("/posts", (req, res) => {
  const db = getDB();
  const posts = db.posts.filter((p) => p.published !== false);

  const list = posts.map((post) => `
    <div class="card" style="margin-bottom:15px">
      <div class="card-top">
        <span class="pill">${new Date(post.createdAt).toLocaleDateString()}</span>
        <span class="pill">${Number(post.views || 0)} reads</span>
      </div>
      <h2 style="margin:16px 0 8px"><a href="/post/${encodeURIComponent(post.slug)}">${escapeHTML(post.title)}</a></h2>
      <p>${escapeHTML(post.content.slice(0, 140))}...</p>
      <a class="view" href="/post/${encodeURIComponent(post.slug)}">READ FULL POST &rarr;</a>
    </div>
  `).join("");

  res.send(
    page(
      "Community Posts",
      `
<main class="wrap" style="padding:40px 0; max-width:850px">
  <div class="hero" style="padding:40px 0">
    <div class="badge"><span class="badge-dot"></span> COMMUNITY</div>
    <h1>Posts & Articles</h1>
  </div>
  ${list || `<div class="card"><p>No posts published yet.</p></div>`}
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
    <h1 style="font-size:36px; margin:16px 0">${escapeHTML(post.title)}</h1>
    <hr style="border:0; border-top:1px solid rgba(255,255,255,.1); margin:20px 0">
    <div style="font-size:16px; line-height:1.75; color:#ccc; white-space:pre-wrap">${escapeHTML(post.content)}</div>
  </div>
</main>
`
    )
  );
});

/* =========================================================
   7. SUPER ADMIN PANEL (USER MANAGEMENT & HTML ASSIGN)
========================================================= */

app.get("/admin", (req, res) => {
  res.send(
    page(
      "Super Admin Control",
      `
<main class="wrap" style="padding:40px 0">
  <section id="loginSec" class="form" style="max-width:460px; margin:60px auto">
    <div class="badge"><span class="badge-dot"></span> MASTER KEY</div>
    <h1 style="font-size:36px; margin:16px 0 6px">Admin Login</h1>
    <p style="color:#777; margin-bottom:20px">Enter master administrator password.</p>

    <div class="field">
      <label>Password</label>
      <input id="adPass" type="password" placeholder="••••••••">
    </div>
    <div id="adLogNotice" class="notice"></div>
    <button id="adLogBtn" class="btn primary" style="width:100%">UNLOCK DASHBOARD</button>
  </section>

  <section id="dashSec" style="display:none">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; flex-wrap:wrap; gap:10px">
      <div>
        <div class="badge"><span class="badge-dot"></span> SYSTEM OVERLORD</div>
        <h1 style="font-size:36px; margin:8px 0 0">Control Center</h1>
      </div>
      <button id="adLogout" class="btn danger">LOGOUT ADMIN</button>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="tab('users')">All Users</button>
      <button class="tab-btn" onclick="tab('assign')">Give HTML to User</button>
      <button class="tab-btn" onclick="tab('sites')">All Websites</button>
      <button class="tab-btn" onclick="tab('notes')">All Notes</button>
      <button class="tab-btn" onclick="tab('posts')">Create Post</button>
    </div>

    <!-- USERS TAB -->
    <div id="tab-users" class="tab-pane">
      <div id="usersList"></div>
    </div>

    <!-- ASSIGN HTML TAB -->
    <div id="tab-assign" class="tab-pane" style="display:none">
      <div class="card">
        <h3>Assign / Create HTML for Specific User</h3>
        <p style="color:#777; margin-bottom:15px">The selected user will see this site in their private dashboard.</p>
        <div class="field">
          <label>Target User</label>
          <select id="assignUserSelect"></select>
        </div>
        <div class="field">
          <label>Website Title</label>
          <input id="assignTitle" placeholder="Assigned Website">
        </div>
        <div class="field">
          <label>URL Slug</label>
          <input id="assignSlug" placeholder="assigned-slug">
        </div>
        <div class="field">
          <label>HTML Code</label>
          <textarea id="assignHtml" placeholder="<!DOCTYPE html>..."></textarea>
        </div>
        <div id="assignNotice" class="notice"></div>
        <button onclick="submitAssign()" class="btn primary">GIVE HTML TO USER</button>
      </div>
    </div>

    <!-- SITES TAB -->
    <div id="tab-sites" class="tab-pane" style="display:none">
      <div id="adminSitesList"></div>
    </div>

    <!-- NOTES TAB -->
    <div id="tab-notes" class="tab-pane" style="display:none">
      <div id="adminNotesList"></div>
    </div>

    <!-- POSTS TAB -->
    <div id="tab-posts" class="tab-pane" style="display:none">
      <div class="card">
        <h3>Publish Platform Post</h3>
        <div class="field"><input id="adPostT" placeholder="Title"></div>
        <div class="field"><textarea id="adPostC" placeholder="Content..."></textarea></div>
        <button onclick="submitPost()" class="btn primary">PUBLISH POST</button>
      </div>
    </div>
  </section>
</main>
`,
      `
<script>
function tab(name){
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.style.display = "none");
  event.target.classList.add("active");
  document.getElementById("tab-" + name).style.display = "block";
}

document.getElementById("adLogBtn").onclick = async () => {
  const p = document.getElementById("adPass").value;
  const n = document.getElementById("adLogNotice");
  try{
    const r = await fetch("/api/admin/login", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ password: p })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Wrong admin password");
    initAdmin();
  }catch(e){
    n.textContent = e.message;
    n.className = "notice show";
  }
};

document.getElementById("adLogout").onclick = async () => {
  await fetch("/api/admin/logout", { method:"POST" });
  location.reload();
};

async function initAdmin(){
  try{
    const r = await fetch("/api/admin/me");
    const d = await r.json();
    if(!d.ok) throw new Error();
    document.getElementById("loginSec").style.display = "none";
    document.getElementById("dashSec").style.display = "block";
    loadAdminData();
  }catch{
    document.getElementById("loginSec").style.display = "block";
    document.getElementById("dashSec").style.display = "none";
  }
}

async function loadAdminData(){
  const r = await fetch("/api/admin/all-data");
  const d = await r.json();

  // Users
  const uEl = document.getElementById("usersList");
  const uSelect = document.getElementById("assignUserSelect");
  uSelect.innerHTML = d.users.map(u => \`<option value="\${u.id}">\${u.username} (ID: \${u.id.slice(0,6)})</option>\`).join("");

  uEl.innerHTML = d.users.map(u => \`
    <div class="card" style="margin-bottom:12px">
      <div class="card-top">
        <div>
          <h3 style="margin:0">\${u.username}</h3>
          <p style="color:#777">Created: \${new Date(u.createdAt).toLocaleDateString()}</p>
        </div>
        <button class="btn danger" onclick="delUser('\${u.id}')">DELETE USER</button>
      </div>
    </div>
  \`).join("") || "<p>No registered users.</p>";

  // Sites
  document.getElementById("adminSitesList").innerHTML = d.sites.map(s => \`
    <div class="card" style="margin-bottom:12px">
      <div class="card-top">
        <div>
          <h3 style="margin:0">\${s.title}</h3>
          <p style="color:#777">/site/\${s.slug} | Author: \${s.authorName || 'User'} | Views: \${s.views || 0}</p>
        </div>
        <span class="pill">\${s.published ? "LIVE" : "HIDDEN"}</span>
      </div>
      <div class="actions" style="justify-content:flex-start; margin-top:12px">
        <a class="btn" target="_blank" href="/site/\${s.slug}">VISIT</a>
        <button class="btn" onclick="toggleSite('\${s.id}')">TOGGLE VISIBILITY</button>
        <button class="btn danger" onclick="delSite('\${s.id}')">DELETE</button>
      </div>
    </div>
  \`).join("");

  // Notes
  document.getElementById("adminNotesList").innerHTML = d.notes.map(n => \`
    <div class="card" style="margin-bottom:12px">
      <div class="card-top">
        <h3 style="margin:0">\${n.title}</h3>
        <p style="color:#777">Author: \${n.authorName}</p>
      </div>
      <div class="actions" style="justify-content:flex-start">
        <a class="btn" target="_blank" href="/note/\${n.slug}">VIEW</a>
        <button class="btn danger" onclick="delNote('\${n.id}')">DELETE</button>
      </div>
    </div>
  \`).join("");
}

async function submitAssign(){
  const userId = document.getElementById("assignUserSelect").value;
  const title = document.getElementById("assignTitle").value.trim();
  const slug = document.getElementById("assignSlug").value.trim();
  const html = document.getElementById("assignHtml").value.trim();
  const not = document.getElementById("assignNotice");

  try{
    const r = await fetch("/api/admin/assign-site", {
      method:"POST",
      headers:{ "Content-Type": "application/json" },
      body:JSON.stringify({ userId, title, slug, html })
    });
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.error || "Failed");

    not.textContent = "Website assigned to user successfully!";
    not.className = "notice show";
    loadAdminData();
  }catch(e){
    not.textContent = e.message;
    not.className = "notice show";
  }
}

async function submitPost(){
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

async function toggleSite(id){
  await fetch("/api/admin/sites/" + id + "/toggle", { method:"PATCH" });
  loadAdminData();
}

async function delSite(id){
  if(confirm("Admin: Permanently delete site?")){
    await fetch("/api/admin/sites/" + id, { method:"DELETE" });
    loadAdminData();
  }
}

async function delNote(id){
  if(confirm("Admin: Permanently delete note?")){
    await fetch("/api/admin/notes/" + id, { method:"DELETE" });
    loadAdminData();
  }
}

async function delUser(id){
  if(confirm("Admin: Delete user and all their sites?")){
    await fetch("/api/admin/users/" + id, { method:"DELETE" });
    loadAdminData();
  }
}

initAdmin();
</script>
`
    )
  );
});

/* ADMIN API HANDLERS */
app.post("/api/admin/login", (req, res) => {
  if (req.body.password !== ADMIN_PASS) {
    return res.status(401).json({ ok: false, error: "Incorrect Admin Password" });
  }
  const token = genSecret();
  adminSessions.set(token, { created: Date.now() });
  res.cookie("sj_admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
  res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  const token = getCookie(req, "sj_admin_token");
  if (token) adminSessions.delete(token);
  res.clearCookie("sj_admin_token", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.get("/api/admin/all-data", requireAdmin, (req, res) => {
  const db = getDB();
  res.json({
    ok: true,
    users: db.users.map((u) => ({ id: u.id, username: u.username, createdAt: u.createdAt })),
    sites: db.sites,
    notes: db.notes
  });
});

app.post("/api/admin/assign-site", requireAdmin, (req, res) => {
  const { userId, title, html } = req.body;
  const db = getDB();
  const targetUser = db.users.find((u) => u.id === userId);
  if (!targetUser) return res.status(404).json({ ok: false, error: "User not found" });

  let slug = slugify(req.body.slug || title) || "site-" + genId(4);

  const site = {
    id: genId(),
    userId: targetUser.id,
    authorName: targetUser.username,
    title: cleanText(title || "Admin Assigned Site", 80),
    slug,
    html: html || "<h1>Site Assigned by Admin</h1>",
    published: true,
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.sites.unshift(site);
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

app.patch("/api/admin/sites/:id/toggle", requireAdmin, (req, res) => {
  const db = getDB();
  const site = db.sites.find((s) => s.id === req.params.id);
  if (site) {
    site.published = site.published === false;
    saveDB(db);
  }
  res.json({ ok: true });
});

app.delete("/api/admin/sites/:id", requireAdmin, (req, res) => {
  const db = getDB();
  db.sites = db.sites.filter((s) => s.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

app.delete("/api/admin/notes/:id", requireAdmin, (req, res) => {
  const db = getDB();
  db.notes = db.notes.filter((n) => n.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

app.delete("/api/admin/users/:id", requireAdmin, (req, res) => {
  const db = getDB();
  db.users = db.users.filter((u) => u.id !== req.params.id);
  db.sites = db.sites.filter((s) => s.userId !== req.params.id);
  db.notes = db.notes.filter((n) => n.userId !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

/* =========================================================
   8. PUBLIC HOME & 404
========================================================= */

app.get("/", (req, res) => {
  const db = getDB();
  const sites = db.sites.filter((x) => x.published !== false);
  const notes = db.notes.filter((x) => x.published !== false);
  const totalViews =
    sites.reduce((a, b) => a + Number(b.views || 0), 0) + notes.reduce((a, b) => a + Number(b.views || 0), 0);

  const recentWebsites = sites.slice(0, 6).map((site) => `
    <div class="card">
      <div class="card-top">
        <div class="icon">WEB</div>
        <span class="pill">${Number(site.views || 0)} views</span>
      </div>
      <h3>${escapeHTML(site.title)}</h3>
      <p style="color:#777">By: ${escapeHTML(site.authorName || "User")}</p>
      <a class="view" href="/site/${encodeURIComponent(site.slug)}">VISIT WEBSITE &rarr;</a>
    </div>
  `).join("");

  res.send(
    page(
      "Home — Free Cloud Hosting",
      `
<main>
<section class="hero">
  <div class="wrap">
    <div class="badge"><span class="badge-dot"></span> 100% PROTECTED & SECURE HOSTING</div>
    <h1>Build. Secure.<br>Host. Share.</h1>
    <p>Upload HTML websites, save notes, direct images and code with zero risk of theft.</p>
    <div class="actions">
      <a class="btn primary" href="/create">CREATE HTML SITE</a>
      <a class="btn" href="/notepad">NOTEPAD</a>
      <a class="btn" href="/images">IMAGE HOST</a>
      <a class="btn" href="/posts">COMMUNITY</a>
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
        <span class="pill">Users</span>
        <h2 style="font-size:36px; margin:10px 0 0">${db.users.length}</h2>
      </div>
      <div class="card">
        <span class="pill">Notepads</span>
        <h2 style="font-size:36px; margin:10px 0 0">${notes.length}</h2>
      </div>
      <div class="card">
        <span class="pill">Total Views</span>
        <h2 style="font-size:36px; margin:10px 0 0">${totalViews}</h2>
      </div>
    </div>
  </div>
</section>

${recentWebsites ? `
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h2>Recent Live Projects</h2>
      <p>Websites hosted by creators.</p>
    </div>
    <div class="grid">${recentWebsites}</div>
  </div>
</section>
` : ""}
</main>
`
    )
  );
});

function notFound(msg) {
  return page(
    "404 Not Found",
    `
<main class="hero">
  <div class="wrap">
    <div class="badge"><span class="badge-dot"></span> 404 ERROR</div>
    <h1>Page Not Found.</h1>
    <p>${escapeHTML(msg)}</p>
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
  console.log(`SJEMAR Engine listening on port ${PORT}`);
});    .slice(0, max);
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
