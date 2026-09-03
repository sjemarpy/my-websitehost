const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error: " + err));

// Schemas
const pageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  htmlContent: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Page = mongoose.model('Page', pageSchema);

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  link: { type: String, required: true },
  badge: { type: String, default: "REQUIRED" },
  createdAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

const ADMIN_PASS = "py.py.php";

// Public APIs
app.post('/api/create', async (req, res) => {
  try {
    const { slug, htmlContent } = req.body;
    if (!slug || !htmlContent) return res.status(400).json({ error: "সব ফিল্ড পূরণ করুন" });
    const cleanSlug = slug.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
    
    await Page.findOneAndUpdate(
      { slug: cleanSlug },
      { htmlContent: htmlContent },
      { upsert: true, new: true }
    );
    const fullUrl = req.protocol + "://" + req.get('host') + "/" + cleanSlug;
    res.json({ success: true, fullUrl: fullUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/pages-public', async (req, res) => {
  try {
    const pages = await Page.find().select('slug createdAt').sort({ createdAt: -1 }).limit(10);
    res.json(pages);
  } catch (err) {
    res.json([]);
  }
});

// Admin APIs
app.post('/api/admin/verify', (req, res) => {
  const { pass } = req.body;
  if (pass === ADMIN_PASS) return res.json({ success: true });
  res.status(401).json({ error: "Invalid Passcode" });
});

app.post('/api/admin/task/add', async (req, res) => {
  try {
    const { pass, title, description, link, badge } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    const newTask = new Task({ title, description, link, badge: badge || "VERIFIED" });
    await newTask.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/task/:id', async (req, res) => {
  try {
    const { pass } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/all-pages', async (req, res) => {
  try {
    const { pass } = req.query;
    if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    const pages = await Page.find().sort({ createdAt: -1 });
    res.json(pages);
  } catch (err) {
    res.json([]);
  }
});

app.delete('/api/admin/page/:id', async (req, res) => {
  try {
    const { pass } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    await Page.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UI
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SJEMAR • Web Hosting & Tasks</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #030712;
      --card: rgba(17, 24, 39, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --accent: #3B82F6;
      --accent-grad: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
      --text: #F9FAFB;
      --muted: #9CA3AF;
      --nav-bg: rgba(15, 23, 42, 0.85);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background-color: var(--bg); color: var(--text); min-height: 100vh; padding-bottom: 100px; position: relative; overflow-x: hidden; }

    .glow-1 { position: fixed; width: 300px; height: 300px; border-radius: 50%; filter: blur(100px); background: #1D4ED8; top: -80px; left: -80px; opacity: 0.3; pointer-events: none; }
    .glow-2 { position: fixed; width: 300px; height: 300px; border-radius: 50%; filter: blur(100px); background: #6D28D9; bottom: 50px; right: -80px; opacity: 0.25; pointer-events: none; }

    .header { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); background: rgba(3, 7, 18, 0.75); border-bottom: 1px solid var(--border); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .header .logo { font-size: 19px; font-weight: 800; letter-spacing: 0.5px; background: var(--accent-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header .tag { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: rgba(59, 130, 246, 0.15); color: #60A5FA; border: 1px solid rgba(59, 130, 246, 0.3); }

    .container { max-width: 480px; margin: 0 auto; padding: 20px 16px; position: relative; z-index: 10; }
    .tab-content { display: none; }
    .tab-content.active { display: block; animation: fade 0.25s ease; }
    @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .card { background: var(--card); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); border: 1px solid var(--border); border-radius: 24px; padding: 22px; margin-bottom: 18px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .card-title { font-size: 17px; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .card-sub { font-size: 13px; color: var(--muted); margin-bottom: 18px; line-height: 1.4; }

    label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
    input, textarea { width: 100%; background: rgba(3, 7, 18, 0.7); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; color: #fff; font-size: 14px; outline: none; margin-bottom: 14px; transition: 0.2s; }
    input:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
    textarea { font-family: monospace; resize: vertical; }

    .btn { width: 100%; padding: 14px; border-radius: 14px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; }
    .btn-primary { background: var(--accent-grad); color: #fff; box-shadow: 0 8px 25px rgba(37, 99, 235, 0.35); }
    .btn-primary:active { transform: scale(0.98); }

    .nav { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); max-width: 400px; background: var(--nav-bg); backdrop-filter: blur(35px); -webkit-backdrop-filter: blur(35px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 30px; padding: 8px 12px; display: flex; justify-content: space-around; z-index: 50; box-shadow: 0 20px 50px rgba(0,0,0,0.9); }
    .nav-btn { background: transparent; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; cursor: pointer; padding: 6px 14px; border-radius: 20px; transition: 0.2s; }
    .nav-btn svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .nav-btn.active { color: #60A5FA; background: rgba(59, 130, 246, 0.15); }
    .nav-btn.active svg { stroke: #60A5FA; }

    .item-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; }
    .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(25px); display: none; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
    .modal-box { background: #0B0F19; border: 1px solid var(--border); border-radius: 24px; width: 100%; max-width: 340px; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>

  <div class="header">
    <div class="logo">SJEMAR</div>
    <div class="tag">STUDIO v2</div>
  </div>

  <div class="container">
    <!-- TAB 1: HOST -->
    <div id="tab-host" class="tab-content active">
      <div class="card">
        <div class="card-title">Host HTML Page</div>
        <div class="card-sub">যেকোনো HTML কোড দিয়ে এক ক্লিকে লাইভ ডোমেন লিংক তৈরি করুন।</div>
        
        <label>Custom Domain / Slug</label>
        <input type="text" id="slugInput" placeholder="domain, portfolio, bio">

        <label>HTML Code</label>
        <textarea id="htmlInput" rows="7" placeholder="<!DOCTYPE html> ..."></textarea>

        <button class="btn btn-primary" onclick="createPage()">Generate Live Link</button>

        <div id="resBox" style="display:none; margin-top:16px; padding:14px; background:rgba(37,99,235,0.15); border:1px solid rgba(37,99,235,0.3); border-radius:14px; text-align:center;">
          <div style="font-size:12px; color:#93C5FD; margin-bottom:6px; font-weight:600;">LIVE URL READY:</div>
          <a id="resLink" href="" target="_blank" style="color:#fff; font-weight:700; word-break:break-all; font-size:13px; text-decoration:underline;"></a>
        </div>
      </div>
    </div>

    <!-- TAB 2: TASKS -->
    <div id="tab-tasks" class="tab-content">
      <div class="card">
        <div class="card-title">Tasks & Verification</div>
        <div class="card-sub">নিচের টাস্কগুলো সম্পন্ন করুন:</div>
        <div id="tasksList"><div style="text-align:center; color:var(--muted); padding:20px;">লোড হচ্ছে...</div></div>
      </div>
    </div>

    <!-- TAB 3: LINKS -->
    <div id="tab-links" class="tab-content">
      <div class="card">
        <div class="card-title">Recent Pages</div>
        <div class="card-sub">সর্বশেষ তৈরি হওয়া লাইভ ডোমেনসমূহ:</div>
        <div id="recentList"><div style="text-align:center; color:var(--muted); padding:20px;">লোড হচ্ছে...</div></div>
      </div>
    </div>

    <!-- TAB 4: ADMIN -->
    <div id="tab-admin" class="tab-content">
      <div id="adminLocked" class="card" style="text-align:center; padding:35px 20px;">
        <div class="card-title" style="justify-content:center; margin-bottom:6px;">Admin Access Required</div>
        <div class="card-sub">পাসওয়ার্ড দিয়ে এডমিন প্যানেল আনলক করুন</div>
        <button class="btn btn-primary" onclick="openPassModal()">Unlock Console</button>
      </div>

      <div id="adminUnlocked" style="display:none;">
        <div class="card">
          <div class="card-title">Add Official Task</div>
          <div class="card-sub">টাস্ক টাইটেল ও লিংক পাবলিশ করুন</div>

          <label>Title</label>
          <input type="text" id="tTitle" placeholder="Task Title">

          <label>Description</label>
          <input type="text" id="tDesc" placeholder="Task details...">

          <label>Target URL</label>
          <input type="text" id="tUrl" placeholder="https://...">

          <label>Badge Tag</label>
          <input type="text" id="tBadge" placeholder="MANDATORY, HOT">

          <button class="btn btn-primary" onclick="addTask()">Publish Task</button>
        </div>

        <div class="card">
          <div class="card-title">Manage Hosted Pages</div>
          <div class="card-sub">তৈরি হওয়া ডোমেনগুলো মুছুন বা পরিদর্শন করুন:</div>
          <div id="adminPages"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Navigation -->
  <nav class="nav">
    <button class="nav-btn active" onclick="setTab('host', this)">
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      Host
    </button>
    <button class="nav-btn" onclick="setTab('tasks', this)">
      <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      Tasks
    </button>
    <button class="nav-btn" onclick="setTab('links', this)">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      Links
    </button>
    <button class="nav-btn" onclick="setTab('admin', this)">
      <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Admin
    </button>
  </nav>

  <!-- Pass Modal -->
  <div id="passModal" class="modal">
    <div class="modal-box">
      <div style="font-size:17px; font-weight:700; margin-bottom:6px;">Master Passcode</div>
      <div style="font-size:12px; color:var(--muted); margin-bottom:14px;">এডমিন পাসওয়ার্ড দিন</div>
      <input type="password" id="passInput" placeholder="••••••••">
      <div style="display:flex; gap:10px;">
        <button class="btn" style="background:rgba(255,255,255,0.08); color:#fff;" onclick="closePassModal()">Cancel</button>
        <button class="btn btn-primary" onclick="checkPass()">Unlock</button>
      </div>
    </div>
  </div>

  <script>
    let token = "";

    function setTab(name, btn) {
      document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
      document.getElementById('tab-' + name).classList.add('active');
      btn.classList.add('active');

      if (name === 'tasks') getTasks();
      if (name === 'links') getLinks();
      if (name === 'admin' && token) getAdminPages();
    }

    async function createPage() {
      const slug = document.getElementById('slugInput').value.trim();
      const htmlContent = document.getElementById('htmlInput').value;
      if (!slug || !htmlContent) return alert("দয়া করে নাম ও HTML কোড দিন!");

      const res = await fetch('/api/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ slug, htmlContent })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('resBox').style.display = 'block';
        const link = document.getElementById('resLink');
        link.href = data.fullUrl;
        link.innerText = data.fullUrl;
      } else {
        alert(data.error || "Error");
      }
    }

    async function getTasks() {
      const list = document.getElementById('tasksList');
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (!data.length) {
        list.innerHTML = '<div style="text-align:center; color:var(--muted); padding:15px;">কোনো টাস্ক নেই।</div>';
        return;
      }
      let html = '';
      data.forEach(t => {
        html += '<div class="item-card"><div style="display:flex; justify-content:space-between; margin-bottom:5px;"><b style="font-size:14px;">' + t.title + '</b><span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; background:rgba(59,130,246,0.2); color:#60A5FA;">' + t.badge + '</span></div><p style="font-size:12px; color:var(--muted); margin-bottom:10px;">' + t.description + '</p><a href="' + t.link + '" target="_blank" style="display:inline-block; padding:6px 14px; background:#2563EB; color:#fff; font-size:12px; font-weight:600; border-radius:10px; text-decoration:none;">Open Task</a></div>';
      });
      list.innerHTML = html;
    }

    async function getLinks() {
      const list = document.getElementById('recentList');
      const res = await fetch('/api/pages-public');
      const data = await res.json();
      if (!data.length) {
        list.innerHTML = '<div style="text-align:center; color:var(--muted); padding:15px;">কোনো ডোমেন তৈরি করা হয়নি।</div>';
        return;
      }
      let html = '';
      data.forEach(p => {
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; margin-bottom:8px;"><span>/' + p.slug + '</span><a href="/' + p.slug + '" target="_blank" style="color:#60A5FA; font-size:12px; text-decoration:none; font-weight:600;">Visit Page ↗</a></div>';
      });
      list.innerHTML = html;
    }

    function openPassModal() { document.getElementById('passModal').style.display = 'flex'; }
    function closePassModal() { document.getElementById('passModal').style.display = 'none'; }

    async function checkPass() {
      const pass = document.getElementById('passInput').value;
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pass })
      });
      const data = await res.json();
      if (data.success) {
        token = pass;
        closePassModal();
        document.getElementById('adminLocked').style.display = 'none';
        document.getElementById('adminUnlocked').style.display = 'block';
        getAdminPages();
      } else {
        alert("ভুল পাসওয়ার্ড!");
      }
    }

    async function addTask() {
      const title = document.getElementById('tTitle').value;
      const description = document.getElementById('tDesc').value;
      const link = document.getElementById('tUrl').value;
      const badge = document.getElementById('tBadge').value;

      if (!title || !description || !link) return alert("সব তথ্য দিন!");

      const res = await fetch('/api/admin/task/add', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pass: token, title, description, link, badge })
      });
      const data = await res.json();
      if (data.success) {
        alert("টাস্ক সফলভাবে যোগ হয়েছে!");
        document.getElementById('tTitle').value = '';
        document.getElementById('tDesc').value = '';
        document.getElementById('tUrl').value = '';
      }
    }

    async function getAdminPages() {
      const list = document.getElementById('adminPages');
      const res = await fetch('/api/admin/all-pages?pass=' + token);
      const data = await res.json();
      let html = '';
      data.forEach(p => {
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; margin-bottom:8px;"><a href="/' + p.slug + '" target="_blank" style="color:#fff; text-decoration:none; font-weight:600;">/' + p.slug + '</a><button onclick="delPage(\\'' + p._id + '\\')" style="background:#EF4444; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer;">Delete</button></div>';
      });
      list.innerHTML = html;
    }

    async function delPage(id) {
      if (!confirm("আপনি কি নিশ্চিত এটি ডিলিট করতে চান?")) return;
      await fetch('/api/admin/page/' + id, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pass: token })
      });
      getAdminPages();
    }
  </script>
</body>
</html>`);
});

// Dynamic Pages
app.get('/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug.toLowerCase() });
    if (!page) return res.status(404).send("<h1 style='font-family:sans-serif; text-align:center; padding:50px; background:#000; color:#fff;'>404 - Page Not Found</h1>");
    res.set('Content-Type', 'text/html');
    res.send(page.htmlContent);
  } catch (err) {
    res.send("Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on ' + PORT));
