const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || "py.py.php";
const ADMIN_PIN = "5768";

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "database.json");

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

process.on("uncaughtException", function(e){ console.error("ERR:", e && e.message); });
process.on("unhandledRejection", function(e){ console.error("REJ:", e && e.message); });

const rateMap = new Map();
app.use(function(req, res, next){
  var ip = req.ip || "x";
  var now = Date.now();
  var rec = rateMap.get(ip);
  if(!rec || now > rec.reset){ rec = { count: 0, reset: now + 60000 }; rateMap.set(ip, rec); }
  rec.count++;
  if(rec.count > (req.path.indexOf("/api/")===0 ? 120 : 400)){
    return res.status(429).json({ ok: false, error: "Too many requests" });
  }
  next();
});

var initialDB = {
  settings: {
    siteName: "SJEMAR OLED",
    maintenanceMode: false,
    announcement: "Welcome to SJEMAR OLED Ultimate - Live Video Animation Active",
    announcementActive: true,
    globalHeaderCode: "",
    globalFooterCode: "",
    defaultAntiTheft: true
  },
  users: [],
  sites: [],
  folders: ["General", "Updates", "Guides", "VIP", "Tools", "APKs"],
  posts: [],
  templates: [
    { id: "t1", title: "Dark Portfolio", category: "Portfolio", uses: 0, desc: "Clean dark portfolio",
      html: "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Portfolio</title><style>body{background:#000;color:#fff;font-family:sans-serif;padding:40px}h1{font-size:48px;background:linear-gradient(135deg,#0a84ff,#bf5af2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}</style></head><body><h1>Your Name</h1><p>Designer and Developer</p></body></html>",
      css: "", js: "" },
    { id: "t2", title: "Product Landing", category: "Business", uses: 0, desc: "Modern landing page",
      html: "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Landing</title><style>body{background:#0b0b0f;color:#fff;font-family:sans-serif;text-align:center;padding:80px 20px}h1{font-size:56px}.btn{padding:16px 40px;background:linear-gradient(135deg,#0a84ff,#bf5af2);color:#fff;border:none;border-radius:12px;font-weight:700}</style></head><body><h1>Launch Your Idea</h1><p style='color:#999'>The fastest way to build.</p><button class='btn'>Get Started</button></body></html>",
      css: "", js: "" }
  ],
  reports: [], payments: [], coupons: [], newsletter: [], messages: [], notifications: [], backups: [], logs: []
};

function initDB(){
  try{
    if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(initialDB, null, 2), "utf8");
  }catch(e){ console.error("DB INIT:", e.message); }
}
function getDB(){
  try{
    initDB();
    if(fs.existsSync(DATA_FILE)){
      var d = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      return Object.assign({}, initialDB, d, { settings: Object.assign({}, initialDB.settings, d.settings || {}) });
    }
  }catch(e){}
  return Object.assign({}, initialDB);
}
function saveDB(db){
  try{ initDB(); fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8"); }catch(e){}
}
function addLog(action, details){
  var db = getDB();
  db.logs = db.logs || [];
  db.logs.unshift({ id: genId(6), action: action, details: details || "", timestamp: new Date().toISOString() });
  if(db.logs.length > 300) db.logs = db.logs.slice(0, 300);
  saveDB(db);
}
initDB();

function genId(len){ return crypto.randomBytes(len || 10).toString("hex"); }
function hashPassword(p){ return crypto.createHash("sha256").update(String(p) + "SJEMAR_2026").digest("hex"); }
function slugify(t){ return String(t || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }
function escapeHTML(t){ return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function parseUA(ua){ ua = ua || ""; if(/bot|crawl|spider/i.test(ua)) return "bot"; if(/Tablet|iPad/i.test(ua)) return "tablet"; if(/Mobi|Android|iPhone/i.test(ua)) return "mobile"; return "desktop"; }

var userSessions = new Map();
var adminSessions = new Map();
var liveMap = new Map();

function getCookie(req, name){
  var cookies = req.headers.cookie || "";
  var parts = cookies.split(";");
  for(var i = 0; i < parts.length; i++){
    var item = parts[i].trim();
    if(item.indexOf(name + "=") === 0) return decodeURIComponent(item.substring(name.length + 1));
  }
  return null;
}

function getLoggedUser(req){
  var token = getCookie(req, "sj_user_token");
  if(!token) return null;
  var sess = userSessions.get(token);
  if(!sess) return null;
  if(Date.now() - sess.created > (sess.saveMe ? 60 : 2) * 86400000){ userSessions.delete(token); return null; }
  var db = getDB();
  var user = db.users.find(function(u){ return u.id === sess.userId; });
  if(!user || user.banned || user.deletedAt) return null;
  return user;
}

function isLoggedAdmin(req){
  var t = getCookie(req, "sj_admin_token");
  if(!t) return false;
  return adminSessions.has(t);
}

function requireUser(req, res, next){
  var user = getLoggedUser(req);
  if(isLoggedAdmin(req)){ req.user = { id: "admin", username: "Super Admin", role: "admin", plan: "vip" }; return next(); }
  if(!user) return res.status(401).json({ ok: false, error: "Authentication required" });
  req.user = user;
  next();
}

function requireAdmin(req, res, next){
  if(!isLoggedAdmin(req)) return res.status(401).json({ ok: false, error: "Admin access required" });
  next();
}

app.use(function(req, res, next){
  var db = getDB();
  if(db.settings.maintenanceMode){
    if(isLoggedAdmin(req) || req.path.indexOf("/admin") === 0 || req.path.indexOf("/api/admin") === 0) return next();
    return res.status(503).send("<h1>SYSTEM MAINTENANCE</h1>");
  }
  next();
});

var ANTI_THEFT_SCRIPT = "\n<script>\n" +
  "(function(){" +
  "document.addEventListener('contextmenu',function(e){e.preventDefault();});" +
  "document.addEventListener('keydown',function(e){if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&(e.key==='I'||e.key==='J'||e.key==='C'))||(e.ctrlKey&&e.key==='u')){e.preventDefault();}});" +
  "setInterval(function(){if(window.outerHeight-window.innerHeight>200){document.title='DevTools Detected';}},1500);" +
  "})();" +
  "\n</script>\n";

var BG_FX = "<canvas id='bgfx' style='position:fixed;inset:0;z-index:-2;width:100%;height:100%'></canvas>" +
  "<script>(function(){" +
  "var c=document.getElementById('bgfx');if(!c)return;var x=c.getContext('2d');var W,H,P=[];var t=0;" +
  "function rs(){W=c.width=innerWidth;H=c.height=innerHeight;P=[];var n=W<600?30:60;for(var i=0;i<n;i++)P.push({x:Math.random(),y:Math.random(),r:Math.random()*2+0.6,a:Math.random()*6.28,s:Math.random()*0.0008+0.0003,h:Math.random()<0.5?215:270});}" +
  "rs();addEventListener('resize',rs);" +
  "function blob(cx,cy,r,h,al){var g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'hsla('+h+',90%,60%,'+al+')');g.addColorStop(1,'hsla('+h+',90%,60%,0)');x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();}" +
  "function frame(){t+=0.006;x.clearRect(0,0,W,H);" +
  "blob(W*0.3+Math.sin(t)*W*0.15,H*0.3+Math.cos(t*0.8)*H*0.1,W*0.38,215,0.18);" +
  "blob(W*0.75+Math.cos(t*0.6)*W*0.1,H*0.7+Math.sin(t*0.7)*H*0.12,W*0.32,270,0.14);" +
  "blob(W*0.55+Math.sin(t*1.3)*W*0.15,H*0.2+Math.cos(t*1.1)*H*0.08,W*0.24,160,0.11);" +
  "for(var i=0;i<P.length;i++){var p=P[i];p.a+=0.012;p.x+=Math.cos(p.a)*p.s;p.y+=Math.sin(p.a)*p.s*0.7-0.0001;" +
  "if(p.x<0)p.x=1;if(p.x>1)p.x=0;if(p.y<0)p.y=1;if(p.y>1)p.y=0;" +
  "x.fillStyle='hsla('+p.h+',90%,70%,0.5)';x.beginPath();x.arc(p.x*W,p.y*H,p.r,0,7);x.fill();}" +
  "requestAnimationFrame(frame);}" +
  "if(!matchMedia||!matchMedia('(prefers-reduced-motion:reduce)').matches)frame();" +
  "})();</script>";

var OLED_CSS =
  "*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}" +
  ":root{--bg:#000;--card:rgba(22,22,26,.62);--bd:rgba(255,255,255,.09);--tx:#fff;--mut:#8e8e93;--ac:#0a84ff;--ac2:#bf5af2;--ok:#32d74b;--dg:#ff453a;--blur:blur(30px) saturate(180%)}" +
  "html{scroll-behavior:smooth}" +
  "body{background:var(--bg);color:var(--tx);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}" +
  "body::before{content:'';position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 500px at 20% 0%,rgba(10,132,255,.15),transparent 60%),radial-gradient(900px 500px at 90% 100%,rgba(191,90,242,.12),transparent 60%);animation:drift 18s ease-in-out infinite alternate;pointer-events:none}" +
  "@keyframes drift{from{transform:translate(0,0)}to{transform:translate(-4%,3%)}}" +
  ".hd{position:sticky;top:0;z-index:100;background:rgba(0,0,0,.75);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);border-bottom:1px solid var(--bd)}" +
  ".hd-in{max-width:1200px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap}" +
  ".logo{font-size:22px;font-weight:800;background:linear-gradient(135deg,#0a84ff,#bf5af2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none}" +
  ".nv{display:flex;gap:4px;overflow-x:auto;max-width:100%;scrollbar-width:none}" +
  ".nv::-webkit-scrollbar{display:none}" +
  ".nv a{color:var(--mut);text-decoration:none;font-size:14px;font-weight:600;padding:9px 14px;border-radius:12px;white-space:nowrap;transition:.2s}" +
  ".nv a.on,.nv a:hover{color:#fff;background:rgba(255,255,255,.07)}" +
  ".wrap{max-width:1200px;margin:0 auto;padding:24px 20px 60px}" +
  ".card{background:var(--card);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);border:1px solid var(--bd);border-radius:22px;padding:24px;margin-bottom:20px;box-shadow:0 14px 44px rgba(0,0,0,.55);transition:.25s}" +
  ".card:hover{transform:translateY(-3px);box-shadow:0 20px 60px rgba(0,0,0,.7)}" +
  "h1{font-size:34px;font-weight:800;letter-spacing:-1px;margin-bottom:12px}" +
  "h2{font-size:24px;font-weight:700;margin-bottom:14px}" +
  "h3{font-size:18px;font-weight:600;margin-bottom:8px}" +
  "p{color:var(--mut);line-height:1.7;font-size:15px;margin-bottom:10px}" +
  ".btn{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;color:#fff;transition:.15s}" +
  ".btn:active{transform:scale(.96)}" +
  ".btn-p{background:linear-gradient(135deg,#0a84ff,#bf5af2);box-shadow:0 8px 26px rgba(10,132,255,.35)}" +
  ".btn-g{background:rgba(255,255,255,.09);border:1px solid var(--bd)}" +
  ".btn-d{background:rgba(255,69,58,.14);color:var(--dg);border:1px solid rgba(255,69,58,.3)}" +
  ".btn-s{padding:8px 14px;font-size:13px;border-radius:10px}" +
  ".inp{width:100%;padding:14px 16px;background:rgba(255,255,255,.05);border:1px solid var(--bd);border-radius:14px;color:#fff;font-size:15px;margin-bottom:14px;outline:none;font-family:inherit}" +
  ".inp:focus{border-color:var(--ac);box-shadow:0 0 0 4px rgba(10,132,255,.18)}" +
  "textarea.inp{min-height:130px;resize:vertical;font-family:'Courier New',monospace;font-size:13px}" +
  "select.inp{appearance:none}" +
  ".grid{display:grid;gap:18px}" +
  ".g2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}" +
  ".g3{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}" +
  ".g4{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}" +
  ".stat{background:var(--card);backdrop-filter:var(--blur);border:1px solid var(--bd);border-radius:18px;padding:18px;text-align:center}" +
  ".stat b{display:block;font-size:30px;font-weight:800;background:linear-gradient(135deg,#0a84ff,#bf5af2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}" +
  ".stat span{font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:var(--mut)}" +
  ".badge{display:inline-block;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;background:rgba(10,132,255,.14);color:var(--ac);border:1px solid rgba(10,132,255,.3)}" +
  ".badge.ok{background:rgba(50,215,75,.14);color:var(--ok);border-color:rgba(50,215,75,.3)}" +
  ".badge.dg{background:rgba(255,69,58,.14);color:var(--dg);border-color:rgba(255,69,58,.3)}" +
  ".badge.gold{background:rgba(255,215,0,.14);color:gold;border-color:rgba(255,215,0,.35)}" +
  ".ann{background:linear-gradient(90deg,rgba(10,132,255,.12),rgba(191,90,242,.12));border:1px solid var(--bd);border-radius:14px;padding:12px;text-align:center;font-size:14px;font-weight:600;margin-bottom:20px;backdrop-filter:var(--blur)}" +
  ".row{display:flex;gap:10px;flex-wrap:wrap}" +
  ".tbl{width:100%;border-collapse:collapse;font-size:14px}" +
  ".tbl th,.tbl td{padding:12px 10px;border-bottom:1px solid var(--bd);text-align:left}" +
  ".tbl th{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:1px}" +
  ".tw{overflow-x:auto}" +
  ".tabs{display:flex;gap:8px;overflow-x:auto;margin-bottom:20px;scrollbar-width:none}" +
  ".tabs::-webkit-scrollbar{display:none}" +
  ".tab{padding:10px 20px;border-radius:30px;background:rgba(255,255,255,.06);border:1px solid var(--bd);color:var(--mut);font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}" +
  ".tab.on{background:linear-gradient(135deg,#0a84ff,#bf5af2);color:#fff;border-color:transparent}" +
  ".pane{display:none;animation:fade .35s ease}.pane.on{display:block}" +
  "@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
  ".bars{display:flex;align-items:flex-end;gap:4px;height:100px;margin:12px 0}" +
  ".bars div{flex:1;background:linear-gradient(180deg,#0a84ff,#bf5af2);border-radius:4px 4px 0 0;min-height:3px}" +
  ".avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--bd)}" +
  ".live{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 10px var(--ok);animation:pulse 1.6s infinite}" +
  "@keyframes pulse{50%{opacity:.35}}" +
  "@media(max-width:640px){h1{font-size:26px}.card{padding:18px;border-radius:18px}.wrap{padding:16px 12px 50px}}";

function countLive(){
  var now = Date.now(), n = 0;
  liveMap.forEach(function(v){ if(now - v < 60000) n++; });
  return n;
}

function page(title, content, script, req){
  var db = getDB();
  var user = getLoggedUser(req || {});
  var isAdmin = isLoggedAdmin(req || {});
  var cur = (req && req.path) || "";
  var ann = db.settings.announcementActive && db.settings.announcement ? db.settings.announcement : "";
  var live = countLive();
  return "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>" +
    "<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'>" +
    "<meta name='theme-color' content='#000000'>" +
    "<title>" + escapeHTML(title) + " - " + escapeHTML(db.settings.siteName) + "</title>" +
    "<style>" + OLED_CSS + "</style>" +
    (db.settings.globalHeaderCode || "") +
    "</head><body>" + BG_FX +
    "<header class='hd'><div class='hd-in'>" +
    "<a class='logo' href='/'>" + escapeHTML(db.settings.siteName) + "</a>" +
    "<nav class='nv'>" +
    "<a href='/' class='" + (cur === "/" ? "on" : "") + "'>Home</a>" +
    "<a href='/create' class='" + (cur === "/create" ? "on" : "") + "'>Publish</a>" +
    "<a href='/templates' class='" + (cur === "/templates" ? "on" : "") + "'>Templates</a>" +
    "<a href='/posts' class='" + (cur === "/posts" ? "on" : "") + "'>Posts</a>" +
    "<a href='/search' class='" + (cur === "/search" ? "on" : "") + "'>Search</a>" +
    "<a href='/dashboard' class='" + (cur === "/dashboard" ? "on" : "") + "'>Vault</a>" +
    (isAdmin ? "<a href='/admin' class='" + (cur.indexOf("/admin") === 0 ? "on" : "") + "'>Admin</a>" : "") +
    (user ? "<a href='/logout'>Logout</a>" : "<a href='/create'>Login</a>") +
    "</nav>" +
    "<span style='font-size:12px;color:var(--mut)'><span class='live'></span> " + live + " live</span>" +
    "</div></header>" +
    "<main class='wrap'>" +
    (ann ? "<div class='ann'>" + escapeHTML(ann) + "</div>" : "") +
    content +
    "</main>" + (script || "") + (db.settings.globalFooterCode || "") +
    "</body></html>";
}

setInterval(function(){
  try{
    var db = getDB(); var changed = false; var now = Date.now();
    (db.sites || []).forEach(function(s){
      if(s.draft && s.scheduledAt && new Date(s.scheduledAt).getTime() <= now){ s.draft = false; s.published = true; changed = true; }
      if(s.published && s.expiresAt && new Date(s.expiresAt).getTime() <= now){ s.published = false; changed = true; }
    });
    (db.users || []).forEach(function(u){
      if(u.deletedAt && now - new Date(u.deletedAt).getTime() > 7 * 86400000){
        db.users = db.users.filter(function(x){ return x.id !== u.id; });
        db.sites = db.sites.filter(function(s){ return s.userId !== u.id; });
        changed = true;
      }
    });
    if(changed) saveDB(db);
    db.backups = db.backups || [];
    db.backups.unshift({ ts: new Date().toISOString(), data: JSON.stringify(db) });
    if(db.backups.length > 7) db.backups = db.backups.slice(0, 7);
    saveDB(db);
  }catch(e){}
}, 3600000);

app.get("/", function(req, res){
  var db = getDB();
  var sites = db.sites || [];
  var users = db.users || [];
  var totalViews = sites.reduce(function(a, s){ return a + (s.views || 0); }, 0);
  var leaders = {};
  sites.forEach(function(s){ leaders[s.authorName] = (leaders[s.authorName] || 0) + (s.views || 0); });
  var topLeaders = Object.keys(leaders).sort(function(a, b){ return leaders[b] - leaders[a]; }).slice(0, 5);
  var recent = sites.filter(function(s){ return s.published && !s.draft; }).slice(0, 6);

  var content = "<h1>Ultimate HTML Hosting Platform</h1>" +
    "<p>Publish, protect and analyze your websites with live video-like animation and anti-theft engine.</p>" +
    "<div class='grid g4' style='margin:22px 0'>" +
    "<div class='stat'><b>" + sites.length + "</b><span>Websites</span></div>" +
    "<div class='stat'><b>" + users.length + "</b><span>Creators</span></div>" +
    "<div class='stat'><b>" + totalViews + "</b><span>Total Views</span></div>" +
    "<div class='stat'><b>" + countLive() + "</b><span>Live Now</span></div>" +
    "</div>" +
    "<div class='row' style='margin-bottom:24px'>" +
    "<a class='btn btn-p' href='/create'>Publish HTML to Link</a>" +
    "<a class='btn btn-g' href='/templates'>Browse Templates</a>" +
    "</div>" +
    "<h2>Leaderboard</h2><div class='card'><div class='tw'><table class='tbl'><tr><th>Rank</th><th>Creator</th><th>Views</th></tr>" +
    (topLeaders.length ? topLeaders.map(function(n, i){
      return "<tr><td>" + (i+1) + "</td><td><a style='color:var(--ac);text-decoration:none' href='/u/" + encodeURIComponent(n) + "'>" + escapeHTML(n) + "</a></td><td>" + leaders[n] + "</td></tr>";
    }).join("") : "<tr><td colspan='3' style='text-align:center'>No data yet</td></tr>") +
    "</table></div></div>" +
    "<h2>Recent Websites</h2><div class='grid g3'>" +
    (recent.length ? recent.map(function(s){
      return "<div class='card'><span class='badge'>" + escapeHTML(s.category || "Site") + "</span>" +
        "<h3 style='margin-top:10px'>" + escapeHTML(s.title) + "</h3>" +
        "<p>" + escapeHTML((s.bio || "").slice(0, 90)) + "</p>" +
        "<p style='font-size:12px'>by " + escapeHTML(s.authorName) + " - " + (s.views || 0) + " views</p>" +
        "<div class='row'><a class='btn btn-p btn-s' target='_blank' href='/site/" + escapeHTML(s.slug) + "'>Visit</a>" +
        "<button class='btn btn-g btn-s' data-react='like' data-id='" + s.id + "'>Like " + ((s.reactions || {}).like || 0) + "</button></div></div>";
    }).join("") : "<div class='card'><p>No websites yet.</p></div>") +
    "</div>";

  var script = "<script>document.addEventListener('click',function(e){var b=e.target.closest('[data-react]');if(!b)return;fetch('/api/site/'+b.getAttribute('data-id')+'/react',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:b.getAttribute('data-react')})}).then(function(){location.reload();});});</script>";
  res.send(page("Home", content, script, req));
});

app.get("/templates", function(req, res){
  var db = getDB();
  var content = "<h1>Template Gallery</h1><p>One click creates a draft in your vault.</p><div class='grid g3'>" +
    (db.templates || []).map(function(t){
      return "<div class='card'><span class='badge'>" + escapeHTML(t.category) + "</span>" +
        "<h3 style='margin-top:10px'>" + escapeHTML(t.title) + "</h3>" +
        "<p>" + escapeHTML(t.desc) + "</p><p style='font-size:12px'>Used " + (t.uses || 0) + " times</p>" +
        "<button class='btn btn-p btn-s' data-use='" + t.id + "'>Use Template</button></div>";
    }).join("") + "</div>";
  var script = "<script>document.addEventListener('click',function(e){var b=e.target.closest('[data-use]');if(!b)return;fetch('/api/templates/'+b.getAttribute('data-use')+'/use',{method:'POST'}).then(function(r){return r.json();}).then(function(d){if(d.ok){alert('Draft created');location.href='/dashboard';}else alert(d.error||'Login required');});});</script>";
  res.send(page("Templates", content, script, req));
});

app.get("/create", function(req, res){
  var user = getLoggedUser(req);
  if(!user && !isLoggedAdmin(req)){
    var content = "<div style='max-width:420px;margin:50px auto'><div class='card'><h2>Authentication Required</h2>" +
      "<input class='inp' id='au' placeholder='Username'>" +
      "<input class='inp' id='ap' type='password' placeholder='Password'>" +
      "<label style='display:flex;gap:8px;align-items:center;font-size:14px;color:var(--mut);margin-bottom:14px'><input type='checkbox' id='asv' style='width:17px;height:17px'> Save Me (60 days)</label>" +
      "<button class='btn btn-p' style='width:100%' id='aub'>Continue</button>" +
      "<p id='aue' style='color:var(--dg);display:none;margin-top:12px'></p></div></div>";
    var script = "<script>document.getElementById('aub').addEventListener('click',function(){var p={username:document.getElementById('au').value,password:document.getElementById('ap').value,saveMe:document.getElementById('asv').checked};fetch('/api/auth/quick-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}).then(function(r){return r.json();}).then(function(d){if(d.ok)location.reload();else{var e=document.getElementById('aue');e.textContent=d.error;e.style.display='block';}});});</script>";
    return res.send(page("Login", content, script, req));
  }
  var plan = (user && user.plan) || "vip";
  var name = user ? user.username : "Admin";
  var content = "<h1>HTML to Link Suite</h1>" +
    "<p>Logged in as <strong style='color:#fff'>" + escapeHTML(name) + "</strong> - Plan: <span class='badge gold'>" + escapeHTML(plan) + "</span></p>" +
    "<div class='card'>" +
    "<input class='inp' id='fTitle' placeholder='Project Title *'>" +
    "<input class='inp' id='fSlug' placeholder='Unique slug *'>" +
    "<input class='inp' id='fBio' placeholder='Bio'>" +
    "<input class='inp' id='fPass' type='password' placeholder='Access password (optional)'>" +
    "<input type='file' id='fFile' accept='.html,.htm' class='inp' style='padding:10px'>" +
    "<textarea class='inp' id='fHtml' placeholder='HTML Code *' style='min-height:240px'></textarea>" +
    "<textarea class='inp' id='fCss' placeholder='Custom CSS (optional)'></textarea>" +
    "<textarea class='inp' id='fJs' placeholder='Custom JS (optional)'></textarea>" +
    "<label style='display:flex;gap:10px;align-items:center;margin-bottom:18px;cursor:pointer'><input type='checkbox' id='fTheft' checked style='width:18px;height:18px'> Enable Anti-Theft Protection</label>" +
    "<button class='btn btn-p' style='width:100%' id='fPub'>Publish and Generate Link</button>" +
    "<div id='fRes' style='display:none;margin-top:18px' class='card'><h3 style='color:var(--ok)'>Website Published</h3>" +
    "<p id='fUrl' style='word-break:break-all;color:#fff'></p>" +
    "<div class='row'><a id='fVisit' class='btn btn-p btn-s' target='_blank' href='#'>Visit Site</a>" +
    "<button class='btn btn-g btn-s' id='fCopy'>Copy Link</button></div></div></div>";
  var script = "<script>document.getElementById('fTitle').addEventListener('input',function(e){document.getElementById('fSlug').value=e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');});" +
    "document.getElementById('fFile').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){document.getElementById('fHtml').value=r.result;};r.readAsText(f);});" +
    "document.getElementById('fPub').addEventListener('click',function(){var p={title:document.getElementById('fTitle').value,slug:document.getElementById('fSlug').value,bio:document.getElementById('fBio').value,sitePassword:document.getElementById('fPass').value,html:document.getElementById('fHtml').value,css:document.getElementById('fCss').value,js:document.getElementById('fJs').value,antiTheft:document.getElementById('fTheft').checked};fetch('/api/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}).then(function(r){return r.json();}).then(function(d){if(d.ok){document.getElementById('fUrl').textContent=d.site.url;document.getElementById('fVisit').href=d.site.url;document.getElementById('fRes').style.display='block';}else alert(d.error||'Failed');});});" +
    "document.getElementById('fCopy').addEventListener('click',function(){navigator.clipboard.writeText(document.getElementById('fUrl').textContent);alert('Copied');});</script>";
  res.send(page("Publish", content, script, req));
});

app.post("/api/auth/quick-auth", function(req, res){
  var username = String(req.body.username || "").trim();
  var password = String(req.body.password || "").trim();
  var saveMe = Boolean(req.body.saveMe);
  if(!username || !password) return res.status(400).json({ ok: false, error: "Username and password required" });
  var db = getDB();
  var user = db.users.find(function(u){ return u.username.toLowerCase() === username.toLowerCase(); });
  if(user){
    if(user.banned) return res.status(403).json({ ok: false, error: "Account suspended" });
    if(user.deletedAt) return res.status(403).json({ ok: false, error: "Account deleted" });
    if(user.password !== hashPassword(password)) return res.status(401).json({ ok: false, error: "Incorrect password" });
  } else {
    user = { id: genId(), username: username, password: hashPassword(password), role: "user", plan: "free", banned: false, verified: false, following: [], bio: "", avatar: "", accent: "", createdAt: new Date().toISOString() };
    db.users.push(user);
    saveDB(db);
    addLog("USER_REGISTER", "User: " + username);
  }
  user.lastLogin = new Date().toISOString();
  saveDB(db);
  var tok = genId(24);
  userSessions.set(tok, { userId: user.id, saveMe: saveMe, created: Date.now() });
  res.cookie("sj_user_token", tok, { httpOnly: true, sameSite: "lax", path: "/", maxAge: (saveMe ? 60 : 2) * 86400000 });
  res.json({ ok: true, user: { id: user.id, username: user.username } });
});

app.get("/logout", function(req, res){
  var t = getCookie(req, "sj_user_token");
  if(t) userSessions.delete(t);
  res.clearCookie("sj_user_token", { path: "/" });
  res.redirect("/");
});

app.post("/api/publish", requireUser, function(req, res){
  var b = req.body || {};
  if(!b.title || !b.html) return res.status(400).json({ ok: false, error: "Title and HTML required" });
  var db = getDB();
  var slug = slugify(b.slug || b.title);
  if(!slug) slug = "site-" + genId(4);
  if(db.sites.some(function(s){ return s.slug === slug; })) return res.status(409).json({ ok: false, error: "Slug already taken" });
  var fullHtml = b.html;
  if(b.css && b.css.trim()) fullHtml = "<style>\n" + b.css + "\n</style>\n" + fullHtml;
  if(b.js && b.js.trim()) fullHtml = fullHtml + "\n<script>\n" + b.js + "\n</script>\n";
  var site = {
    id: genId(), userId: req.user.id, authorName: req.user.username,
    title: String(b.title).slice(0, 120), slug: slug, bio: b.bio || "",
    category: b.category || "General",
    tags: String(b.tags || "").split(",").map(function(t){ return t.trim(); }).filter(Boolean),
    rawHtml: b.html, rawCss: b.css || "", rawJs: b.js || "",
    scheduledAt: b.scheduledAt || null, expiresAt: b.expiresAt || null,
    viewLimit: Number(b.viewLimit || 0), domainLock: b.domainLock || "",
    antiTheft: b.antiTheft !== false, obfuscate: Boolean(b.obfuscate),
    allowClone: b.allowClone !== false,
    draft: Boolean(b.draft) || Boolean(b.scheduledAt),
    published: !b.draft && !b.scheduledAt,
    sitePassword: b.sitePassword ? hashPassword(b.sitePassword) : null,
    html: fullHtml, views: 0, uniqueViews: 0, totalSeconds: 0,
    reactions: {}, ratingSum: 0, ratingCount: 0, comments: [],
    versions: [], seen: {}, byDay: {}, devices: {}, refs: {},
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  db.sites.unshift(site);
  saveDB(db);
  addLog("SITE_PUBLISH", site.title + " by " + req.user.username);
  var proto = req.headers["x-forwarded-proto"] || req.protocol;
  res.json({ ok: true, site: { url: proto + "://" + req.get("host") + "/site/" + site.slug } });
});

app.get("/site/:slug", function(req, res){
  var db = getDB();
  var site = db.sites.find(function(s){ return s.slug === req.params.slug; });
  if(!site || site.published === false || site.draft) return res.status(404).send("Website not found");
  if(site.domainLock && (req.get("host") || "").split(":")[0] !== site.domainLock) return res.status(403).send("Domain locked");
  if(site.expiresAt && new Date(site.expiresAt).getTime() < Date.now()) return res.status(403).send("Expired");
  if(site.viewLimit && (site.views || 0) >= site.viewLimit) return res.status(403).send("View limit reached");
  if(site.sitePassword){
    var entered = req.query.pass;
    if(!entered || hashPassword(entered) !== site.sitePassword){
      return res.send("<!DOCTYPE html><html><head><meta charset='utf-8'><title>Locked</title></head><body style='background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'><form method='GET' style='background:#111;padding:30px;border-radius:16px;text-align:center'><h2>Password Protected</h2><input name='pass' type='password' style='padding:12px;width:100%;margin:12px 0;background:#222;border:1px solid #333;color:#fff;border-radius:10px'><button style='padding:12px;width:100%;background:#0a84ff;border:none;color:#fff;border-radius:10px;font-weight:700'>Unlock</button></form></body></html>");
    }
  }
  var uid = getCookie(req, "sv_uid");
  var isNew = !uid;
  if(isNew) res.cookie("sv_uid", genId(8), { maxAge: 365 * 86400000, path: "/" });
  var seenKey = uid || "new";
  site.seen = site.seen || {};
  var isUnique = false;
  if(!site.seen[seenKey] && Object.keys(site.seen).length < 8000){ site.seen[seenKey] = 1; isUnique = true; }
  site.views = (site.views || 0) + 1;
  if(isUnique) site.uniqueViews = (site.uniqueViews || 0) + 1;
  var day = new Date().toISOString().slice(0, 10);
  site.byDay = site.byDay || {};
  site.byDay[day] = (site.byDay[day] || 0) + 1;
  site.devices = site.devices || {};
  var dev = parseUA(req.headers["user-agent"]);
  site.devices[dev] = (site.devices[dev] || 0) + 1;
  var refRaw = req.headers.referer || "";
  var refHost = "direct";
  if(refRaw){ try{ refHost = new URL(refRaw).hostname; }catch(e){} }
  site.refs = site.refs || {};
  site.refs[refHost] = (site.refs[refHost] || 0) + 1;
  saveDB(db);
  liveMap.set(req.ip || "x", Date.now());
  var out = site.html || "";
  if(site.antiTheft) out = out + ANTI_THEFT_SCRIPT;
  if(site.obfuscate){
    var b64 = Buffer.from(out, "utf8").toString("base64");
    out = "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><script>document.write(atob('" + b64 + "'));</script></body></html>";
  }
  out += "<script>setTimeout(function(){try{fetch('/api/site/" + site.id + "/beat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sec:Math.round(performance.now()/1000)})});}catch(e){}},8000);</script>";
  res.type("html").send(out);
});

app.get("/site/:slug/download", function(req, res){
  var db = getDB();
  var site = db.sites.find(function(s){ return s.slug === req.params.slug; });
  if(!site) return res.status(404).send("Not found");
  res.setHeader("Content-Disposition", "attachment; filename=\"" + site.slug + ".html\"");
  res.type("html").send(site.rawHtml || site.html || "");
});

app.get("/dashboard", function(req, res){
  var user = getLoggedUser(req);
  if(!user && !isLoggedAdmin(req)) return res.redirect("/create");
  var me = user || { id: "admin", username: "Super Admin", bio: "", avatar: "", plan: "vip" };
  var content = "<h1>My Vault</h1><p>Author: <strong style='color:#fff'>" + escapeHTML(me.username) + "</strong></p>" +
    "<div class='row' style='margin-bottom:16px'><a class='btn btn-p btn-s' href='/create'>New Site</a></div>" +
    "<div id='vaultBox' class='grid g2'>Loading...</div>";
  var script = "<script>function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}" +
    "function loadVault(){fetch('/api/user/vault-data').then(function(r){return r.json();}).then(function(d){if(!d.ok)return;var box=document.getElementById('vaultBox');if(!d.sites.length){box.innerHTML='<div class=\"card\"><p>No sites yet.</p></div>';return;}box.innerHTML=d.sites.map(function(s){return '<div class=\"card\"><span class=\"badge\">'+esc(s.category||'Site')+'</span><h3 style=\"margin-top:10px\">'+esc(s.title)+'</h3><p>/'+esc(s.slug)+' - views '+(s.views||0)+'</p><div class=\"row\"><a class=\"btn btn-p btn-s\" target=\"_blank\" href=\"/site/'+esc(s.slug)+'\">Visit</a><button class=\"btn btn-d btn-s\" onclick=\"delSite(\\''+s.id+'\\')\">Delete</button></div></div>';}).join('');});}" +
    "function delSite(id){if(!confirm('Delete?'))return;fetch('/api/sites/'+id,{method:'DELETE'}).then(function(){loadVault();});}" +
    "loadVault();</script>";
  res.send(page("Vault", content, script, req));
});

app.get("/api/user/vault-data", requireUser, function(req, res){
  var db = getDB();
  var mine = db.sites.filter(function(s){ return s.userId === req.user.id || req.user.role === "admin"; });
  res.json({ ok: true, sites: mine });
});

app.delete("/api/sites/:id", requireUser, function(req, res){
  var db = getDB();
  var site = db.sites.find(function(s){ return s.id === req.params.id; });
  if(!site || (site.userId !== req.user.id && req.user.role !== "admin")) return res.status(403).json({ ok: false });
  db.sites = db.sites.filter(function(s){ return s.id !== req.params.id; });
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/site/:id/react", function(req, res){
  var db = getDB();
  var s = db.sites.find(function(x){ return x.id === req.params.id; });
  if(!s) return res.status(404).json({ ok: false });
  s.reactions = s.reactions || {};
  var t = req.body.type || "like";
  s.reactions[t] = (s.reactions[t] || 0) + 1;
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/site/:id/beat", function(req, res){
  var db = getDB();
  var s = db.sites.find(function(x){ return x.id === req.params.id; });
  if(s){ s.totalSeconds = (s.totalSeconds || 0) + Math.min(600, Number(req.body.sec || 0)); saveDB(db); }
  res.json({ ok: true });
});

app.get("/posts", function(req, res){
  var db = getDB();
  var posts = db.posts || [];
  var content = "<h1>Posts</h1><div class='grid g2'>" +
    (posts.length ? posts.map(function(p){
      return "<div class='card'><span class='badge'>" + escapeHTML(p.folder || "General") + "</span>" +
        "<h3 style='margin-top:10px'>" + escapeHTML(p.title) + "</h3>" +
        "<p>" + escapeHTML((p.bio || (p.content || "")).slice(0, 100)) + "</p>" +
        "<div class='row'><a class='btn btn-p btn-s' href='/post/" + escapeHTML(p.slug) + "'>Read</a>" +
        "<span style='font-size:12px;color:var(--mut)'>" + (p.likes || 0) + " likes</span></div></div>";
    }).join("") : "<div class='card'><p>No posts yet.</p></div>") +
    "</div>";
  res.send(page("Posts", content, "", req));
});

app.get("/post/:slug", function(req, res){
  var db = getDB();
  var post = db.posts.find(function(p){ return p.slug === req.params.slug; });
  if(!post) return res.status(404).send("Post not found");
  post.views = (post.views || 0) + 1;
  saveDB(db);
  var content = "<div class='card'><span class='badge'>" + escapeHTML(post.folder || "General") + "</span>" +
    "<h1 style='margin-top:12px'>" + escapeHTML(post.title) + "</h1>" +
    "<p style='font-size:13px'>By " + escapeHTML(post.author) + " - " + (post.views || 0) + " views</p>" +
    "<div style='margin:18px 0;line-height:1.9;color:#e5e5ea;white-space:pre-wrap'>" + escapeHTML(post.content || "") + "</div>" +
    "<button class='btn btn-g btn-s' id='likeBtn'>Like (" + (post.likes || 0) + ")</button></div>";
  var script = "<script>document.getElementById('likeBtn').addEventListener('click',function(){fetch('/api/posts/" + post.id + "/like',{method:'POST'}).then(function(){location.reload();});});</script>";
  res.send(page(post.title, content, script, req));
});

app.post("/api/posts/:id/like", function(req, res){
  var db = getDB();
  var p = db.posts.find(function(x){ return x.id === req.params.id; });
  if(!p) return res.status(404).json({ ok: false });
  p.likes = (p.likes || 0) + 1;
  saveDB(db);
  res.json({ ok: true });
});

app.get("/u/:username", function(req, res){
  var db = getDB();
  var u = db.users.find(function(x){ return x.username.toLowerCase() === req.params.username.toLowerCase(); });
  if(!u) return res.status(404).send("User not found");
  var sites = db.sites.filter(function(s){ return s.userId === u.id && s.published; });
  var totalViews = sites.reduce(function(a, s){ return a + (s.views || 0); }, 0);
  var content = "<div class='card' style='text-align:center'>" +
    "<h1>" + escapeHTML(u.username) + (u.verified ? " <span class='badge ok'>Verified</span>" : "") + "</h1>" +
    "<p>" + escapeHTML(u.bio || "No bio") + "</p>" +
    "<p style='font-size:13px'>" + sites.length + " sites - " + totalViews + " views</p></div>" +
    "<div class='grid g2'>" +
    sites.map(function(s){
      return "<div class='card'><h3>" + escapeHTML(s.title) + "</h3><p>" + (s.views || 0) + " views</p>" +
        "<a class='btn btn-p btn-s' target='_blank' href='/site/" + escapeHTML(s.slug) + "'>Visit</a></div>";
    }).join("") + "</div>";
  res.send(page(u.username, content, "", req));
});

app.get("/search", function(req, res){
  var q = String(req.query.q || "").toLowerCase();
  var db = getDB();
  var sites = [], posts = [];
  if(q){
    sites = db.sites.filter(function(s){ return s.published && (s.title + " " + s.bio).toLowerCase().indexOf(q) !== -1; }).slice(0, 20);
    posts = db.posts.filter(function(p){ return (p.title + " " + p.content).toLowerCase().indexOf(q) !== -1; }).slice(0, 20);
  }
  var content = "<h1>Search</h1><form method='GET' action='/search'><div class='row'><input class='inp' name='q' value='" + escapeHTML(q) + "' placeholder='Search' style='margin:0'><button class='btn btn-p'>Search</button></div></form>" +
    (q ? "<h2 style='margin-top:24px'>Sites (" + sites.length + ")</h2><div class='grid g2'>" +
      sites.map(function(s){ return "<div class='card'><h3>" + escapeHTML(s.title) + "</h3><a class='btn btn-p btn-s' target='_blank' href='/site/" + escapeHTML(s.slug) + "'>Visit</a></div>"; }).join("") +
      "</div><h2>Posts (" + posts.length + ")</h2><div class='grid g2'>" +
      posts.map(function(p){ return "<div class='card'><h3>" + escapeHTML(p.title) + "</h3><a class='btn btn-g btn-s' href='/post/" + escapeHTML(p.slug) + "'>Read</a></div>"; }).join("") + "</div>" : "");
  res.send(page("Search", content, "", req));
});

app.post("/api/templates/:id/use", requireUser, function(req, res){
  var db = getDB();
  var t = db.templates.find(function(x){ return x.id === req.params.id; });
  if(!t) return res.status(404).json({ ok: false });
  t.uses = (t.uses || 0) + 1;
  db.sites.unshift({
    id: genId(), userId: req.user.id, authorName: req.user.username,
    title: t.title + " Draft", slug: slugify(t.title) + "-" + genId(3),
    bio: t.desc, category: t.category, rawHtml: t.html, html: t.html,
    antiTheft: true, draft: true, published: false,
    views: 0, reactions: {}, comments: [], versions: [],
    byDay: {}, devices: {}, refs: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  saveDB(db);
  res.json({ ok: true });
});

app.get("/admin", function(req, res){
  var content = "<div class='card' style='max-width:400px;margin:60px auto'>" +
    "<h2>Admin Login</h2>" +
    "<input class='inp' id='pw' type='password' placeholder='Password / PIN'>" +
    "<button class='btn btn-p' style='width:100%' id='lb'>Unlock</button></div>" +
    "<div id='panel' style='display:none'>" +
    "<div class='card row' style='justify-content:space-between'><h1 style='margin:0'>Control Panel</h1><a href='/' style='color:var(--mut)'>View Site</a></div>" +
    "<div class='grid g4' id='stats'></div>" +
    "<div class='card'><h2>Users</h2><div class='tw' id='uT'></div></div>" +
    "<div class='card'><h2>Websites</h2><div class='tw' id='sT'></div></div>" +
    "<div class='card'><h2>Settings</h2>" +
    "<input class='inp' id='sName' placeholder='Site name'>" +
    "<input class='inp' id='sAnn' placeholder='Announcement'>" +
    "<label style='display:flex;gap:8px;align-items:center;margin-bottom:10px'><input type='checkbox' id='sAnnOn'> Show Announcement</label>" +
    "<label style='display:flex;gap:8px;align-items:center;margin-bottom:10px'><input type='checkbox' id='sMaint'> Maintenance Mode</label>" +
    "<button class='btn btn-p' id='sSave'>Save Settings</button>" +
    "<a class='btn btn-g' style='margin-left:10px' href='/api/admin/backup-download'>Download Backup</a></div>" +
    "<div class='card'><h2>Logs</h2><div class='tw' id='lT'></div></div></div>";
  var script = "<script>function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}" +
    "function api(u,o){return fetch(u,o||{}).then(function(r){return r.json();});}" +
    "document.getElementById('lb').addEventListener('click',function(){api('/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})}).then(function(d){if(d.ok)boot();else alert('Wrong password');});});" +
    "api('/api/admin/ping').then(function(d){if(d.ok)boot();});" +
    "function boot(){document.querySelector('.card[style*=max-width]').style.display='none';document.getElementById('panel').style.display='block';load();}" +
    "function load(){api('/api/admin/all').then(function(d){if(!d.ok)return;var tv=0;d.sites.forEach(function(s){tv+=s.views||0;});document.getElementById('stats').innerHTML='<div class=stat><b>'+d.users.length+'</b><span>Users</span></div><div class=stat><b>'+d.sites.length+'</b><span>Sites</span></div><div class=stat><b>'+d.posts.length+'</b><span>Posts</span></div><div class=stat><b>'+tv+'</b><span>Views</span></div>';document.getElementById('sName').value=d.settings.siteName||'';document.getElementById('sAnn').value=d.settings.announcement||'';document.getElementById('sAnnOn').checked=!!d.settings.announcementActive;document.getElementById('sMaint').checked=!!d.settings.maintenanceMode;var uh='<table class=tbl><tr><th>User</th><th>Status</th><th>Actions</th></tr>';d.users.forEach(function(u){uh+='<tr><td>'+esc(u.username)+'</td><td>'+(u.banned?'Banned':'Active')+'</td><td><button class=\"btn btn-g btn-s\" data-ban=\"'+u.id+'\">'+(u.banned?'Unban':'Ban')+'</button><button class=\"btn btn-d btn-s\" data-delu=\"'+u.id+'\">Delete</button></td></tr>';});document.getElementById('uT').innerHTML=uh+'</table>';var sh='<table class=tbl><tr><th>Title</th><th>Author</th><th>Views</th><th>Actions</th></tr>';d.sites.forEach(function(s){sh+='<tr><td>'+esc(s.title)+'</td><td>'+esc(s.authorName)+'</td><td>'+(s.views||0)+'</td><td><a class=\"btn btn-g btn-s\" target=_blank href=/site/'+esc(s.slug)+'>View</a><button class=\"btn btn-d btn-s\" data-dels=\"'+s.id+'\">Delete</button></td></tr>';});document.getElementById('sT').innerHTML=sh+'</table>';var lh='<table class=tbl><tr><th>Time</th><th>Action</th><th>Details</th></tr>';(d.logs||[]).forEach(function(l){lh+='<tr><td>'+esc(l.timestamp)+'</td><td>'+esc(l.action)+'</td><td>'+esc(l.details)+'</td></tr>';});document.getElementById('lT').innerHTML=lh+'</table>';});}" +
    "document.addEventListener('click',function(e){var t=e.target;if(t.closest('[data-ban]')){api('/api/admin/user/'+t.closest('[data-ban]').getAttribute('data-ban')+'/ban',{method:'POST'}).then(load);}else if(t.closest('[data-delu]')){if(confirm('Delete?'))api('/api/admin/user/'+t.closest('[data-delu]').getAttribute('data-delu'),{method:'DELETE'}).then(load);}else if(t.closest('[data-dels]')){if(confirm('Delete?'))api('/api/admin/sites/'+t.closest('[data-dels]').getAttribute('data-dels'),{method:'DELETE'}).then(load);}});" +
    "document.getElementById('sSave').addEventListener('click',function(){api('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteName:document.getElementById('sName').value,announcement:document.getElementById('sAnn').value,announcementActive:document.getElementById('sAnnOn').checked,maintenanceMode:document.getElementById('sMaint').checked})}).then(function(){alert('Saved');});});</script>";
  res.send(page("Admin", content, script, req));
});

app.post("/api/admin/auth", function(req, res){
  if(req.body.password !== ADMIN_PASS && req.body.password !== ADMIN_PIN) return res.status(401).json({ ok: false });
  var tok = genId(24);
  adminSessions.set(tok, true);
  res.cookie("sj_admin_token", tok, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400000 });
  addLog("ADMIN_LOGIN", "Admin logged in");
  res.json({ ok: true });
});

app.get("/api/admin/ping", function(req, res){ res.json({ ok: isLoggedAdmin(req) }); });

app.get("/api/admin/all", requireAdmin, function(req, res){
  var db = getDB();
  res.json({ ok: true, users: db.users, sites: db.sites, posts: db.posts, folders: db.folders, settings: db.settings, logs: db.logs, backups: (db.backups || []).map(function(b){ return { ts: b.ts }; }) });
});

app.post("/api/admin/settings", requireAdmin, function(req, res){
  var db = getDB();
  db.settings = Object.assign({}, db.settings, req.body);
  saveDB(db);
  addLog("SETTINGS_UPDATE", "Settings updated");
  res.json({ ok: true });
});

app.get("/api/admin/backup-download", requireAdmin, function(req, res){
  var db = getDB();
  res.setHeader("Content-Disposition", "attachment; filename=\"sjemar-backup-" + Date.now() + ".json\"");
  res.type("json").send(JSON.stringify(db, null, 2));
});

app.post("/api/admin/user/:id/ban", requireAdmin, function(req, res){
  var db = getDB();
  var u = db.users.find(function(x){ return x.id === req.params.id; });
  if(!u) return res.status(404).json({ ok: false });
  u.banned = !u.banned;
  saveDB(db);
  res.json({ ok: true });
});

app.delete("/api/admin/user/:id", requireAdmin, function(req, res){
  var db = getDB();
  db.users = db.users.filter(function(u){ return u.id !== req.params.id; });
  db.sites = db.sites.filter(function(s){ return s.userId !== req.params.id; });
  saveDB(db);
  res.json({ ok: true });
});

app.delete("/api/admin/sites/:id", requireAdmin, function(req, res){
  var db = getDB();
  db.sites = db.sites.filter(function(s){ return s.id !== req.params.id; });
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/admin/folder-post", requireAdmin, function(req, res){
  var b = req.body || {};
  if(!b.title) return res.status(400).json({ ok: false, error: "Title required" });
  var db = getDB();
  if(b.folder && db.folders.indexOf(b.folder) === -1) db.folders.push(b.folder);
  db.posts.unshift({ id: genId(), folder: b.folder || "General", title: String(b.title).slice(0, 120), slug: slugify(b.title) || "post-" + genId(4), bio: b.bio || "", content: b.content || "", author: "Admin", views: 0, likes: 0, pinned: false, comments: [], createdAt: new Date().toISOString() });
  saveDB(db);
  res.json({ ok: true });
});

app.get("/healthz", function(req, res){ res.json({ ok: true, uptime: process.uptime() }); });

app.use(function(req, res){
  res.status(404).send(page("404", "<div class='card' style='text-align:center;padding:60px 20px'><h1>404</h1><p>Page not found.</p><a class='btn btn-p' href='/'>Home</a></div>", "", req));
});

app.listen(PORT, "0.0.0.0", function(){
  console.log("=================================================");
  console.log("SJEMAR OLED v11.0 ONLINE");
  console.log("Port: " + PORT);
  console.log("Admin: " + ADMIN_PASS + " | PIN: " + ADMIN_PIN);
  console.log("=================================================");
});
