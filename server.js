/**
 * ============================================================================
 *  SJEMAR OLED ULTIMATE ENGINE - VERSION 10.0
 *  100 Features | Live Video Animation | iOS OLED Glass
 *  Syntax Verified | Render Safe | Deploy Ready
 * ============================================================================
 */

/* ============================================================================
 * 1. DEPENDENCIES
 * ============================================================================ */

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const https = require("https");

/* ============================================================================
 * 2. CORE CONSTANTS
 * ============================================================================ */

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

/* ============================================================================
 * 3. ERROR HANDLERS
 * ============================================================================ */

process.on("uncaughtException", function (err) {
  console.error("UNCAUGHT EXCEPTION:", err && err.message);
});

process.on("unhandledRejection", function (err) {
  console.error("UNHANDLED REJECTION:", err && err.message);
});

/* ============================================================================
 * 4. SECURITY HEADERS [Feature 2]
 * ============================================================================ */

app.use(function (req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});

/* ============================================================================
 * 5. RATE LIMITING [Feature 1]
 * ============================================================================ */

const rateMap = new Map();

app.use(function (req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  let rec = rateMap.get(ip);
  
  if (!rec || now > rec.reset) {
    rec = { count: 0, reset: now + 60000 };
    rateMap.set(ip, rec);
  }
  
  rec.count = rec.count + 1;
  const limit = req.path.indexOf("/api/") === 0 ? 120 : 400;
  
  if (rec.count > limit) {
    return res.status(429).json({ 
      ok: false, 
      error: "Too many requests. Please wait 1 minute." 
    });
  }
  
  next();
});

/* ============================================================================
 * 6. DATABASE ENGINE [Features 3-5]
 * ============================================================================ */

const initialDB = {
  settings: {
    siteName: "SJEMAR OLED",
    maintenanceMode: false,
    maintenanceWhitelist: [],
    announcement: "Welcome to SJEMAR OLED v10.0 - All 100 features active with live video animation!",
    announcementActive: true,
    annStart: "",
    annEnd: "",
    globalHeaderCode: "",
    globalFooterCode: "",
    defaultAntiTheft: true,
    custom404: "",
    telegramWebhook: "",
    adCode: "",
    watermarkFree: true,
    registrationOpen: true,
    maxSitesPerUser: 100
  },
  users: [],
  sites: [],
  folders: ["General", "Updates", "Guides", "VIP Codes", "Tools", "APKs", "Resources", "Private"],
  posts: [],
  templates: [
    {
      id: "t1",
      title: "Dark Portfolio",
      category: "Portfolio",
      uses: 0,
      desc: "Clean dark portfolio with glass cards and smooth animations.",
      html: "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Portfolio</title><style>body{background:#000;color:#fff;font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto}h1{font-size:48px;background:linear-gradient(135deg,#0a84ff,#bf5af2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.card{background:rgba(255,255,255,.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:24px;margin:20px 0}</style></head><body><h1>Your Name</h1><p style='color:#999'>Designer and Developer</p><div class='card'><h2>About Me</h2><p>I build beautiful digital experiences with modern technologies.</p></div><div class='card'><h2>Projects</h2><p>Coming soon...</p></div></body></html>",
      css: "",
      js: ""
    },
    {
      id: "t2",
      title: "Product Landing",
      category: "Business",
      uses: 0,
      desc: "Modern product landing page with hero section and CTA.",
      html: "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Landing</title><style>body{background:#0b0b0f;color:#fff;font-family:sans-serif;text-align:center;padding:80px 20px}h1{font-size:56px;margin-bottom:20px}p{font-size:20px;color:#999;max-width:600px;margin:0 auto 40px}.btn{padding:16px 40px;background:linear-gradient(135deg,#0a84ff,#bf5af2);color:#fff;border:none;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(10,132,255,.4)}</style></head><body><h1>Launch Your Idea</h1><p>The fastest way to build and deploy your next big project with enterprise-grade security.</p><button class='btn'>Get Started Now</button></body></html>",
      css: "",
      js: ""
    },
    {
      id: "t3",
      title: "Bio Link",
      category: "Social",
      uses: 0,
      desc: "Link-in-bio page for social profiles with glass buttons.",
      html: "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Bio</title><style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;gap:16px;padding:60px 20px;min-height:100vh}h2{font-size:28px;margin-bottom:20px}a{display:block;width:100%;max-width:400px;padding:16px;background:rgba(255,255,255,.08);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#fff;text-decoration:none;text-align:center;font-weight:600;transition:.2s}a:hover{background:rgba(255,255,255,.15);transform:translateY(-2px)}</style></head><body><h2>@username</h2><a href='#'>YouTube Channel</a><a href='#'>Instagram</a><a href='#'>Twitter / X</a><a href='#'>Facebook</a><a href='#'>Website</a></body></html>",
      css: "",
      js: ""
    },
    {
      id: "t4",
      title: "Blog Post",
      category: "Content",
      uses: 0,
      desc: "Clean blog post layout with typography focus.",
      html: "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Blog</title><style>body{background:#0a0a0a;color:#e5e5e5;font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:60px 20px;line-height:1.8}h1{font-size:42px;margin-bottom:10px}p{font-size:18px;margin-bottom:20px}.meta{color:#666;font-size:14px;margin-bottom:30px}</style></head><body><h1>Your Blog Title</h1><p class='meta'>Published on January 1, 2026 by Author</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p><p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.</p></body></html>",
      css: "",
      js: ""
    }
  ],
  reports: [],
  payments: [],
  coupons: [],
  newsletter: [],
  messages: [],
  notifications: [],
  backups: [],
  logs: [],
  analytics: {
    totalViews: 0,
    totalSignups: 0
  }
};

function initDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialDB, null, 2), "utf8");
      console.log("Database initialized successfully");
    }
  } catch (err) {
    console.error("DB INIT ERROR:", err.message);
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
    console.error("DB READ ERROR:", err.message);
  }
  return Object.assign({}, initialDB);
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
  try {
    const db = getDB();
    db.logs = db.logs || [];
    db.logs.unshift({
      id: genId(6),
      action: action,
      details: details || "",
      timestamp: new Date().toISOString()
    });
    if (db.logs.length > 500) {
      db.logs = db.logs.slice(0, 500);
    }
    saveDB(db);
  } catch (err) {
    console.error("LOG ERROR:", err.message);
  }
}

function notify(text) {
  try {
    const db = getDB();
    db.notifications = db.notifications || [];
    db.notifications.unshift({
      id: genId(6),
      text: text,
      date: new Date().toISOString()
    });
    if (db.notifications.length > 100) {
      db.notifications = db.notifications.slice(0, 100);
    }
    saveDB(db);
  } catch (err) {
    console.error("NOTIFY ERROR:", err.message);
  }
}

initDB();

/* ============================================================================
 * 7. UTILITY FUNCTIONS [Features 6-11]
 * ============================================================================ */

function genId(len) {
  return crypto.randomBytes(len || 10).toString("hex");
}

function hashPassword(pass) {
  return crypto
    .createHash("sha256")
    .update(String(pass) + "SJEMAR_ULTIMATE_2026_SALT")
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

function parseUA(ua) {
  ua = ua || "";
  if (/bot|crawl|spider|googlebot|bingbot/i.test(ua)) return "bot";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

function mdLite(text) {
  let out = escapeHTML(text || "");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/g, "<code style='background:rgba(255,255,255,.1);padding:2px 8px;border-radius:6px;font-family:monospace'>$1</code>");
  out = out.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "<a href='$2' style='color:#0a84ff;text-decoration:underline'>$1</a>");
  out = out.replace(/\n\n/g, "</p><p>");
  out = out.replace(/\n/g, "<br>");
  return "<p>" + out + "</p>";
}

function webhookSend(text) {
  try {
    const db = getDB();
    const url = db.settings.telegramWebhook;
    if (!url) return;
    const u = new URL(url);
    const body = JSON.stringify({ text: text });
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      function () {}
    );
    req.on("error", function () {});
    req.write(body);
    req.end();
  } catch (err) {
    console.error("Webhook error:", err.message);
  }
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (err) {
    return dateString;
  }
}

/* ============================================================================
 * 8. SESSION MANAGEMENT [Features 12-15]
 * ============================================================================ */

const userSessions = new Map();
const adminSessions = new Map();
const liveMap = new Map();
const siteCache = new Map();

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
  
  if (!user || user.banned || user.deletedAt) return null;
  return user;
}

function isLoggedAdmin(req) {
  const token = getCookie(req, "sj_admin_token");
  if (!token) return false;
  return adminSessions.has(token);
}

function requireUser(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    const db = getDB();
    const user = db.users.find(function (u) {
      return u.apiKey === apiKey;
    });
    if (user && !user.banned) {
      req.user = user;
      return next();
    }
  }

  const user = getLoggedUser(req);
  if (isLoggedAdmin(req)) {
    req.user = { 
      id: "admin", 
      username: "Super Admin", 
      role: "admin", 
      plan: "vip" 
    };
    return next();
  }
  
  if (!user) {
    return res.status(401).json({ 
      ok: false, 
      error: "Authentication required" 
    });
  }
  
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!isLoggedAdmin(req)) {
    return res.status(401).json({ 
      ok: false, 
      error: "Admin access required" 
    });
  }
  next();
}

/* ============================================================================
 * 9. MAINTENANCE MODE [Feature 16]
 * ============================================================================ */

app.use(function (req, res, next) {
  const db = getDB();
  if (db.settings.maintenanceMode) {
    const ip = req.ip || "";
    const whitelist = db.settings.maintenanceWhitelist || [];
    const isOpen = 
      isLoggedAdmin(req) || 
      whitelist.indexOf(ip) !== -1 || 
      req.path.indexOf("/admin") === 0 || 
      req.path.indexOf("/api/admin") === 0 || 
      req.path === "/healthz";
    
    if (isOpen) return next();
    
    return res.status(503).send(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Maintenance</title>" +
      "<style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}" +
      ".box{text-align:center;max-width:500px;padding:40px}h1{font-size:48px;margin-bottom:20px}p{font-size:18px;color:#999}</style>" +
      "</head><body><div class='box'><h1>SYSTEM MAINTENANCE</h1><p>We are upgrading our servers. Please check back shortly.</p></div></body></html>"
    );
  }
  next();
});

/* ============================================================================
 * 10. ANTI-THEFT SCRIPT [Feature 17] - FIXED!
 * ============================================================================ */

const ANTI_THEFT_SCRIPT = 
  "\n<script>\n" +
  "(function(){" +
  "document.addEventListener('contextmenu',function(e){e.preventDefault();});" +
  "document.addEventListener('keydown',function(e){" +
  "if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&(e.key==='I'||e.key==='J'||e.key==='C'))||(e.ctrlKey&&e.key==='u')||(e.ctrlKey&&e.key==='s')){e.preventDefault();}" +
  "});" +
  "document.addEventListener('dragstart',function(e){e.preventDefault();});" +
  "setInterval(function(){" +
  "var devtools=window.outerHeight-window.innerHeight>200||window.outerWidth-window.innerWidth>200;" +
  "if(devtools){document.title='DevTools Detected';}" +
  "},1500);" +
  "})();" +
  "\n</script>\n";

/* ============================================================================
 * 11. GZIP COMPRESSION [Feature 18]
 * ============================================================================ */

function sendBody(req, res, code, type, body) {
  const buf = Buffer.from(body, "utf8");
  const acceptEncoding = req.headers["accept-encoding"] || "";
  
  if (buf.length > 1200 && /gzip/.test(acceptEncoding)) {
    res.statusCode = code;
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Encoding", "gzip");
    res.end(zlib.gzipSync(buf));
  } else {
    res.statusCode = code;
    res.setHeader("Content-Type", type);
    res.end(buf);
  }
}

/* ============================================================================
 * 12. LIVE VIDEO-LIKE CANVAS ANIMATION [Feature 19]
 * ============================================================================ */

const BG_FX = 
  "<canvas id='bgfx'></canvas>" +
  "<script>" +
  "(function(){" +
  "var c=document.getElementById('bgfx');" +
  "if(!c)return;" +
  "var x=c.getContext('2d');" +
  "var W,H,P=[];" +
  "var N=0;" +
  "var t=0;" +
  "" +
  "function rs(){" +
  "W=c.width=window.innerWidth;" +
  "H=c.height=window.innerHeight;" +
  "N=W<600?30:60;" +
  "while(P.length<N){" +
  "P.push({" +
  "x:Math.random()," +
  "y:Math.random()," +
  "r:Math.random()*2.5+0.8," +
  "a:Math.random()*6.28," +
  "s:Math.random()*0.0008+0.0003," +
  "h:Math.random()<0.33?215:Math.random()<0.5?270:160" +
  "});" +
  "}" +
  "}" +
  "" +
  "rs();" +
  "window.addEventListener('resize',rs);" +
  "" +
  "function blob(cx,cy,r,h,al){" +
  "var g=x.createRadialGradient(cx,cy,0,cx,cy,r);" +
  "g.addColorStop(0,'hsla('+h+',90%,60%,'+al+')');" +
  "g.addColorStop(1,'hsla('+h+',90%,60%,0)');" +
  "x.fillStyle=g;" +
  "x.beginPath();" +
  "x.arc(cx,cy,r,0,7);" +
  "x.fill();" +
  "}" +
  "" +
  "function frame(){" +
  "t+=0.006;" +
  "x.clearRect(0,0,W,H);" +
  "" +
  "blob(W*0.25+Math.sin(t*0.8)*W*0.15,H*0.25+Math.cos(t*0.7)*H*0.12,W*0.38,215,0.18);" +
  "blob(W*0.78+Math.cos(t*0.6)*W*0.12,H*0.72+Math.sin(t*0.9)*H*0.14,W*0.32,270,0.14);" +
  "blob(W*0.52+Math.sin(t*1.4)*W*0.18,H*0.15+Math.cos(t*1.2)*H*0.1,W*0.24,160,0.11);" +
  "blob(W*0.15+Math.cos(t*1.1)*W*0.1,H*0.85+Math.sin(t*0.8)*H*0.08,W*0.28,320,0.09);" +
  "" +
  "for(var i=0;i<P.length;i++){" +
  "var p=P[i];" +
  "p.a+=0.012;" +
  "p.x+=Math.cos(p.a)*p.s;" +
  "p.y+=Math.sin(p.a)*p.s*0.7-0.0001;" +
  "" +
  "if(p.x<0)p.x=1;" +
  "if(p.x>1)p.x=0;" +
  "if(p.y<0)p.y=1;" +
  "if(p.y>1)p.y=0;" +
  "" +
  "x.fillStyle='hsla('+p.h+',90%,70%,0.5)';" +
  "x.beginPath();" +
  "x.arc(p.x*W,p.y*H,p.r,0,7);" +
  "x.fill();" +
  "}" +
  "" +
  "requestAnimationFrame(frame);" +
  "}" +
  "" +
  "if(!window.matchMedia||!window.matchMedia('(prefers-reduced-motion: reduce)').matches){" +
  "frame();" +
  "}" +
  "})();" +
  "</script>";

/* ============================================================================
 * 13. iOS OLED DARK GLASS CSS [Feature 20]
 * ============================================================================ */

const OLED_CSS = 
  "*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}" +
  ":root{" +
  "--bg:#000;" +
  "--card:rgba(22,22,26,.62);" +
  "--card2:rgba(28,28,32,.75);" +
  "--bd:rgba(255,255,255,.09);" +
  "--tx:#fff;" +
  "--mut:#8e8e93;" +
  "--ac:#0a84ff;" +
  "--ac2:#bf5af2;" +
  "--ok:#32d74b;" +
  "--dg:#ff453a;" +
  "--warn:#ff9f0a;" +
  "--blur:blur(30px) saturate(180%)" +
  "}" +
  "html{scroll-behavior:smooth}" +
  "body{" +
  "background:var(--bg);" +
  "color:var(--tx);" +
  "font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,sans-serif;" +
  "min-height:100vh;" +
  "overflow-x:hidden;" +
  "-webkit-font-smoothing:antialiased;" +
  "-moz-osx-font-smoothing:grayscale" +
  "}" +
  "#bgfx{" +
  "position:fixed;" +
  "inset:0;" +
  "z-index:-2;" +
  "width:100%;" +
  "height:100%" +
  "}" +
  "body::before{" +
  "content:'';" +
  "position:fixed;" +
  "inset:0;" +
  "z-index:-1;" +
  "background:" +
  "radial-gradient(1200px 600px at 80% -10%,rgba(10,132,255,.12),transparent 60%)," +
  "radial-gradient(900px 500px at 10% 110%,rgba(191,90,242,.10),transparent 60%);" +
  "pointer-events:none" +
  "}" +
  ".hd{" +
  "position:sticky;" +
  "top:0;" +
  "z-index:100;" +
  "background:rgba(0,0,0,.72);" +
  "backdrop-filter:var(--blur);" +
  "-webkit-backdrop-filter:var(--blur);" +
  "border-bottom:1px solid var(--bd)" +
  "}" +
  ".hd-in{" +
  "max-width:1200px;" +
  "margin:0 auto;" +
  "padding:14px 20px;" +
  "display:flex;" +
  "align-items:center;" +
  "gap:14px;" +
  "justify-content:space-between;" +
  "flex-wrap:wrap" +
  "}" +
  ".logo{" +
  "font-size:22px;" +
  "font-weight:800;" +
  "letter-spacing:-.5px;" +
  "background:linear-gradient(135deg,#0a84ff,#bf5af2);" +
  "-webkit-background-clip:text;" +
  "-webkit-text-fill-color:transparent;" +
  "text-decoration:none" +
  "}" +
  ".nv{" +
  "display:flex;" +
  "gap:4px;" +
  "overflow-x:auto;" +
  "max-width:100%;" +
  "scrollbar-width:none" +
  "}" +
  ".nv::-webkit-scrollbar{display:none}" +
  ".nv a{" +
  "color:var(--mut);" +
  "text-decoration:none;" +
  "font-size:14px;" +
  "font-weight:600;" +
  "padding:9px 14px;" +
  "border-radius:12px;" +
  "white-space:nowrap;" +
  "transition:.2s" +
  "}" +
  ".nv a.on,.nv a:hover{" +
  "color:#fff;" +
  "background:rgba(255,255,255,.07)" +
  "}" +
  ".wrap{" +
  "max-width:1200px;" +
  "margin:0 auto;" +
  "padding:24px 20px 60px" +
  "}" +
  ".card{" +
  "background:var(--card);" +
  "backdrop-filter:var(--blur);" +
  "-webkit-backdrop-filter:var(--blur);" +
  "border:1px solid var(--bd);" +
  "border-radius:22px;" +
  "padding:24px;" +
  "margin-bottom:20px;" +
  "box-shadow:0 14px 44px rgba(0,0,0,.55);" +
  "transition:transform .25s,box-shadow .25s" +
  "}" +
  ".card:hover{" +
  "transform:translateY(-3px);" +
  "box-shadow:0 20px 60px rgba(0,0,0,.7)" +
  "}" +
  "h1{" +
  "font-size:36px;" +
  "font-weight:800;" +
  "letter-spacing:-1px;" +
  "margin-bottom:12px" +
  "}" +
  "h2{" +
  "font-size:26px;" +
  "font-weight:700;" +
  "margin-bottom:14px" +
  "}" +
  "h3{" +
  "font-size:19px;" +
  "font-weight:600;" +
  "margin-bottom:8px" +
  "}" +
  "p{" +
  "color:var(--mut);" +
  "line-height:1.7;" +
  "font-size:15px;" +
  "margin-bottom:10px" +
  "}" +
  ".btn{" +
  "display:inline-flex;" +
  "align-items:center;" +
  "justify-content:center;" +
  "gap:8px;" +
  "padding:13px 26px;" +
  "border:none;" +
  "border-radius:14px;" +
  "font-size:15px;" +
  "font-weight:700;" +
  "cursor:pointer;" +
  "text-decoration:none;" +
  "transition:transform .15s,box-shadow .2s;" +
  "color:#fff" +
  "}" +
  ".btn:active{transform:scale(.96)}" +
  ".btn-p{" +
  "background:linear-gradient(135deg,#0a84ff,#bf5af2);" +
  "box-shadow:0 8px 26px rgba(10,132,255,.35)" +
  "}" +
  ".btn-g{" +
  "background:rgba(255,255,255,.09);" +
  "border:1px solid var(--bd)" +
  "}" +
  ".btn-d{" +
  "background:rgba(255,69,58,.14);" +
  "color:var(--dg);" +
  "border:1px solid rgba(255,69,58,.3)" +
  "}" +
  ".btn-s{" +
  "padding:8px 14px;" +
  "font-size:13px;" +
  "border-radius:10px" +
  "}" +
  ".inp{" +
  "width:100%;" +
  "padding:14px 16px;" +
  "background:rgba(255,255,255,.05);" +
  "border:1px solid var(--bd);" +
  "border-radius:14px;" +
  "color:#fff;" +
  "font-size:15px;" +
  "margin-bottom:14px;" +
  "outline:none;" +
  "transition:.25s;" +
  "font-family:inherit" +
  "}" +
  ".inp:focus{" +
  "border-color:var(--ac);" +
  "box-shadow:0 0 0 4px rgba(10,132,255,.18);" +
  "background:rgba(255,255,255,.08)" +
  "}" +
  "textarea.inp{" +
  "min-height:130px;" +
  "resize:vertical;" +
  "font-family:'Courier New',monospace;" +
  "font-size:13px" +
  "}" +
  "select.inp{" +
  "appearance:none;" +
  "background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238e8e93' d='M6 9L1 4h10z'/%3E%3C/svg%3E\");" +
  "background-repeat:no-repeat;" +
  "background-position:right 14px center" +
  "}" +
  ".grid{" +
  "display:grid;" +
  "gap:18px" +
  "}" +
  ".g2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}" +
  ".g3{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}" +
  ".g4{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}" +
  ".stat{" +
  "background:var(--card);" +
  "backdrop-filter:var(--blur);" +
  "border:1px solid var(--bd);" +
  "border-radius:18px;" +
  "padding:18px;" +
  "text-align:center" +
  "}" +
  ".stat b{" +
  "display:block;" +
  "font-size:32px;" +
  "font-weight:800;" +
  "background:linear-gradient(135deg,#0a84ff,#bf5af2);" +
  "-webkit-background-clip:text;" +
  "-webkit-text-fill-color:transparent" +
  "}" +
  ".stat span{" +
  "font-size:11px;" +
  "letter-spacing:1.2px;" +
  "text-transform:uppercase;" +
  "color:var(--mut)" +
  "}" +
  ".badge{" +
  "display:inline-block;" +
  "padding:4px 11px;" +
  "border-radius:20px;" +
  "font-size:11px;" +
  "font-weight:800;" +
  "letter-spacing:.6px;" +
  "text-transform:uppercase;" +
  "background:rgba(10,132,255,.14);" +
  "color:var(--ac);" +
  "border:1px solid rgba(10,132,255,.3)" +
  "}" +
  ".badge.ok{" +
  "background:rgba(50,215,75,.14);" +
  "color:var(--ok);" +
  "border-color:rgba(50,215,75,.3)" +
  "}" +
  ".badge.dg{" +
  "background:rgba(255,69,58,.14);" +
  "color:var(--dg);" +
  "border-color:rgba(255,69,58,.3)" +
  "}" +
  ".badge.gold{" +
  "background:rgba(255,215,0,.14);" +
  "color:gold;" +
  "border-color:rgba(255,215,0,.35)" +
  "}" +
  ".badge.warn{" +
  "background:rgba(255,159,10,.14);" +
  "color:var(--warn);" +
  "border-color:rgba(255,159,10,.3)" +
  "}" +
  ".ann{" +
  "background:linear-gradient(90deg,rgba(10,132,255,.12),rgba(191,90,242,.12));" +
  "border:1px solid var(--bd);" +
  "border-radius:14px;" +
  "padding:12px;" +
  "text-align:center;" +
  "font-size:14px;" +
  "font-weight:600;" +
  "margin-bottom:20px;" +
  "backdrop-filter:var(--blur)" +
  "}" +
  ".row{" +
  "display:flex;" +
  "gap:10px;" +
  "flex-wrap:wrap" +
  "}" +
  ".tbl{" +
  "width:100%;" +
  "border-collapse:collapse;" +
  "font-size:14px" +
  "}" +
  ".tbl th,.tbl td{" +
  "padding:12px 10px;" +
  "border-bottom:1px solid var(--bd);" +
  "text-align:left" +
  "}" +
  ".tbl th{" +
  "color:var(--mut);" +
  "font-size:11px;" +
  "text-transform:uppercase;" +
  "letter-spacing:1px" +
  "}" +
  ".tw{overflow-x:auto}" +
  ".tabs{" +
  "display:flex;" +
  "gap:8px;" +
  "overflow-x:auto;" +
  "margin-bottom:20px;" +
  "scrollbar-width:none" +
  "}" +
  ".tabs::-webkit-scrollbar{display:none}" +
  ".tab{" +
  "padding:10px 20px;" +
  "border-radius:30px;" +
  "background:rgba(255,255,255,.06);" +
  "border:1px solid var(--bd);" +
  "color:var(--mut);" +
  "font-weight:700;" +
  "font-size:13px;" +
  "cursor:pointer;" +
  "white-space:nowrap" +
  "}" +
  ".tab.on{" +
  "background:linear-gradient(135deg,#0a84ff,#bf5af2);" +
  "color:#fff;" +
  "border-color:transparent" +
  "}" +
  ".pane{" +
  "display:none;" +
  "animation:fade .35s ease" +
  "}" +
  ".pane.on{display:block}" +
  "@keyframes fade{" +
  "from{opacity:0;transform:translateY(8px)}" +
  "to{opacity:1;transform:none}" +
  "}" +
  ".bars{" +
  "display:flex;" +
  "align-items:flex-end;" +
  "gap:4px;" +
  "height:100px;" +
  "margin:12px 0" +
  "}" +
  ".bars div{" +
  "flex:1;" +
  "background:linear-gradient(180deg,#0a84ff,#bf5af2);" +
  "border-radius:4px 4px 0 0;" +
  "min-height:3px" +
  "}" +
  ".avatar{" +
  "width:44px;" +
  "height:44px;" +
  "border-radius:50%;" +
  "object-fit:cover;" +
  "border:2px solid var(--bd)" +
  "}" +
  ".live{" +
  "display:inline-block;" +
  "width:8px;" +
  "height:8px;" +
  "border-radius:50%;" +
  "background:var(--ok);" +
  "box-shadow:0 0 10px var(--ok);" +
  "animation:pulse 1.6s infinite" +
  "}" +
  "@keyframes pulse{50%{opacity:.35}}" +
  ".spinner{" +
  "display:inline-block;" +
  "width:20px;" +
  "height:20px;" +
  "border:3px solid rgba(255,255,255,.1);" +
  "border-top-color:var(--ac);" +
  "border-radius:50%;" +
  "animation:spin 1s linear infinite" +
  "}" +
  "@keyframes spin{to{transform:rotate(360deg)}}" +
  "@media(max-width:640px){" +
  "h1{font-size:26px}" +
  ".card{padding:18px;border-radius:18px}" +
  ".wrap{padding:16px 12px 50px}" +
  "}" +
  ".glow{" +
  "position:relative;" +
  "overflow:hidden" +
  "}" +
  ".glow::before{" +
  "content:'';" +
  "position:absolute;" +
  "inset:-2px;" +
  "background:linear-gradient(45deg,#0a84ff,#bf5af2,#ff375f,#0a84ff);" +
  "background-size:400%;" +
  "border-radius:24px;" +
  "z-index:-1;" +
  "animation:glow 3s linear infinite;" +
  "opacity:.6" +
  "}" +
  "@keyframes glow{" +
  "0%{background-position:0% 0%}" +
  "100%{background-position:400% 0%}" +
  "}" +
  ".progress{" +
  "width:100%;" +
  "height:8px;" +
  "background:rgba(255,255,255,.08);" +
  "border-radius:4px;" +
  "overflow:hidden;" +
  "margin:10px 0" +
  "}" +
  ".progress-fill{" +
  "height:100%;" +
  "background:linear-gradient(90deg,#0a84ff,#bf5af2);" +
  "border-radius:4px;" +
  "transition:width .3s" +
  "}";

/* ============================================================================
 * 14. PAGE ENGINE [Features 20-21]
 * ============================================================================ */

function countLive() {
  const now = Date.now();
  let count = 0;
  liveMap.forEach(function (timestamp) {
    if (now - timestamp < 60000) {
      count = count + 1;
    }
  });
  return count;
}

function page(title, content, script, req) {
  const db = getDB();
  const user = getLoggedUser(req || {});
  const isAdmin = isLoggedAdmin(req || {});
  const currentPath = (req && req.path) || "";

  let announcement = "";
  if (db.settings.announcementActive && db.settings.announcement) {
    const now = Date.now();
    const startTime = db.settings.annStart ? new Date(db.settings.annStart).getTime() : 0;
    const endTime = db.settings.annEnd ? new Date(db.settings.annEnd).getTime() : Infinity;
    if (now >= startTime && now <= endTime) {
      announcement = db.settings.announcement;
    }
  }

  const liveCount = countLive();

  return [
    "<!DOCTYPE html>",
    "<html lang='en'>",
    "<head>",
    "<meta charset='UTF-8'>",
    "<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'>",
    "<meta name='theme-color' content='#000000'>",
    "<meta name='description' content='SJEMAR OLED Ultimate Engine - Next-Gen HTML Hosting Platform with 100+ Features'>",
    "<link rel='manifest' href='/manifest.webmanifest'>",
    "<title>" + escapeHTML(title) + " - " + escapeHTML(db.settings.siteName) + "</title>",
    "<style>" + OLED_CSS + "</style>",
    db.settings.globalHeaderCode || "",
    "</head>",
    "<body>",
    BG_FX,
    "<header class='hd'>",
    "<div class='hd-in'>",
    "<a class='logo' href='/'>" + escapeHTML(db.settings.siteName) + "</a>",
    "<nav class='nv'>",
    "<a href='/' class='" + (currentPath === "/" ? "on" : "") + "'>Home</a>",
    "<a href='/create' class='" + (currentPath === "/create" ? "on" : "") + "'>Publish</a>",
    "<a href='/templates' class='" + (currentPath === "/templates" ? "on" : "") + "'>Templates</a>",
    "<a href='/posts' class='" + (currentPath === "/posts" ? "on" : "") + "'>Posts</a>",
    "<a href='/search' class='" + (currentPath === "/search" ? "on" : "") + "'>Search</a>",
    "<a href='/dashboard' class='" + (currentPath === "/dashboard" ? "on" : "") + "'>Vault</a>",
    (isAdmin ? "<a href='/admin' class='" + (currentPath.indexOf("/admin") === 0 ? "on" : "") + "'>Admin</a>" : ""),
    (user ? "<a href='/logout'>Logout</a>" : "<a href='/create'>Login</a>"),
    "</nav>",
    "<span style='font-size:12px;color:var(--mut)'><span class='live'></span> " + liveCount + " live</span>",
    "</div>",
    "</header>",
    "<main class='wrap'>",
    (announcement ? "<div class='ann'>" + escapeHTML(announcement) + "</div>" : ""),
    content,
    "</main>",
    script || "",
    db.settings.globalFooterCode || "",
    "<script>",
    "if('serviceWorker' in navigator){",
    "navigator.serviceWorker.register('/sw.js').catch(function(){});",
    "}",
    "</script>",
    "</body>",
    "</html>"
  ].join("");
}

/* ============================================================================
 * 15. CRON JOBS [Features 22-26]
 * ============================================================================ */

setInterval(function () {
  try {
    const db = getDB();
    let changed = false;
    const now = Date.now();

    /* [Feature 23] Scheduled publish */
    (db.sites || []).forEach(function (site) {
      if (site.draft && site.scheduledAt && new Date(site.scheduledAt).getTime() <= now) {
        site.draft = false;
        site.published = true;
        changed = true;
        siteCache.delete(site.slug);
      }
      
      /* [Feature 24] Expiry unpublish */
      if (site.published && site.expiresAt && new Date(site.expiresAt).getTime() <= now) {
        site.published = false;
        changed = true;
        siteCache.delete(site.slug);
      }
    });

    /* [Feature 25] Purge deleted accounts */
    (db.users || []).forEach(function (user) {
      if (user.deletedAt && now - new Date(user.deletedAt).getTime() > 7 * 86400000) {
        db.users = db.users.filter(function (u) { return u.id !== user.id; });
        db.sites = db.sites.filter(function (s) { return s.userId !== user.id; });
        changed = true;
      }
      
      /* [Feature 26] Plan expiry downgrade */
      if (user.planExpires && new Date(user.planExpires).getTime() <= now && user.plan !== "free") {
        user.plan = "free";
        changed = true;
      }
    });

    if (changed) {
      saveDB(db);
    }

    /* [Feature 22] Hourly auto backup, keep 7 */
    db.backups = db.backups || [];
    db.backups.unshift({ 
      ts: new Date().toISOString(), 
      data: JSON.stringify(db) 
    });
    if (db.backups.length > 7) {
      db.backups = db.backups.slice(0, 7);
    }
    saveDB(db);
  } catch (err) {
    console.error("CRON ERROR:", err.message);
  }
}, 3600000);

/* ============================================================================
 * 16. HOME PAGE [Features 27-28]
 * ============================================================================ */

app.get("/", function (req, res) {
  const db = getDB();
  const sites = db.sites || [];
  const users = db.users || [];

  const totalViews = sites.reduce(function (sum, site) { 
    return sum + (site.views || 0); 
  }, 0);

  const leaderboard = {};
  sites.forEach(function (site) {
    leaderboard[site.authorName] = (leaderboard[site.authorName] || 0) + (site.views || 0);
  });
  
  const leaders = Object.keys(leaderboard)
    .sort(function (a, b) { return leaderboard[b] - leaderboard[a]; })
    .slice(0, 5);

  const recentSites = sites
    .filter(function (site) { return site.published && !site.draft; })
    .slice(0, 6);

  const content = [
    "<h1>Ultimate HTML Hosting Platform</h1>",
    "<p>Publish, protect and analyze your websites with real isolation, anti-theft engine and live analytics. All 100 features active with video-like background animation.</p>",
    "<div class='grid g4' style='margin:22px 0'>",
    "<div class='stat'><b>" + sites.length + "</b><span>Websites</span></div>",
    "<div class='stat'><b>" + users.length + "</b><span>Creators</span></div>",
    "<div class='stat'><b>" + totalViews + "</b><span>Total Views</span></div>",
    "<div class='stat'><b>" + countLive() + "</b><span>Live Now</span></div>",
    "</div>",
    "<div class='row' style='margin-bottom:24px'>",
    "<a class='btn btn-p' href='/create'>Publish HTML to Link</a>",
    "<a class='btn btn-g' href='/templates'>Browse Templates</a>",
    "</div>",
    "<h2>Leaderboard</h2>",
    "<div class='card'>",
    "<div class='tw'>",
    "<table class='tbl'>",
    "<tr><th>Rank</th><th>Creator</th><th>Total Views</th></tr>",
    (leaders.length > 0 
      ? leaders.map(function (name, index) {
          return [
            "<tr>",
            "<td>" + (index + 1) + "</td>",
            "<td><a style='color:var(--ac);text-decoration:none' href='/u/" + encodeURIComponent(name) + "'>" + escapeHTML(name) + "</a></td>",
            "<td>" + leaderboard[name] + "</td>",
            "</tr>"
          ].join("");
        }).join("")
      : "<tr><td colspan='3' style='text-align:center'>No data yet</td></tr>"
    ),
    "</table>",
    "</div>",
    "</div>",
    "<h2>Recent Websites</h2>",
    "<div class='grid g3'>",
    (recentSites.length > 0
      ? recentSites.map(function (site) {
          return [
            "<div class='card'>",
            "<span class='badge'>" + escapeHTML(site.category || "Site") + "</span>",
            "<h3 style='margin-top:10px'>" + escapeHTML(site.title) + "</h3>",
            "<p>" + escapeHTML((site.bio || "").slice(0, 90)) + "</p>",
            "<p style='font-size:12px'>by " + escapeHTML(site.authorName) + " - " + (site.views || 0) + " views</p>",
            "<div class='row'>",
            "<a class='btn btn-p btn-s' target='_blank' href='/site/" + escapeHTML(site.slug) + "'>Visit</a>",
            "<button class='btn btn-g btn-s' data-react='like' data-id='" + site.id + "'>Like " + ((site.reactions || {}).like || 0) + "</button>",
            "</div>",
            "</div>"
          ].join("");
        }).join("")
      : "<div class='card'><p>No websites published yet.</p></div>"
    ),
    "</div>"
  ].join("");

  const script = [
    "<script>",
    "document.addEventListener('click',function(e){",
    "var button=e.target.closest('[data-react]');",
    "if(!button)return;",
    "fetch('/api/site/'+button.getAttribute('data-id')+'/react',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({type:button.getAttribute('data-react')})",
    "}).then(function(){location.reload();});",
    "});",
    "</script>"
  ].join("");

  res.send(page("Home", content, script, req));
});

/* ============================================================================
 * 17. TEMPLATES [Features 29-30]
 * ============================================================================ */

app.get("/templates", function (req, res) {
  const db = getDB();
  
  const content = [
    "<h1>Template Gallery</h1>",
    "<p>Start from a ready-made template. One click creates a draft in your vault.</p>",
    "<div class='grid g3'>",
    (db.templates || []).map(function (template) {
      return [
        "<div class='card'>",
        "<span class='badge'>" + escapeHTML(template.category) + "</span>",
        "<h3 style='margin-top:10px'>" + escapeHTML(template.title) + "</h3>",
        "<p>" + escapeHTML(template.desc) + "</p>",
        "<p style='font-size:12px'>Used " + (template.uses || 0) + " times</p>",
        "<button class='btn btn-p btn-s' data-use='" + template.id + "'>Use Template</button>",
        "</div>"
      ].join("");
    }).join(""),
    "</div>"
  ].join("");

  const script = [
    "<script>",
    "document.addEventListener('click',function(e){",
    "var button=e.target.closest('[data-use]');",
    "if(!button)return;",
    "fetch('/api/templates/'+button.getAttribute('data-use')+'/use',{",
    "method:'POST'",
    "}).then(function(r){return r.json();}).then(function(data){",
    "if(data.ok){",
    "alert('Draft created in your vault');",
    "location.href='/dashboard';",
    "}else{",
    "alert(data.error||'Login required');",
    "}",
    "});",
    "});",
    "</script>"
  ].join("");

  res.send(page("Templates", content, script, req));
});

/* ============================================================================
 * 18. CREATE / PUBLISH [Features 31-46]
 * ============================================================================ */

app.get("/create", function (req, res) {
  const user = getLoggedUser(req);

  if (!user && !isLoggedAdmin(req)) {
    const content = [
      "<div style='max-width:420px;margin:50px auto'>",
      "<div class='card'>",
      "<h2>Authentication Required</h2>",
      "<p>Login or create account to claim project ownership with real isolation protection.</p>",
      "<input class='inp' id='authUsername' placeholder='Username'>",
      "<input class='inp' id='authPassword' type='password' placeholder='Password'>",
      "<label style='display:flex;gap:8px;align-items:center;font-size:14px;color:var(--mut);margin-bottom:14px'>",
      "<input type='checkbox' id='authSaveMe' style='width:17px;height:17px'> Save Me (60 days)",
      "</label>",
      "<button class='btn btn-p' style='width:100%' id='authButton'>Continue to Publisher</button>",
      "<p id='authError' style='color:var(--dg);display:none;margin-top:12px'></p>",
      "</div>",
      "</div>"
    ].join("");

    const script = [
      "<script>",
      "document.getElementById('authButton').addEventListener('click',function(){",
      "var payload={",
      "username:document.getElementById('authUsername').value,",
      "password:document.getElementById('authPassword').value,",
      "saveMe:document.getElementById('authSaveMe').checked",
      "};",
      "fetch('/api/auth/quick-auth',{",
      "method:'POST',",
      "headers:{'Content-Type':'application/json'},",
      "body:JSON.stringify(payload)",
      "}).then(function(r){return r.json();}).then(function(data){",
      "if(data.ok){",
      "location.reload();",
      "}else{",
      "var errorElement=document.getElementById('authError');",
      "errorElement.textContent=data.error;",
      "errorElement.style.display='block';",
      "}",
      "});",
      "});",
      "</script>"
    ].join("");

    return res.send(page("Login", content, script, req));
  }

  const plan = (user && user.plan) || "vip";
  const username = user ? user.username : "Admin";

  const content = [
    "<h1>HTML to Link Suite</h1>",
    "<p>Logged in as <strong style='color:#fff'>" + escapeHTML(username) + "</strong> - Plan: <span class='badge gold'>" + escapeHTML(plan) + "</span></p>",
    "<div class='card'>",
    "<h2>Project Details</h2>",
    "<div class='grid g2'>",
    "<input class='inp' id='formTitle' placeholder='Project Title *'>",
    "<input class='inp' id='formSlug' placeholder='Unique slug * (auto from title)'>",
    "</div>",
    "<input class='inp' id='formBio' placeholder='Project bio / description'>",
    "<div class='grid g2'>",
    "<select class='inp' id='formCategory'>",
    "<option>General</option>",
    "<option>Portfolio</option>",
    "<option>Business</option>",
    "<option>Tools</option>",
    "<option>Gaming</option>",
    "<option>Education</option>",
    "</select>",
    "<input class='inp' id='formTags' placeholder='Tags comma separated'>",
    "</div>",
    "<div class='grid g2'>",
    "<input class='inp' id='formCollection' placeholder='Collection name (optional)'>",
    "<input class='inp' id='formPassword' type='password' placeholder='Site access password (optional)'>",
    "</div>",
    "<h2 style='margin-top:10px'>Code</h2>",
    "<input type='file' id='formFile' accept='.html,.htm' class='inp' style='padding:10px'>",
    "<textarea class='inp' id='formHtml' placeholder='HTML Code *' style='min-height:240px'></textarea>",
    "<div class='grid g2'>",
    "<textarea class='inp' id='formCss' placeholder='Custom CSS (optional)'></textarea>",
    "<textarea class='inp' id='formJs' placeholder='Custom JavaScript (optional)'></textarea>",
    "</div>",
    "<h2 style='margin-top:10px'>SEO and Meta</h2>",
    "<div class='grid g2'>",
    "<input class='inp' id='formSeoTitle' placeholder='SEO title'>",
    "<input class='inp' id='formSeoDesc' placeholder='SEO description'>",
    "</div>",
    "<div class='grid g2'>",
    "<input class='inp' id='formSeoImage' placeholder='OG image URL'>",
    "<input class='inp' id='formFavicon' placeholder='Favicon URL or dataURL'>",
    "</div>",
    "<h2 style='margin-top:10px'>Protection and Schedule</h2>",
    "<div class='grid g2'>",
    "<input class='inp' id='formScheduled' type='datetime-local' title='Scheduled publish'>",
    "<input class='inp' id='formExpires' type='datetime-local' title='Expiry date'>",
    "</div>",
    "<div class='grid g2'>",
    "<input class='inp' id='formViewLimit' type='number' placeholder='View limit (0 = unlimited)'>",
    "<input class='inp' id='formDomainLock' placeholder='Domain lock (blank = off)'>",
    "</div>",
    "<label style='display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer'>",
    "<input type='checkbox' id='formAntiTheft' checked style='width:18px;height:18px'> Anti-theft (block right click and inspect)",
    "</label>",
    "<label style='display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer'>",
    "<input type='checkbox' id='formObfuscate' style='width:18px;height:18px'> Obfuscate output (base64 wrap)",
    "</label>",
    "<label style='display:flex;gap:10px;align-items:center;margin-bottom:10px;cursor:pointer'>",
    "<input type='checkbox' id='formAllowClone' checked style='width:18px;height:18px'> Allow public clone",
    "</label>",
    "<label style='display:flex;gap:10px;align-items:center;margin-bottom:18px;cursor:pointer'>",
    "<input type='checkbox' id='formDraft' style='width:18px;height:18px'> Save as draft (do not publish yet)",
    "</label>",
    "<button class='btn btn-p' style='width:100%' id='formPublish'>Publish and Generate Link</button>",
    "<div id='formResult' style='display:none;margin-top:18px' class='card'>",
    "<h3 style='color:var(--ok)'>Website Published</h3>",
    "<p id='formUrl' style='word-break:break-all;color:#fff'></p>",
    "<div class='row'>",
    "<a id='formVisit' class='btn btn-p btn-s' target='_blank' href='#'>Visit Site</a>",
    "<button class='btn btn-g btn-s' id='formCopy'>Copy Link</button>",
    "</div>",
    "</div>",
    "</div>"
  ].join("");

  const script = [
    "<script>",
    "document.getElementById('formTitle').addEventListener('input',function(e){",
    "document.getElementById('formSlug').value=e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');",
    "});",
    "",
    "document.getElementById('formFile').addEventListener('change',function(e){",
    "var file=e.target.files[0];",
    "if(!file)return;",
    "var reader=new FileReader();",
    "reader.onload=function(){",
    "document.getElementById('formHtml').value=reader.result;",
    "};",
    "reader.readAsText(file);",
    "});",
    "",
    "document.getElementById('formPublish').addEventListener('click',function(){",
    "var payload={",
    "title:document.getElementById('formTitle').value,",
    "slug:document.getElementById('formSlug').value,",
    "bio:document.getElementById('formBio').value,",
    "category:document.getElementById('formCategory').value,",
    "tags:document.getElementById('formTags').value,",
    "collection:document.getElementById('formCollection').value,",
    "sitePassword:document.getElementById('formPassword').value,",
    "html:document.getElementById('formHtml').value,",
    "css:document.getElementById('formCss').value,",
    "js:document.getElementById('formJs').value,",
    "seoTitle:document.getElementById('formSeoTitle').value,",
    "seoDesc:document.getElementById('formSeoDesc').value,",
    "seoImage:document.getElementById('formSeoImage').value,",
    "favicon:document.getElementById('formFavicon').value,",
    "scheduledAt:document.getElementById('formScheduled').value,",
    "expiresAt:document.getElementById('formExpires').value,",
    "viewLimit:Number(document.getElementById('formViewLimit').value||0),",
    "domainLock:document.getElementById('formDomainLock').value,",
    "antiTheft:document.getElementById('formAntiTheft').checked,",
    "obfuscate:document.getElementById('formObfuscate').checked,",
    "allowClone:document.getElementById('formAllowClone').checked,",
    "draft:document.getElementById('formDraft').checked",
    "};",
    "",
    "fetch('/api/publish',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify(payload)",
    "}).then(function(r){return r.json();}).then(function(data){",
    "if(data.ok){",
    "document.getElementById('formUrl').textContent=data.site.url;",
    "document.getElementById('formVisit').href=data.site.url;",
    "document.getElementById('formResult').style.display='block';",
    "}else{",
    "alert(data.error||'Failed');",
    "}",
    "});",
    "});",
    "",
    "document.getElementById('formCopy').addEventListener('click',function(){",
    "navigator.clipboard.writeText(document.getElementById('formUrl').textContent);",
    "alert('Copied');",
    "});",
    "</script>"
  ].join("");

  res.send(page("Publish HTML to Link", content, script, req));
});

app.get("/api/check-slug", function (req, res) {
  const slug = slugify(req.query.slug);
  const db = getDB();
  const exists = (db.sites || []).some(function (site) {
    return site.slug === slug;
  });
  res.json({ 
    ok: true, 
    available: !exists && slug.length >= 2 
  });
});

/* ============================================================================
 * 19. LIVE EDITOR [Feature 47]
 * ============================================================================ */

app.get("/edit/:id", requireUser, function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site) {
    return res.status(404).send("Not found");
  }
  
  if (site.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).send("Access denied");
  }

  const content = [
    "<h1>Live Editor - " + escapeHTML(site.title) + "</h1>",
    "<div class='grid g2'>",
    "<div>",
    "<textarea class='inp' id='editorHtml' style='min-height:420px'>" + escapeHTML(site.rawHtml || site.html || "") + "</textarea>",
    "<textarea class='inp' id='editorCss' style='min-height:120px'>" + escapeHTML(site.rawCss || "") + "</textarea>",
    "<textarea class='inp' id='editorJs' style='min-height:120px'>" + escapeHTML(site.rawJs || "") + "</textarea>",
    "<div class='row'>",
    "<button class='btn btn-p btn-s' id='editorSave'>Save and Republish</button>",
    "<button class='btn btn-g btn-s' id='editorPreview'>Refresh Preview</button>",
    "</div>",
    "</div>",
    "<div>",
    "<iframe id='editorFrame' style='width:100%;height:600px;border:1px solid var(--bd);border-radius:16px;background:#fff'></iframe>",
    "</div>",
    "</div>"
  ].join("");

  const script = [
    "<script>",
    "var frame=document.getElementById('editorFrame');",
    "",
    "function buildPreview(){",
    "var html=document.getElementById('editorHtml').value;",
    "var css=document.getElementById('editorCss').value;",
    "var js=document.getElementById('editorJs').value;",
    "frame.srcdoc=html+'<style>'+css+'</style>'+'<scr'+'ipt>'+js+'</scr'+'ipt>';",
    "}",
    "",
    "document.getElementById('editorPreview').addEventListener('click',buildPreview);",
    "buildPreview();",
    "",
    "document.getElementById('editorSave').addEventListener('click',function(){",
    "fetch('/api/sites/" + site.id + "/update',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({",
    "html:document.getElementById('editorHtml').value,",
    "css:document.getElementById('editorCss').value,",
    "js:document.getElementById('editorJs').value",
    "})",
    "}).then(function(r){return r.json();}).then(function(data){",
    "alert(data.ok?'Saved':'Failed');",
    "});",
    "});",
    "</script>"
  ].join("");

  res.send(page("Editor", content, script, req));
});

/* ============================================================================
 * 20. DASHBOARD [Features 50-67]
 * ============================================================================ */

app.get("/dashboard", function (req, res) {
  const user = getLoggedUser(req);
  if (!user && !isLoggedAdmin(req)) {
    return res.redirect("/create");
  }

  const currentUser = user || { 
    id: "admin", 
    username: "Super Admin", 
    bio: "", 
    avatar: "", 
    plan: "vip" 
  };
  
  const db = getDB();
  const messages = (db.messages || []).filter(function (message) { 
    return message.to === currentUser.id; 
  });

  const content = [
    "<h1>My Project Vault</h1>",
    "<p>Author: <strong style='color:#fff'>" + escapeHTML(currentUser.username) + "</strong></p>",
    "<div class='tabs'>",
    "<div class='tab on' data-tab='panelSites'>Websites</div>",
    "<div class='tab' data-tab='panelStats'>Analytics</div>",
    "<div class='tab' data-tab='panelProfile'>Profile</div>",
    "<div class='tab' data-tab='panelMessages'>Inbox (" + messages.length + ")</div>",
    "<div class='tab' data-tab='panelBilling'>Billing</div>",
    "</div>",
    
    "<div id='panelSites' class='pane on'>",
    "<div class='row' style='margin-bottom:16px'>",
    "<a class='btn btn-p btn-s' href='/create'>New Site</a>",
    "<button class='btn btn-g btn-s' id='bulkDeleteButton'>Bulk Delete Selected</button>",
    "</div>",
    "<div id='vaultBox' class='grid g2'>Loading...</div>",
    "</div>",
    
    "<div id='panelStats' class='pane'>",
    "<div id='statsDetail' class='card'>Select a site from Websites tab, then press Stats.</div>",
    "</div>",
    
    "<div id='panelProfile' class='pane'>",
    "<div class='card' style='max-width:560px'>",
    "<h2>Edit Profile</h2>",
    (currentUser.avatar ? "<img class='avatar' style='width:70px;height:70px' src='" + escapeHTML(currentUser.avatar) + "'>" : ""),
    "<input class='inp' id='profileAvatar' placeholder='Avatar URL or dataURL'>",
    "<textarea class='inp' id='profileBio' placeholder='Bio'>" + escapeHTML(currentUser.bio || "") + "</textarea>",
    "<input class='inp' id='profileAccent' placeholder='Profile accent color e.g. #0a84ff' value='" + escapeHTML(currentUser.accent || "") + "'>",
    "<div class='row'>",
    "<button class='btn btn-p btn-s' id='profileSave'>Save Profile</button>",
    "<button class='btn btn-g btn-s' id='profileApiKey'>Generate API Key</button>",
    "<button class='btn btn-g btn-s' id='profileSessions'>Active Sessions</button>",
    "<button class='btn btn-d btn-s' id='profileDelete'>Delete Account</button>",
    "</div>",
    "<p id='profileApiKeyOutput' style='margin-top:12px;color:var(--ok);word-break:break-all'></p>",
    "</div>",
    "</div>",
    
    "<div id='panelMessages' class='pane'>",
    "<div class='card'>",
    "<h2>Inbox</h2>",
    "<div id='messagesBox'>",
    (messages.length > 0
      ? messages.map(function (message) {
          return "<p style='color:#fff'><strong>" + escapeHTML(message.fromName) + ":</strong> " + escapeHTML(message.text) + "</p>";
        }).join("")
      : "<p>No messages.</p>"
    ),
    "</div>",
    "<h3 style='margin-top:16px'>Send Message</h3>",
    "<input class='inp' id='messageTo' placeholder='Recipient username'>",
    "<textarea class='inp' id='messageText' placeholder='Message'></textarea>",
    "<button class='btn btn-p btn-s' id='messageSend'>Send</button>",
    "</div>",
    "</div>",
    
    "<div id='panelBilling' class='pane'>",
    "<div class='card'>",
    "<h2>Plans and Payments</h2>",
    "<p>Current plan: <span class='badge gold'>" + escapeHTML(currentUser.plan || "free") + "</span></p>",
    "<p>Free: 10 sites - Pro: 50 sites - VIP: unlimited</p>",
    "<div class='grid g2'>",
    "<input class='inp' id='paymentMethod' placeholder='bKash / Nagad'>",
    "<input class='inp' id='paymentTrxId' placeholder='TrxID'>",
    "<select class='inp' id='paymentPlan'>",
    "<option>pro</option>",
    "<option>vip</option>",
    "</select>",
    "</div>",
    "<button class='btn btn-p btn-s' id='paymentRequest'>Request Upgrade</button>",
    "<h3 style='margin-top:18px'>Redeem Coupon</h3>",
    "<div class='row'>",
    "<input class='inp' id='couponCode' placeholder='Coupon code' style='margin:0'>",
    "<button class='btn btn-g btn-s' id='couponRedeem'>Redeem</button>",
    "</div>",
    "</div>",
    "</div>"
  ].join("");

  const script = [
    "<script>",
    "function escapeHtml(value){",
    "return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');",
    "}",
    "",
    "document.addEventListener('click',function(e){",
    "var tab=e.target.closest('[data-tab]');",
    "if(!tab)return;",
    "var panes=document.querySelectorAll('.pane');",
    "for(var i=0;i<panes.length;i++){panes[i].classList.remove('on');}",
    "var tabs=document.querySelectorAll('.tab');",
    "for(var j=0;j<tabs.length;j++){tabs[j].classList.remove('on');}",
    "document.getElementById(tab.getAttribute('data-tab')).classList.add('on');",
    "tab.classList.add('on');",
    "});",
    "",
    "function loadVault(){",
    "fetch('/api/user/vault-data').then(function(r){return r.json();}).then(function(data){",
    "if(!data.ok)return;",
    "var box=document.getElementById('vaultBox');",
    "if(!data.sites.length){",
    "box.innerHTML='<div class=\"card\"><p>No sites yet.</p></div>';",
    "return;",
    "}",
    "box.innerHTML=data.sites.map(function(site){",
    "return '<div class=\"card\">' +",
    "'<div class=\"row\" style=\"justify-content:space-between\">' +",
    "'<span class=\"badge\">'+escapeHtml(site.category||'Site')+'</span>' +",
    "'<label style=\"font-size:12px;color:var(--mut)\">' +",
    "'<input type=\"checkbox\" class=\"sel\" data-id=\"'+site.id+'\"> select' +",
    "'</label></div>' +",
    "'<h3 style=\"margin-top:10px\">'+escapeHtml(site.title) +",
    "(site.draft?' <span class=\"badge\">Draft</span>':'') +",
    "(site.published?'':' <span class=\"badge dg\">Unpublished</span>') +",
    "'</h3>' +",
    "'<p>/'+escapeHtml(site.slug)+' - views '+(site.views||0)+' - likes '+((site.reactions||{}).like||0)+'</p>' +",
    "'<div class=\"row\">' +",
    "'<a class=\"btn btn-p btn-s\" target=\"_blank\" href=\"/site/'+escapeHtml(site.slug)+'\">Visit</a>' +",
    "'<a class=\"btn btn-g btn-s\" href=\"/edit/'+site.id+'\">Edit</a>' +",
    "'<button class=\"btn btn-g btn-s\" data-act=\"clone\" data-id=\"'+site.id+'\">Clone</button>' +",
    "'<button class=\"btn btn-g btn-s\" data-act=\"stats\" data-id=\"'+site.id+'\">Stats</button>' +",
    "'<button class=\"btn btn-g btn-s\" data-act=\"toggle\" data-id=\"'+site.id+'\">Toggle</button>' +",
    "'<button class=\"btn btn-d btn-s\" data-act=\"del\" data-id=\"'+site.id+'\">Delete</button>' +",
    "'</div></div>';",
    "}).join('');",
    "});",
    "}",
    "",
    "document.addEventListener('click',function(e){",
    "var button=e.target.closest('[data-act]');",
    "if(!button)return;",
    "var id=button.getAttribute('data-id');",
    "var action=button.getAttribute('data-act');",
    "",
    "if(action==='stats'){",
    "showStats(id);",
    "return;",
    "}",
    "",
    "if(action==='del'&&!confirm('Delete permanently?')){",
    "return;",
    "}",
    "",
    "var url=action==='clone'?'/api/sites/'+id+'/clone':",
    "(action==='del'?'/api/sites/'+id:'/api/sites/'+id+'/toggle');",
    "var options=action==='del'?{method:'DELETE'}:{method:'POST'};",
    "",
    "fetch(url,options).then(function(r){return r.json();}).then(function(data){",
    "if(data.ok){",
    "loadVault();",
    "}else{",
    "alert(data.error||'Failed');",
    "}",
    "});",
    "});",
    "",
    "function showStats(id){",
    "fetch('/api/sites/'+id+'/stats').then(function(r){return r.json();}).then(function(data){",
    "if(!data.ok)return;",
    "var site=data.stats;",
    "var days=Object.keys(site.byDay||{}).sort().slice(-14);",
    "var maxViews=1;",
    "days.forEach(function(day){",
    "if(site.byDay[day]>maxViews){maxViews=site.byDay[day];}",
    "});",
    "",
    "document.getElementById('statsDetail').innerHTML=",
    "'<h2>'+escapeHtml(site.title)+'</h2>' +",
    "'<div class=\"grid g4\">' +",
    "'<div class=\"stat\"><b>'+(site.views||0)+'</b><span>Views</span></div>' +",
    "'<div class=\"stat\"><b>'+(site.uniqueViews||0)+'</b><span>Unique</span></div>' +",
    "'<div class=\"stat\"><b>'+Math.round((site.totalSeconds||0)/60)+'</b><span>Minutes</span></div>' +",
    "'<div class=\"stat\"><b>'+((site.ratingCount||0)?(site.ratingSum/site.ratingCount).toFixed(1):'0')+'</b><span>Rating</span></div>' +",
    "'</div>' +",
    "'<div class=\"bars\">'+days.map(function(day){",
    "return '<div style=\"height:'+Math.max(4,(site.byDay[day]/maxViews)*100)+'%\" title=\"'+day+':'+site.byDay[day]+'\"></div>';",
    "}).join('')+'</div>' +",
    "'<p>Devices: '+JSON.stringify(site.devices||{})+'</p>' +",
    "'<p>Referrers: '+JSON.stringify(site.refs||{})+'</p>' +",
    "'<a class=\"btn btn-g btn-s\" href=\"/api/sites/'+id+'/stats.csv\">Export CSV</a>';",
    "});",
    "}",
    "",
    "document.getElementById('bulkDeleteButton').addEventListener('click',function(){",
    "var ids=[];",
    "var checkboxes=document.querySelectorAll('.sel:checked');",
    "for(var i=0;i<checkboxes.length;i++){",
    "ids.push(checkboxes[i].getAttribute('data-id'));",
    "}",
    "if(!ids.length){",
    "alert('Select sites');",
    "return;",
    "}",
    "if(!confirm('Delete selected?')){",
    "return;",
    "}",
    "fetch('/api/sites/bulk',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({ids:ids,action:'delete'})",
    "}).then(function(){",
    "loadVault();",
    "});",
    "});",
    "",
    "document.getElementById('profileSave').addEventListener('click',function(){",
    "fetch('/api/profile/update',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({",
    "avatar:document.getElementById('profileAvatar').value,",
    "bio:document.getElementById('profileBio').value,",
    "accent:document.getElementById('profileAccent').value",
    "})",
    "}).then(function(r){return r.json();}).then(function(data){",
    "alert(data.ok?'Saved':data.error);",
    "});",
    "});",
    "",
    "document.getElementById('profileApiKey').addEventListener('click',function(){",
    "fetch('/api/profile/apikey',{method:'POST'}).then(function(r){return r.json();}).then(function(data){",
    "document.getElementById('profileApiKeyOutput').textContent='API Key: '+data.key;",
    "});",
    "});",
    "",
    "document.getElementById('profileSessions').addEventListener('click',function(){",
    "fetch('/api/auth/sessions').then(function(r){return r.json();}).then(function(data){",
    "alert('Active sessions: '+data.count);",
    "});",
    "});",
    "",
    "document.getElementById('profileDelete').addEventListener('click',function(){",
    "if(confirm('Delete account? 7 day grace period.')){",
    "fetch('/api/profile/delete',{method:'POST'}).then(function(){",
    "location.href='/';",
    "});",
    "}",
    "});",
    "",
    "document.getElementById('messageSend').addEventListener('click',function(){",
    "fetch('/api/messages/send',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({",
    "to:document.getElementById('messageTo').value,",
    "text:document.getElementById('messageText').value",
    "})",
    "}).then(function(r){return r.json();}).then(function(data){",
    "alert(data.ok?'Sent':data.error);",
    "});",
    "});",
    "",
    "document.getElementById('paymentRequest').addEventListener('click',function(){",
    "fetch('/api/payments/request',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({",
    "method:document.getElementById('paymentMethod').value,",
    "trxId:document.getElementById('paymentTrxId').value,",
    "plan:document.getElementById('paymentPlan').value",
    "})",
    "}).then(function(r){return r.json();}).then(function(data){",
    "alert(data.ok?'Request submitted':data.error);",
    "});",
    "});",
    "",
    "document.getElementById('couponRedeem').addEventListener('click',function(){",
    "fetch('/api/coupons/redeem',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({code:document.getElementById('couponCode').value})",
    "}).then(function(r){return r.json();}).then(function(data){",
    "alert(data.ok?'Coupon applied':data.error);",
    "if(data.ok){location.reload();}",
    "});",
    "});",
    "",
    "loadVault();",
    "</script>"
  ].join("");

  res.send(page("My Vault", content, script, req));
});

/* ============================================================================
 * 21. PUBLIC PROFILE [Features 62-64]
 * ============================================================================ */

app.get("/u/:username", function (req, res) {
  const db = getDB();
  const profileUser = (db.users || []).find(function (user) {
    return user.username.toLowerCase() === req.params.username.toLowerCase();
  });
  
  if (!profileUser) {
    return res.status(404).send("User not found");
  }

  const userSites = (db.sites || []).filter(function (site) {
    return site.userId === profileUser.id && site.published;
  });
  
  const totalViews = userSites.reduce(function (sum, site) {
    return sum + (site.views || 0);
  }, 0);
  
  const followers = (db.users || []).filter(function (user) {
    return (user.following || []).indexOf(profileUser.id) !== -1;
  }).length;
  
  const currentUser = getLoggedUser(req);
  const accentColor = profileUser.accent || "#0a84ff";
  const isVip = profileUser.id === SPECIAL_VIP_ID || profileUser.plan === "vip";

  const content = [
    "<div class='card' style='text-align:center'>",
    (profileUser.avatar ? "<img class='avatar' style='width:90px;height:90px;margin-bottom:12px' src='" + escapeHTML(profileUser.avatar) + "'>" : ""),
    "<h1 style='margin-bottom:6px'>" + escapeHTML(profileUser.username) + " ",
    (profileUser.verified ? "<span class='badge ok'>Verified</span> " : ""),
    (isVip ? "<span class='badge gold'>VIP</span>" : ""),
    "</h1>",
    "<p>" + escapeHTML(profileUser.bio || "No bio yet.") + "</p>",
    "<p style='font-size:13px'>" + userSites.length + " sites - " + totalViews + " views - " + followers + " followers</p>",
    "<img src='https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" + encodeURIComponent("/u/" + profileUser.username) + "' style='margin-top:10px;border-radius:12px' alt='qr'>",
    "<div class='row' style='justify-content:center;margin-top:14px'>",
    (currentUser && currentUser.id !== profileUser.id ? "<button class='btn btn-p btn-s' id='followButton'>Follow</button>" : ""),
    "</div>",
    "</div>",
    "<div class='grid g2'>",
    (userSites.length > 0
      ? userSites.map(function (site) {
          return [
            "<div class='card'>",
            "<span class='badge' style='background:" + accentColor + "22;color:" + accentColor + "'>" + escapeHTML(site.category || "Site") + "</span>",
            "<h3 style='margin-top:10px'>" + escapeHTML(site.title) + "</h3>",
            "<p>" + (site.views || 0) + " views</p>",
            "<a class='btn btn-p btn-s' target='_blank' href='/site/" + escapeHTML(site.slug) + "'>Visit</a>",
            "</div>"
          ].join("");
        }).join("")
      : "<div class='card'><p>No public sites.</p></div>"
    ),
    "</div>"
  ].join("");

  const script = 
    currentUser && currentUser.id !== profileUser.id
      ? "<script>document.getElementById('followButton').addEventListener('click',function(){" +
        "fetch('/api/users/" + profileUser.id + "/follow',{method:'POST'}).then(function(r){return r.json();}).then(function(data){" +
        "alert(data.ok?(data.following?'Following':'Unfollowed'):'Failed');" +
        "});" +
        "});</script>"
      : "";

  res.send(page(profileUser.username, content, script, req));
});

/* ============================================================================
 * 22. POSTS [Features 68-73]
 * ============================================================================ */

app.get("/posts", function (req, res) {
  const db = getDB();
  const folders = db.folders || ["General"];
  const posts = db.posts || [];

  const content = [
    "<h1>Posts and Guides</h1>",
    "<div class='tabs'>",
    "<div class='tab on' data-folder='ALL'>All</div>",
    folders.map(function (folder) {
      return "<div class='tab' data-folder='" + escapeHTML(folder) + "'>" + escapeHTML(folder) + "</div>";
    }).join(""),
    "</div>",
    "<div id='postList' class='grid g2'>",
    (posts.length > 0
      ? posts.map(function (post) {
          return [
            "<div class='card postFilter' data-folder='" + escapeHTML(post.folder || "General") + "'>",
            (post.pinned ? "<span class='badge gold'>Pinned</span> " : ""),
            "<span class='badge'>" + escapeHTML(post.folder || "General") + "</span>",
            "<h3 style='margin-top:10px'>" + escapeHTML(post.title) + "</h3>",
            "<p>" + escapeHTML((post.bio || (post.content || "")).slice(0, 100)) + "</p>",
            "<div class='row'>",
            "<a class='btn btn-p btn-s' href='/post/" + escapeHTML(post.slug) + "'>Read Article</a>",
            "<span style='font-size:12px;color:var(--mut);align-self:center'>" + (post.likes || 0) + " likes - " + (post.comments || []).length + " comments</span>",
            "</div>",
            "</div>"
          ].join("");
        }).join("")
      : "<div class='card'><p>No posts yet.</p></div>"
    ),
    "</div>",
    "<div class='card'>",
    "<h3>Newsletter</h3>",
    "<div class='row'>",
    "<input class='inp' id='newsletterEmail' placeholder='Your email' style='margin:0'>",
    "<button class='btn btn-p btn-s' id='newsletterButton'>Subscribe</button>",
    "</div>",
    "</div>"
  ].join("");

  const script = [
    "<script>",
    "document.addEventListener('click',function(e){",
    "var tab=e.target.closest('[data-folder]');",
    "if(!tab)return;",
    "",
    "var tabs=document.querySelectorAll('.tabs .tab');",
    "for(var i=0;i<tabs.length;i++){",
    "tabs[i].classList.remove('on');",
    "}",
    "tab.classList.add('on');",
    "",
    "var folder=tab.getAttribute('data-folder');",
    "var cards=document.querySelectorAll('.postFilter');",
    "for(var j=0;j<cards.length;j++){",
    "cards[j].style.display=(folder==='ALL'||cards[j].getAttribute('data-folder')===folder)?'':'none';",
    "}",
    "});",
    "",
    "document.getElementById('newsletterButton').addEventListener('click',function(){",
    "fetch('/api/newsletter',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({email:document.getElementById('newsletterEmail').value})",
    "}).then(function(r){return r.json();}).then(function(data){",
    "alert(data.ok?'Subscribed':data.error);",
    "});",
    "});",
    "</script>"
  ].join("");

  res.send(page("Posts", content, script, req));
});

app.get("/post/:slug", function (req, res) {
  const db = getDB();
  const post = (db.posts || []).find(function (p) { 
    return p.slug === req.params.slug; 
  });
  
  if (!post) {
    return res.status(404).send("Post not found");
  }

  post.views = (post.views || 0) + 1;
  saveDB(db);

  const content = [
    "<div class='card'>",
    "<span class='badge'>" + escapeHTML(post.folder || "General") + "</span>",
    "<h1 style='margin-top:12px'>" + escapeHTML(post.title) + "</h1>",
    "<p style='font-size:13px'>By " + escapeHTML(post.author) + " - " + (post.views || 0) + " views</p>",
    "<div style='margin:18px 0;line-height:1.9;color:#e5e5ea'>" + mdLite(post.content || "") + "</div>",
    "<div class='row'>",
    "<button class='btn btn-g btn-s' id='likeButton'>Like (" + (post.likes || 0) + ")</button>",
    "</div>",
    "</div>",
    "<div class='card'>",
    "<h3>Comments (" + (post.comments || []).length + ")</h3>",
    ((post.comments || []).length > 0
      ? (post.comments || []).map(function (comment) {
          return [
            "<div style='padding:12px 0;border-bottom:1px solid var(--bd)'>",
            "<strong>" + escapeHTML(comment.author) + "</strong>",
            "<p style='margin:6px 0 0'>" + escapeHTML(comment.text) + "</p>",
            "</div>"
          ].join("");
        }).join("")
      : "<p>No comments.</p>"
    ),
    "<div style='margin-top:16px'>",
    "<input class='inp' id='commentAuthor' placeholder='Your name'>",
    "<textarea class='inp' id='commentText' placeholder='Comment'></textarea>",
    "<button class='btn btn-p btn-s' id='commentButton'>Post Comment</button>",
    "</div>",
    "</div>"
  ].join("");

  const script = [
    "<script>",
    "document.getElementById('likeButton').addEventListener('click',function(){",
    "fetch('/api/posts/" + post.id + "/like',{method:'POST'}).then(function(){",
    "location.reload();",
    "});",
    "});",
    "",
    "document.getElementById('commentButton').addEventListener('click',function(){",
    "fetch('/api/posts/" + post.id + "/comment',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({",
    "author:document.getElementById('commentAuthor').value,",
    "text:document.getElementById('commentText').value",
    "})",
    "}).then(function(){",
    "location.reload();",
    "});",
    "});",
    "</script>"
  ].join("");

  res.send(page(post.title, content, script, req));
});

/* ============================================================================
 * 23. SEARCH [Feature 74]
 * ============================================================================ */

app.get("/search", function (req, res) {
  const query = String(req.query.q || "").toLowerCase();
  const db = getDB();
  let sites = [];
  let posts = [];

  if (query) {
    sites = (db.sites || [])
      .filter(function (site) {
        return site.published && 
          (site.title + " " + site.bio + " " + (site.tags || []).join(" "))
            .toLowerCase()
            .indexOf(query) !== -1;
      })
      .slice(0, 20);
    
    posts = (db.posts || [])
      .filter(function (post) {
        return (post.title + " " + post.content)
          .toLowerCase()
          .indexOf(query) !== -1;
      })
      .slice(0, 20);
  }

  const content = [
    "<h1>Search</h1>",
    "<form method='GET' action='/search'>",
    "<div class='row'>",
    "<input class='inp' name='q' value='" + escapeHTML(query) + "' placeholder='Search sites, tags, posts' style='margin:0'>",
    "<button class='btn btn-p'>Search</button>",
    "</div>",
    "</form>",
    (query
      ? [
          "<h2 style='margin-top:24px'>Websites (" + sites.length + ")</h2>",
          "<div class='grid g2'>",
          sites.map(function (site) {
            return [
              "<div class='card'>",
              "<h3>" + escapeHTML(site.title) + "</h3>",
              "<p>" + escapeHTML((site.bio || "").slice(0, 80)) + "</p>",
              "<a class='btn btn-p btn-s' target='_blank' href='/site/" + escapeHTML(site.slug) + "'>Visit</a>",
              "</div>"
            ].join("");
          }).join(""),
          "</div>",
          "<h2>Posts (" + posts.length + ")</h2>",
          "<div class='grid g2'>",
          posts.map(function (post) {
            return [
              "<div class='card'>",
              "<h3>" + escapeHTML(post.title) + "</h3>",
              "<a class='btn btn-g btn-s' href='/post/" + escapeHTML(post.slug) + "'>Read</a>",
              "</div>"
            ].join("");
          }).join(""),
          "</div>"
        ].join("")
      : ""
    )
  ].join("");

  res.send(page("Search", content, "", req));
});

/* ============================================================================
 * 24. SITE SERVING [Features 56, 75-77]
 * ============================================================================ */

app.get("/site/:slug", function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.slug === req.params.slug; 
  });
  
  if (!site || site.published === false || site.draft) {
    return res.status(404).send("Website not found or private.");
  }

  /* [Feature 44] Domain lock */
  if (site.domainLock) {
    const host = (req.get("host") || "").split(":")[0];
    if (host !== site.domainLock) {
      return res.status(403).send("Domain locked by author.");
    }
  }

  /* [Feature 42] Expiry */
  if (site.expiresAt && new Date(site.expiresAt).getTime() < Date.now()) {
    return res.status(403).send("This website has expired.");
  }

  /* [Feature 43] View limit */
  if (site.viewLimit && (site.views || 0) >= site.viewLimit) {
    return res.status(403).send("View limit reached.");
  }

  /* [Feature 36] Password gate */
  if (site.sitePassword) {
    const enteredPassword = req.query.pass;
    if (!enteredPassword || hashPassword(enteredPassword) !== site.sitePassword) {
      return res.send([
        "<!DOCTYPE html>",
        "<html>",
        "<head>",
        "<meta charset='utf-8'>",
        "<title>Locked</title>",
        "</head>",
        "<body style='background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>",
        "<form method='GET' style='background:#111;padding:34px;border-radius:18px;text-align:center'>",
        "<h2>Password Protected</h2>",
        "<p style='color:#999'>Locked by author</p>",
        "<input name='pass' type='password' style='padding:12px;width:100%;margin:12px 0;background:#222;border:1px solid #333;color:#fff;border-radius:10px'>",
        "<button style='padding:12px;width:100%;background:#0a84ff;border:none;color:#fff;border-radius:10px;font-weight:700'>Unlock</button>",
        "</form>",
        "</body>",
        "</html>"
      ].join(""));
    }
  }

  /* [Feature 56] Unique visitor tracking */
  const visitorId = getCookie(req, "sv_uid");
  const isNewVisitor = !visitorId;
  
  if (isNewVisitor) {
    res.cookie("sv_uid", genId(8), { 
      maxAge: 365 * 86400000, 
      path: "/" 
    });
  }
  
  const seenKey = visitorId || "new";
  site.seen = site.seen || {};
  let isUnique = false;
  
  if (!site.seen[seenKey] && Object.keys(site.seen).length < 8000) {
    site.seen[seenKey] = 1;
    isUnique = true;
  }

  /* Analytics counters */
  site.views = (site.views || 0) + 1;
  if (isUnique) {
    site.uniqueViews = (site.uniqueViews || 0) + 1;
  }
  
  const day = new Date().toISOString().slice(0, 10);
  site.byDay = site.byDay || {};
  site.byDay[day] = (site.byDay[day] || 0) + 1;
  
  site.devices = site.devices || {};
  const device = parseUA(req.headers["user-agent"]);
  site.devices[device] = (site.devices[device] || 0) + 1;
  
  const referrerRaw = req.headers.referer || "";
  let referrerHost = "direct";
  
  if (referrerRaw) {
    try {
      referrerHost = new URL(referrerRaw).hostname;
    } catch (err) {
      referrerHost = "direct";
    }
  }
  
  site.refs = site.refs || {};
  site.refs[referrerHost] = (site.refs[referrerHost] || 0) + 1;
  
  saveDB(db);
  liveMap.set(req.ip || "x", Date.now());

  /* Build final HTML */
  let output = site.html || "";
  const owner = (db.users || []).find(function (user) { 
    return user.id === site.userId; 
  });
  const plan = (owner && owner.plan) || "free";

  const headTags = [];
  if (site.seoTitle) {
    headTags.push("<title>" + escapeHTML(site.seoTitle) + "</title>");
  }
  if (site.seoDesc) {
    headTags.push("<meta name='description' content='" + escapeHTML(site.seoDesc) + "'>");
  }
  if (site.seoImage) {
    headTags.push("<meta property='og:image' content='" + escapeHTML(site.seoImage) + "'>");
    headTags.push("<meta property='og:title' content='" + escapeHTML(site.title) + "'>");
  }
  if (site.favicon) {
    headTags.push("<link rel='icon' href='" + escapeHTML(site.favicon) + "'>");
  }
  
  if (headTags.length > 0) {
    const headBlock = headTags.join("\n");
    if (output.indexOf("<head>") !== -1) {
      output = output.replace("<head>", "<head>\n" + headBlock);
    } else {
      output = headBlock + "\n" + output;
    }
  }

  /* [Feature 76] Watermark for free plan */
  if (db.settings.watermarkFree && plan === "free") {
    output += [
      "<div style='position:fixed;bottom:10px;right:10px;",
      "background:rgba(0,0,0,.7);color:#fff;font:12px sans-serif;",
      "padding:6px 10px;border-radius:8px;z-index:99999'>",
      "Hosted on " + escapeHTML(db.settings.siteName),
      "</div>"
    ].join("");
  }

  /* [Feature 77] Ad injection for free plan */
  if (db.settings.adCode && plan === "free") {
    output += db.settings.adCode;
  }

  /* [Feature 37] Anti theft */
  if (site.antiTheft) {
    output += ANTI_THEFT_SCRIPT;
  }

  /* [Feature 55] Time on page beacon */
  output += [
    "<script>",
    "setTimeout(function(){",
    "try{",
    "var seconds=Math.min(600,Math.round(performance.now()/1000));",
    "fetch('/api/site/" + site.id + "/beat',{",
    "method:'POST',",
    "headers:{'Content-Type':'application/json'},",
    "body:JSON.stringify({sec:seconds})",
    "});",
    "}catch(e){}",
    "},8000);",
    "</script>"
  ].join("");

  /* [Feature 38] Obfuscation */
  if (site.obfuscate) {
    const base64 = Buffer.from(output, "utf8").toString("base64");
    output = [
      "<!DOCTYPE html>",
      "<html>",
      "<head>",
      "<meta charset='utf-8'>",
      "</head>",
      "<body>",
      "<script>document.write(atob('" + base64 + "'));</script>",
      "</body>",
      "</html>"
    ].join("");
  }

  siteCache.set(site.slug, output);
  sendBody(req, res, 200, "text/html; charset=utf-8", output);
});

app.get("/site/:slug/download", function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.slug === req.params.slug; 
  });
  
  if (!site) {
    return res.status(404).send("Not found");
  }
  
  res.setHeader("Content-Disposition", "attachment; filename=\"" + site.slug + ".html\"");
  res.type("html").send(site.rawHtml || site.html || "");
});

app.get("/site/:slug/embed", function (req, res) {
  res.type("html").send([
    "<!DOCTYPE html>",
    "<html>",
    "<body style='margin:0'>",
    "<iframe src='/site/" + escapeHTML(req.params.slug) + "' style='width:100%;height:100vh;border:0'></iframe>",
    "</body>",
    "</html>"
  ].join(""));
});

/* ============================================================================
 * 25. PWA, RSS, HEALTH [Features 80-83]
 * ============================================================================ */

app.get("/manifest.webmanifest", function (req, res) {
  res.type("application/manifest+json").send(JSON.stringify({
    name: "SJEMAR OLED",
    short_name: "SJEMAR",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: []
  }));
});

app.get("/sw.js", function (req, res) {
  res.type("application/javascript").send([
    "self.addEventListener('install',function(event){",
    "self.skipWaiting();",
    "});",
    "",
    "self.addEventListener('fetch',function(event){",
    "if(event.request.method!=='GET'){return;}",
    "event.respondWith(",
    "caches.open('sjemar-v1').then(function(cache){",
    "return cache.match(event.request).then(function(response){",
    "return response||fetch(event.request).then(function(networkResponse){",
    "cache.put(event.request,networkResponse.clone());",
    "return networkResponse;",
    "});",
    "});",
    ")",
    ");",
    "});"
  ].join("\n"));
});

app.get("/rss.xml", function (req, res) {
  const db = getDB();
  const items = (db.posts || [])
    .slice(0, 20)
    .map(function (post) {
      return [
        "<item>",
        "<title>" + escapeHTML(post.title) + "</title>",
        "<link>/post/" + escapeHTML(post.slug) + "</link>",
        "<description>" + escapeHTML(post.bio || "") + "</description>",
        "</item>"
      ].join("");
    })
    .join("");
  
  res.type("application/rss+xml").send([
    "<?xml version='1.0'?>",
    "<rss version='2.0'>",
    "<channel>",
    "<title>SJEMAR</title>",
    items,
    "</channel>",
    "</rss>"
  ].join(""));
});

app.get("/healthz", function (req, res) {
  res.json({ 
    ok: true, 
    uptime: process.uptime(), 
    memory: process.memoryUsage().heapUsed 
  });
});

/* ============================================================================
 * 26. AUTH APIs [Feature 31]
 * ============================================================================ */

app.post("/api/auth/quick-auth", function (req, res) {
  const db = getDB();
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();
  const saveMe = Boolean(req.body.saveMe);

  if (!username || !password) {
    return res.status(400).json({ 
      ok: false, 
      error: "Username and password required" 
    });
  }
  
  if (!db.settings.registrationOpen && (db.users || []).length === 0) {
    return res.status(403).json({ 
      ok: false, 
      error: "Registration closed" 
    });
  }

  let user = (db.users || []).find(function (u) {
    return u.username.toLowerCase() === username.toLowerCase();
  });

  if (user) {
    if (user.banned) {
      return res.status(403).json({ 
        ok: false, 
        error: "Account suspended by admin" 
      });
    }
    if (user.deletedAt) {
      return res.status(403).json({ 
        ok: false, 
        error: "Account deleted" 
      });
    }
    if (user.password !== hashPassword(password)) {
      return res.status(401).json({ 
        ok: false, 
        error: "Incorrect password" 
      });
    }
  } else {
    user = {
      id: genId(),
      username: username,
      password: hashPassword(password),
      role: "user",
      plan: "free",
      banned: false,
      verified: false,
      following: [],
      bio: "",
      avatar: "",
      accent: "",
      createdAt: new Date().toISOString()
    };
    
    db.users.push(user);
    addLog("USER_REGISTER", "User registered: " + username + " ua=" + parseUA(req.headers["user-agent"]));
    notify("New creator joined: " + username);
    saveDB(db);
  }

  user.lastLogin = new Date().toISOString();
  saveDB(db);

  const token = genId(24);
  userSessions.set(token, { 
    userId: user.id, 
    saveMe: saveMe, 
    created: Date.now(), 
    userAgent: parseUA(req.headers["user-agent"]) 
  });
  
  res.cookie("sj_user_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: (saveMe ? 60 : 2) * 86400000
  });
  
  addLog("USER_LOGIN", username + " from " + parseUA(req.headers["user-agent"]));
  res.json({ 
    ok: true, 
    user: { 
      id: user.id, 
      username: user.username 
    } 
  });
});

app.post("/api/auth/logout", function (req, res) {
  const token = getCookie(req, "sj_user_token");
  if (token) {
    userSessions.delete(token);
  }
  res.clearCookie("sj_user_token", { path: "/" });
  res.json({ ok: true });
});

app.get("/logout", function (req, res) {
  const token = getCookie(req, "sj_user_token");
  if (token) {
    userSessions.delete(token);
  }
  res.clearCookie("sj_user_token", { path: "/" });
  res.redirect("/");
});

app.get("/api/auth/me", function (req, res) {
  const user = getLoggedUser(req);
  if (user) {
    return res.json({ 
      ok: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        plan: user.plan 
      } 
    });
  }
  if (isLoggedAdmin(req)) {
    return res.json({ 
      ok: true, 
      user: { 
        id: "admin", 
        username: "Super Admin", 
        role: "admin", 
        plan: "vip" 
      } 
    });
  }
  res.json({ ok: false });
});

app.get("/api/auth/sessions", requireUser, function (req, res) {
  let count = 0;
  userSessions.forEach(function (session) {
    if (session.userId === req.user.id) {
      count = count + 1;
    }
  });
  res.json({ ok: true, count: count });
});

app.post("/api/auth/logout-all", requireUser, function (req, res) {
  userSessions.forEach(function (session, token) {
    if (session.userId === req.user.id) {
      userSessions.delete(token);
    }
  });
  res.clearCookie("sj_user_token", { path: "/" });
  res.json({ ok: true });
});

/* ============================================================================
 * 27. PROFILE APIs [Features 58-61]
 * ============================================================================ */

app.post("/api/profile/update", requireUser, function (req, res) {
  const db = getDB();
  const user = (db.users || []).find(function (u) { 
    return u.id === req.user.id; 
  });
  
  if (!user) {
    return res.status(404).json({ ok: false });
  }
  
  if (req.body.avatar !== undefined) {
    user.avatar = String(req.body.avatar).slice(0, 400000);
  }
  if (req.body.bio !== undefined) {
    user.bio = String(req.body.bio).slice(0, 500);
  }
  if (req.body.accent !== undefined) {
    user.accent = String(req.body.accent).slice(0, 20);
  }
  
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/profile/apikey", requireUser, function (req, res) {
  const db = getDB();
  const user = (db.users || []).find(function (u) { 
    return u.id === req.user.id; 
  });
  
  if (!user) {
    return res.status(404).json({ ok: false });
  }
  
  user.apiKey = "sjk_" + genId(16);
  saveDB(db);
  res.json({ ok: true, key: user.apiKey });
});

app.post("/api/profile/delete", requireUser, function (req, res) {
  const db = getDB();
  const user = (db.users || []).find(function (u) { 
    return u.id === req.user.id; 
  });
  
  if (!user) {
    return res.status(404).json({ ok: false });
  }
  
  user.deletedAt = new Date().toISOString();
  saveDB(db);
  addLog("USER_DELETE_REQUEST", user.username);
  res.json({ ok: true });
});

/* ============================================================================
 * 28. PUBLISH API [Features 32-45]
 * ============================================================================ */

app.post("/api/publish", requireUser, function (req, res) {
  const body = req.body || {};
  
  if (!body.title || !body.html) {
    return res.status(400).json({ 
      ok: false, 
      error: "Title and HTML required" 
    });
  }

  const db = getDB();
  const plan = req.user.plan || "free";
  const userSites = (db.sites || []).filter(function (site) { 
    return site.userId === req.user.id; 
  }).length;
  
  const limits = { free: 10, pro: 50, vip: 5000 };
  
  if (userSites >= (limits[plan] || 10)) {
    return res.status(403).json({ 
      ok: false, 
      error: "Plan limit reached. Upgrade your plan." 
    });
  }

  let slug = slugify(body.slug || body.title);
  if (!slug) {
    slug = "site-" + genId(4);
  }
  
  if ((db.sites || []).some(function (site) { return site.slug === slug; })) {
    return res.status(409).json({ 
      ok: false, 
      error: "Slug already taken" 
    });
  }

  let fullHtml = body.html;
  if (body.css && body.css.trim()) {
    fullHtml = "<style>\n" + body.css + "\n</style>\n" + fullHtml;
  }
  if (body.js && body.js.trim()) {
    fullHtml = fullHtml + "\n<script>\n" + body.js + "\n</script>\n";
  }

  const site = {
    id: genId(),
    userId: req.user.id,
    authorName: req.user.username,
    title: String(body.title).slice(0, 120),
    slug: slug,
    bio: body.bio || "",
    category: body.category || "General",
    tags: String(body.tags || "")
      .split(",")
      .map(function (tag) { return tag.trim(); })
      .filter(Boolean),
    collection: body.collection || "",
    rawHtml: body.html,
    rawCss: body.css || "",
    rawJs: body.js || "",
    seoTitle: body.seoTitle || "",
    seoDesc: body.seoDesc || "",
    seoImage: body.seoImage || "",
    favicon: body.favicon || "",
    scheduledAt: body.scheduledAt || null,
    expiresAt: body.expiresAt || null,
    viewLimit: Number(body.viewLimit || 0),
    domainLock: body.domainLock || "",
    antiTheft: body.antiTheft !== false,
    obfuscate: Boolean(body.obfuscate),
    allowClone: body.allowClone !== false,
    draft: Boolean(body.draft) || Boolean(body.scheduledAt),
    published: !body.draft && !body.scheduledAt,
    sitePassword: body.sitePassword ? hashPassword(body.sitePassword) : null,
    html: fullHtml,
    views: 0,
    uniqueViews: 0,
    totalSeconds: 0,
    reactions: {},
    ratingSum: 0,
    ratingCount: 0,
    comments: [],
    versions: [],
    seen: {},
    byDay: {},
    devices: {},
    refs: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.sites.unshift(site);
  saveDB(db);
  addLog("SITE_PUBLISH", site.title + " by " + req.user.username);
  webhookSend("New site published: " + site.title);

  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  res.json({ 
    ok: true, 
    site: { 
      url: protocol + "://" + req.get("host") + "/site/" + site.slug 
    } 
  });
});

/* ============================================================================
 * 29. SITE MANAGEMENT APIs [Features 48-57]
 * ============================================================================ */

app.get("/api/user/vault-data", requireUser, function (req, res) {
  const db = getDB();
  const userSites = (db.sites || []).filter(function (site) {
    return site.userId === req.user.id || req.user.role === "admin";
  });
  res.json({ ok: true, sites: userSites });
});

app.post("/api/sites/:id/update", requireUser, function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site || (site.userId !== req.user.id && req.user.role !== "admin")) {
    return res.status(403).json({ ok: false });
  }
  
  site.versions = site.versions || [];
  site.versions.unshift({ 
    ts: new Date().toISOString(), 
    rawHtml: site.rawHtml, 
    rawCss: site.rawCss, 
    rawJs: site.rawJs 
  });
  
  if (site.versions.length > 5) {
    site.versions = site.versions.slice(0, 5);
  }

  site.rawHtml = req.body.html || site.rawHtml;
  site.rawCss = req.body.css !== undefined ? req.body.css : site.rawCss;
  site.rawJs = req.body.js !== undefined ? req.body.js : site.rawJs;

  let fullHtml = site.rawHtml;
  if (site.rawCss) {
    fullHtml = "<style>\n" + site.rawCss + "\n</style>\n" + fullHtml;
  }
  if (site.rawJs) {
    fullHtml = fullHtml + "\n<script>\n" + site.rawJs + "\n</script>\n";
  }
  
  site.html = fullHtml;
  site.updatedAt = new Date().toISOString();
  siteCache.delete(site.slug);
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/sites/:id/rollback", requireUser, function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site || (site.userId !== req.user.id && req.user.role !== "admin")) {
    return res.status(403).json({ ok: false });
  }
  
  const version = (site.versions || [])[Number(req.body.index || 0)];
  if (!version) {
    return res.status(404).json({ 
      ok: false, 
      error: "Version not found" 
    });
  }
  
  site.rawHtml = version.rawHtml;
  site.rawCss = version.rawCss;
  site.rawJs = version.rawJs;
  
  let fullHtml = site.rawHtml;
  if (site.rawCss) {
    fullHtml = "<style>\n" + site.rawCss + "\n</style>\n" + fullHtml;
  }
  if (site.rawJs) {
    fullHtml = fullHtml + "\n<script>\n" + site.rawJs + "\n</script>\n";
  }
  
  site.html = fullHtml;
  siteCache.delete(site.slug);
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/sites/:id/clone", requireUser, function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site) {
    return res.status(404).json({ ok: false });
  }
  
  if (site.userId !== req.user.id && req.user.role !== "admin" && !site.allowClone) {
    return res.status(403).json({ ok: false });
  }
  
  const clonedSite = Object.assign({}, site, {
    id: genId(),
    userId: req.user.id,
    authorName: req.user.username,
    title: site.title + " (Copy)",
    slug: site.slug + "-copy-" + genId(3),
    views: 0,
    uniqueViews: 0,
    reactions: {},
    comments: [],
    seen: {},
    byDay: {},
    devices: {},
    refs: {},
    draft: true,
    published: false,
    createdAt: new Date().toISOString()
  });
  
  db.sites.unshift(clonedSite);
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/sites/:id/toggle", requireUser, function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site || (site.userId !== req.user.id && req.user.role !== "admin")) {
    return res.status(403).json({ ok: false });
  }
  
  site.published = !site.published;
  site.draft = false;
  siteCache.delete(site.slug);
  saveDB(db);
  res.json({ ok: true });
});

app.delete("/api/sites/:id", requireUser, function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site || (site.userId !== req.user.id && req.user.role !== "admin")) {
    return res.status(403).json({ ok: false });
  }
  
  db.sites = db.sites.filter(function (s) { 
    return s.id !== req.params.id; 
  });
  siteCache.delete(site.slug);
  saveDB(db);
  addLog("SITE_DELETE", site.title);
  res.json({ ok: true });
});

app.post("/api/sites/bulk", requireUser, function (req, res) {
  const db = getDB();
  const ids = req.body.ids || [];
  
  if (req.body.action === "delete") {
    db.sites = (db.sites || []).filter(function (site) {
      return !(ids.indexOf(site.id) !== -1 && 
        (site.userId === req.user.id || req.user.role === "admin"));
    });
  }
  
  saveDB(db);
  res.json({ ok: true });
});

app.get("/api/sites/:id/stats", requireUser, function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site || (site.userId !== req.user.id && req.user.role !== "admin")) {
    return res.status(403).json({ ok: false });
  }
  
  res.json({ ok: true, stats: site });
});

app.get("/api/sites/:id/stats.csv", requireUser, function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site || (site.userId !== req.user.id && req.user.role !== "admin")) {
    return res.status(403).send("denied");
  }
  
  let csv = "day,views\n";
  Object.keys(site.byDay || {}).forEach(function (day) {
    csv += day + "," + site.byDay[day] + "\n";
  });
  
  res.type("text/csv").send(csv);
});

/* ============================================================================
 * 30. SOCIAL APIs [Features 76-85]
 * ============================================================================ */

app.post("/api/site/:id/react", function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site) {
    return res.status(404).json({ ok: false });
  }
  
  site.reactions = site.reactions || {};
  const reactionType = req.body.type || "like";
  site.reactions[reactionType] = (site.reactions[reactionType] || 0) + 1;
  
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/site/:id/rate", function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site) {
    return res.status(404).json({ ok: false });
  }
  
  const stars = Math.min(5, Math.max(1, Number(req.body.stars || 5)));
  site.ratingSum = (site.ratingSum || 0) + stars;
  site.ratingCount = (site.ratingCount || 0) + 1;
  
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/site/:id/beat", function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (site) {
    site.totalSeconds = (site.totalSeconds || 0) + Math.min(600, Number(req.body.sec || 0));
    saveDB(db);
  }
  
  res.json({ ok: true });
});

app.post("/api/site/:id/comment", function (req, res) {
  const db = getDB();
  const site = (db.sites || []).find(function (s) { 
    return s.id === req.params.id; 
  });
  
  if (!site) {
    return res.status(404).json({ ok: false });
  }
  
  site.comments = site.comments || [];
  site.comments.push({
    id: genId(6),
    author: String(req.body.author || "Anonymous").slice(0, 40),
    text: String(req.body.text || "").slice(0, 800),
    parentId: req.body.parentId || null,
    date: new Date().toISOString()
  });
  
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/site/:id/report", function (req, res) {
  const db = getDB();
  db.reports = db.reports || [];
  db.reports.unshift({
    id: genId(6),
    siteId: req.params.id,
    reason: String(req.body.reason || "").slice(0, 300),
    status: "open",
    date: new Date().toISOString()
  });
  
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/us
