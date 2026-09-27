const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ডাটাবেস
const DB_FILE = path.join(__dirname, "db.json");
let db = {
  users: [],
  sites: [],
  posts: [],
  logs: [],
  settings: { siteName: "SJEMAR OLED", announcement: "✨ Welcome! AI Generator Active" }
};

try { if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE)); } catch(e) {}

function save() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function genId() { return crypto.randomBytes(6).toString("hex"); }
function esc(t) { return String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// সেশন
const sessions = new Map();

// মূল পেজ ফাংশন - ছোট কিন্তু শক্তিশালী
function page(title, body, extra = "") {
  const user = getUser();
  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${esc(title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{
  --bg:#000;--card:rgba(20,20,25,.8);--border:rgba(255,255,255,.1);
  --txt:#fff;--txt2:#999;--blue:#0a84ff;--purple:#bf5af2;--green:#32d74b
}
body{
  background:var(--bg);color:var(--txt);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  min-height:100vh;overflow-x:hidden;touch-action:manipulation;
  -webkit-font-smoothing:antialiased
}
/* লাইভ ব্যাকগ্রাউন্ড - লাইটওয়েট */
.bg{position:fixed;inset:0;z-index:-1;background:#000;overflow:hidden}
.bg::before{
  content:'';position:absolute;width:200vmax;height:200vmax;
  background:conic-gradient(from 0deg,transparent,rgba(10,132,255,.15),transparent,rgba(191,90,242,.15),transparent);
  animation:spin 30s linear infinite;
  top:50%;left:50%;transform:translate(-50%,-50%)
}
.bg::after{
  content:'';position:absolute;inset:0;
  background:radial-gradient(circle at 30% 30%,rgba(10,132,255,.1) 0%,transparent 50%),
             radial-gradient(circle at 70% 70%,rgba(191,90,242,.1) 0%,transparent 50%);
  animation:pulse 8s ease-in-out infinite alternate
}
@keyframes spin{to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes pulse{0%{opacity:.5}100%{opacity:1}}

/* গ্লাস কার্ড */
.card{
  background:var(--card);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid var(--border);border-radius:20px;padding:20px;margin:12px;
  box-shadow:0 8px 32px rgba(0,0,0,.5);transition:transform .2s
}
.card:active{transform:scale(.98)}

/* বাটন */
.btn{
  display:block;width:100%;padding:16px;border:none;border-radius:14px;
  font-size:16px;font-weight:600;cursor:pointer;transition:all .2s;
  background:linear-gradient(135deg,var(--blue),var(--purple));color:#fff;
  text-align:center;text-decoration:none;margin:8px 0;
  box-shadow:0 4px 20px rgba(10,132,255,.3)
}
.btn:active{transform:scale(.95);opacity:.9}
.btn.secondary{background:rgba(255,255,255,.1);box-shadow:none}
.btn.small{padding:10px 16px;font-size:14px;display:inline-block;width:auto}

/* ইনপুট */
.input{
  width:100%;padding:16px;background:rgba(255,255,255,.05);
  border:1px solid var(--border);border-radius:14px;color:var(--txt);
  font-size:16px;margin:8px 0;outline:none;transition:all .2s
}
.input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(10,132,255,.2)}
textarea.input{min-height:120px;resize:vertical}

/* নেভিগেশন */
.nav{
  position:sticky;top:0;z-index:100;background:rgba(0,0,0,.8);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);padding:16px;
  display:flex;justify-content:space-between;align-items:center
}
.nav .logo{font-size:20px;font-weight:800;background:linear-gradient(135deg,var(--blue),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav .menu{display:flex;gap:12px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.nav .menu a{color:var(--txt2);text-decoration:none;font-size:14px;white-space:nowrap;padding:8px 12px;border-radius:10px}
.nav .menu a.active{color:var(--txt);background:rgba(255,255,255,.1)}

/* গ্রিড */
.grid{display:grid;grid-template-columns:1fr;gap:12px;padding:12px}
@media(min-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.grid{grid-template-columns:repeat(3,1fr)}}

/* টাইটেল */
h1{font-size:28px;font-weight:800;margin:8px 0;background:linear-gradient(135deg,#fff,#999);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
h2{font-size:22px;font-weight:700;margin:8px 0}
h3{font-size:18px;font-weight:600;margin:8px 0}
p{color:var(--txt2);line-height:1.6;margin:8px 0}
.badge{
  display:inline-block;padding:4px 12px;background:rgba(10,132,255,.2);
  color:var(--blue);border-radius:20px;font-size:12px;font-weight:600
}
.badge.gold{background:rgba(255,215,0,.2);color:gold}

/* লোডিং অ্যানিমেশন */
.loading{display:flex;gap:6px;justify-content:center;padding:20px}
.loading span{width:8px;height:8px;background:var(--blue);border-radius:50%;animation:bounce 1.4s infinite}
.loading span:nth-child(2){animation-delay:.2s}
.loading span:nth-child(3){animation-delay:.4s}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-12px)}}

/* প্রিভিউ */
.preview{
  width:100%;height:400px;border:1px solid var(--border);border-radius:14px;
  background:#fff;margin:12px 0
}

/* স্ক্রলবার */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:3px}

/* রেসপন্সিভ */
@media(max-width:400px){
  .card{margin:8px;padding:16px}
  h1{font-size:24px}
}
</style>
</head>
<body>
<div class="bg"></div>
<nav class="nav">
  <div class="logo">SJEMAR</div>
  <div class="menu">
    <a href="/" class="${title.includes('Home')?'active':''}">🏠</a>
    <a href="/create" class="${title.includes('AI')?'active':''}">🤖 AI</a>
    <a href="/dashboard" class="${title.includes('Vault')?'active':''}">📦</a>
    <a href="/posts" class="${title.includes('Posts')?'active':''}">📰</a>
    <a href="/admin">⚙️</a>
  </div>
  ${user ? `<span style="font-size:14px">👤 ${esc(user.username)}</span>` : ''}
</nav>
<div style="padding:12px;max-width:800px;margin:0 auto">
  ${db.settings.announcement ? `<div class="card" style="text-align:center;padding:12px"><span style="font-size:14px">${esc(db.settings.announcement)}</span></div>` : ''}
  ${body}
</div>
${extra}
<script>
// স্মুথ টাচ
document.addEventListener('touchstart',()=>{},{passive:true});
// লগআউট
function logout(){fetch('/api/logout',{method:'POST'}).then(()=>location.reload())}
</script>
</body>
</html>`;
}

// ইউজার হেল্পার
function getUser(req) {
  // সরলীকৃত - সেশন থেকে
  return req?.user || null;
}

// ==================== ROUTES ====================

// হোম পেজ
app.get("/", (req, res) => {
  res.send(page("Home - SJEMAR OLED", `
    <h1>🤖 AI Website Builder</h1>
    <p>Describe your website, AI will build it instantly. 100% Free!</p>
    <div class="grid">
      <div class="card">
        <span class="badge">FREE</span>
        <h3>AI Generator</h3>
        <p>Create websites with AI</p>
        <a href="/create" class="btn">✨ Start Now</a>
      </div>
      <div class="card">
        <span class="badge">VIP</span>
        <h3>899987 Badge</h3>
        <p>Special VIP system</p>
        <a href="/create" class="btn secondary">Learn More</a>
      </div>
      <div class="card">
        <span class="badge">PRO</span>
        <h3>Hosting</h3>
        <p>Publish your sites</p>
        <a href="/dashboard" class="btn secondary">View Vault</a>
      </div>
    </div>
  `));
});

// AI জেনারেটর পেজ
app.get("/create", (req, res) => {
  const user = sessions.get(req.headers.cookie?.match(/token=([^;]+)/)?.[1]) || {};
  
  if (!user.id) {
    // লগইন ফর্ম
    res.send(page("Login - SJEMAR", `
      <div class="card">
        <h2>🔐 Login (Free)</h2>
        <p>Sign in to use AI Generator</p>
        <input type="text" id="username" class="input" placeholder="Username">
        <input type="password" id="password" class="input" placeholder="Password">
        <button class="btn" onclick="login()">Continue</button>
        <p style="font-size:12px;text-align:center;margin-top:12px">New account auto-created</p>
      </div>
    `, `<script>
      async function login(){
        const res = await fetch('/api/login',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            username:document.getElementById('username').value,
            password:document.getElementById('password').value
          })
        });
        const data = await res.json();
        if(data.ok) location.reload();
        else alert(data.error);
      }
    </script>`));
    return;
  }

  // মূল পেজ
  res.send(page("AI Generator - SJEMAR", `
    <div class="card">
      <h2>🤖 AI Website Generator</h2>
      <p>Describe your dream website below</p>
      <textarea id="prompt" class="input" placeholder="e.g., A portfolio site for photographer with dark theme..."></textarea>
      <button class="btn" onclick="generateAI()" id="genBtn">✨ Generate with AI</button>
      <div id="loading" class="loading" style="display:none">
        <span></span><span></span><span></span>
      </div>
    </div>
    
    <div id="result" style="display:none">
      <div class="card">
        <h3>✅ Generated Code</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
          <button class="btn small" onclick="loadToEditor()">📝 Edit</button>
          <button class="btn small secondary" onclick="downloadHTML()">💾 Download</button>
          <button class="btn small secondary" onclick="previewHTML()">👁️ Preview</button>
        </div>
        <textarea id="aiCode" class="input" style="font-family:monospace;font-size:12px;height:300px"></textarea>
      </div>
      
      <div class="card">
        <h3>🚀 Publish Website</h3>
        <input type="text" id="siteTitle" class="input" placeholder="Site Title *">
        <input type="text" id="siteSlug" class="input" placeholder="Unique Slug *">
        <button class="btn" onclick="publishSite()">Publish Now</button>
      </div>
    </div>
    
    <div id="editorSection" style="display:none">
      <div class="card">
        <h3>📝 Code Editor</h3>
        <textarea id="htmlEditor" class="input" style="height:400px;font-family:monospace"></textarea>
        <button class="btn" onclick="publishFromEditor()">Publish from Editor</button>
      </div>
    </div>
  `, `
  <script>
    let aiHTML = '';
    
    async function generateAI(){
      const prompt = document.getElementById('prompt').value.trim();
      if(!prompt) return alert('Please describe your website');
      
      document.getElementById('loading').style.display = 'flex';
      document.getElementById('genBtn').disabled = true;
      
      try{
        const res = await fetch('/api/ai',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({prompt})
        });
        const data = await res.json();
        
        if(data.ok){
          aiHTML = data.html;
          document.getElementById('aiCode').value = data.html;
          document.getElementById('result').style.display = 'block';
          document.getElementById('result').scrollIntoView({behavior:'smooth'});
        }else{
          alert('AI Error: ' + data.error);
        }
      }catch(e){
        alert('Error: ' + e.message);
      }
      
      document.getElementById('loading').style.display = 'none';
      document.getElementById('genBtn').disabled = false;
    }
    
    function loadToEditor(){
      document.getElementById('htmlEditor').value = aiHTML;
      document.getElementById('editorSection').style.display = 'block';
      document.getElementById('editorSection').scrollIntoView({behavior:'smooth'});
    }
    
    function downloadHTML(){
      const blob = new Blob([aiHTML], {type:'text/html'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ai-website.html';
      a.click();
    }
    
    function previewHTML(){
      const win = window.open('','_blank');
      win.document.write(aiHTML);
      win.document.close();
    }
    
    async function publishSite(){
      const title = document.getElementById('siteTitle').value;
      const slug = document.getElementById('siteSlug').value;
      if(!title || !slug) return alert('Title and slug required');
      
      const res = await fetch('/api/publish',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({title, slug, html:aiHTML})
      });
      const data = await res.json();
      if(data.ok){
        alert('Published! URL: ' + data.url);
        location.href = '/dashboard';
      }else alert(data.error);
    }
    
    async function publishFromEditor(){
      const html = document.getElementById('htmlEditor').value;
      const title = prompt('Enter site title:');
      const slug = prompt('Enter unique slug:');
      if(!title || !slug) return;
      
      const res = await fetch('/api/publish',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({title, slug, html})
      });
      const data = await res.json();
      if(data.ok){
        alert('Published! URL: ' + data.url);
        location.href = '/dashboard';
      }else alert(data.error);
    }
  </script>`));
});

// ড্যাশবোর্ড
app.get("/dashboard", (req, res) => {
  const token = req.headers.cookie?.match(/token=([^;]+)/)?.[1];
  const user = sessions.get(token);
  
  if (!user) return res.redirect('/create');
  
  const mySites = db.sites.filter(s => s.userId === user.id);
  
  res.send(page("My Vault - SJEMAR", `
    <h1>📦 My Websites</h1>
    <a href="/create" class="btn">+ Create New</a>
    <div class="grid">
      ${mySites.map(s => `
        <div class="card">
          <h3>${esc(s.title)}</h3>
          <p>/${esc(s.slug)} • 👁️ ${s.views||0}</p>
          <div style="display:flex;gap:8px;margin-top:12px">
            <a href="/site/${s.slug}" target="_blank" class="btn small">Visit</a>
            <button class="btn small secondary" onclick="deleteSite('${s.id}')">🗑️</button>
          </div>
        </div>
      `).join('') || '<div class="card"><p>No sites yet. Create your first website!</p></div>'}
    </div>
  `, `
  <script>
    async function deleteSite(id){
      if(!confirm('Delete?')) return;
      await fetch('/api/sites/'+id, {method:'DELETE'});
      location.reload();
    }
  </script>`));
});

// পোস্টস
app.get("/posts", (req, res) => {
  res.send(page("Posts - SJEMAR", `
    <h1>📰 Latest Posts</h1>
    ${db.posts.length ? db.posts.map(p => `
      <div class="card">
        <span class="badge">${esc(p.folder||'General')}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.content||'').slice(0,100)}...</p>
      </div>
    `).join('') : '<div class="card"><p>No posts yet</p></div>'}
  `));
});

// অ্যাডমিন
app.get("/admin", (req, res) => {
  res.send(page("Admin - SJEMAR", `
    <div class="card" id="adminLogin">
      <h2>🔒 Admin Panel</h2>
      <input type="password" id="adminPass" class="input" placeholder="Admin PIN (5768)">
      <button class="btn" onclick="adminLogin()">Unlock</button>
    </div>
    <div id="adminPanel" style="display:none">
      <div class="card">
        <h2>📊 Statistics</h2>
        <p>Users: ${db.users.length}</p>
        <p>Websites: ${db.sites.length}</p>
        <p>Posts: ${db.posts.length}</p>
      </div>
      <div class="card">
        <h2>⚙️ Settings</h2>
        <input type="text" id="siteName" class="input" value="${esc(db.settings.siteName)}" placeholder="Site Name">
        <input type="text" id="announcement" class="input" value="${esc(db.settings.announcement)}" placeholder="Announcement">
        <button class="btn" onclick="saveSettings()">Save Settings</button>
      </div>
      <div class="card">
        <h2>👥 Users</h2>
        ${db.users.map(u => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)">
            <span>${esc(u.username)} ${u.id==='899987'?'<span class="badge gold">👑 VIP</span>':''}</span>
            <button class="btn small secondary" onclick="toggleBan('${u.id}')">${u.banned?'Unban':'Ban'}</button>
          </div>
        `).join('') || '<p>No users</p>'}
      </div>
    </div>
  `, `
  <script>
    async function adminLogin(){
      const pass = document.getElementById('adminPass').value;
      const res = await fetch('/api/admin/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({password:pass})
      });
      if((await res.json()).ok){
        document.getElementById('adminLogin').style.display='none';
        document.getElementById('adminPanel').style.display='block';
      }else alert('Wrong PIN');
    }
    async function saveSettings(){
      await fetch('/api/admin/settings',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          siteName:document.getElementById('siteName').value,
          announcement:document.getElementById('announcement').value
        })
      });
      alert('Saved!');
    }
    async function toggleBan(id){
      await fetch('/api/admin/ban/'+id,{method:'POST'});
      location.reload();
    }
  </script>`));
});

// সাইট ভিউ
app.get("/site/:slug", (req, res) => {
  const site = db.sites.find(s => s.slug === req.params.slug);
  if (!site) return res.status(404).send("Not Found");
  site.views = (site.views||0) + 1;
  save();
  res.type("html").send(site.html);
});

// ==================== APIs ====================

// লগইন
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ ok: false, error: "Fill all fields" });
  
  let user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user) {
    user = {
      id: genId(),
      username: username.trim(),
      password: crypto.createHash('sha256').update(password).digest('hex'),
      banned: false,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    save();
  } else {
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.password !== hash) return res.json({ ok: false, error: "Wrong password" });
    if (user.banned) return res.json({ ok: false, error: "Account banned" });
  }
  
  const token = genId();
  sessions.set(token, { id: user.id, username: user.username });
  res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Max-Age=86400`);
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  const token = req.headers.cookie?.match(/token=([^;]+)/)?.[1];
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', 'token=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

// AI জেনারেটর (সিম্পল - রিয়েল ওপেনরাউটার পরে যোগ করা যাবে)
app.post("/api/ai", (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.json({ ok: false, error: "Prompt required" });
  
  // সিম্পল টেমপ্লেট (পরে রিয়েল AI যোগ হবে)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Generated Website</title>
  <style>
    body{font-family:sans-serif;background:#111;color:#fff;padding:40px;text-align:center}
    .card{background:#222;border-radius:20px;padding:30px;margin:20px auto;max-width:600px}
    h1{background:linear-gradient(135deg,#0a84ff,#bf5af2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .btn{background:#0a84ff;color:#fff;padding:12px 24px;border-radius:10px;display:inline-block;margin:10px}
  </style>
</head>
<body>
  <h1>✨ AI Generated Website</h1>
  <div class="card">
    <p>Based on your prompt: "${esc(prompt)}"</p>
    <p>This is a demo template. Full AI integration coming soon!</p>
    <div class="btn">Get Started</div>
  </div>
</body>
</html>`;
  
  res.json({ ok: true, html });
});

// পাবলিশ
app.post("/api/publish", (req, res) => {
  const token = req.headers.cookie?.match(/token=([^;]+)/)?.[1];
  const user = sessions.get(token);
  if (!user) return res.json({ ok: false, error: "Login required" });
  
  const { title, slug, html } = req.body;
  if (!title || !slug || !html) return res.json({ ok: false, error: "Fill all fields" });
  
  if (db.sites.some(s => s.slug === slug)) {
    return res.json({ ok: false, error: "Slug already taken" });
  }
  
  db.sites.push({
    id: genId(),
    userId: user.id,
    title, slug, html,
    views: 0,
    createdAt: new Date().toISOString()
  });
  save();
  
  res.json({ ok: true, url: `/site/${slug}` });
});

app.delete("/api/sites/:id", (req, res) => {
  const token = req.headers.cookie?.match(/token=([^;]+)/)?.[1];
  const user = sessions.get(token);
  if (!user) return res.json({ ok: false });
  
  db.sites = db.sites.filter(s => s.id !== req.params.id || s.userId !== user.id);
  save();
  res.json({ ok: true });
});

// অ্যাডমিন APIs
app.post("/api/admin/login", (req, res) => {
  if (req.body.password === "5768" || req.body.password === "py.py.php") {
    res.json({ ok: true });
  } else {
    res.json({ ok: false });
  }
});

app.post("/api/admin/settings", (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  save();
  res.json({ ok: true });
});

app.post("/api/admin/ban/:id", (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (user) {
    user.banned = !user.banned;
    save();
  }
  res.json({ ok: true });
});

// 404
app.use((req, res) => {
  res.status(404).send(page("404", `
    <div class="card" style="text-align:center">
      <h1>404</h1>
      <p>Page not found</p>
      <a href="/" class="btn">Go Home</a>
    </div>
  `));
});

// সার্ভার স্টার্ট
app.listen(PORT, () => {
  console.log(`✅ SJEMAR OLED v4.0 Running!`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🔑 Admin PIN: 5768`);
});
