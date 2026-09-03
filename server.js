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

// 1. Schemas
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
  badge: { type: String, default: "NEW" },
  createdAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

const ADMIN_PASS = "py.py.php";

// 2. APIs
app.post('/api/create', async (req, res) => {
  try {
    const { slug, htmlContent } = req.body;
    if (!slug || !htmlContent) return res.status(400).json({ error: "সব তথ্য দিন" });
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

app.post('/api/admin/verify', (req, res) => {
  const { pass } = req.body;
  if (pass === ADMIN_PASS) return res.json({ success: true });
  res.status(401).json({ error: "ভুল পাসওয়ার্ড!" });
});

app.post('/api/admin/task/add', async (req, res) => {
  try {
    const { pass, title, description, link, badge } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    const newTask = new Task({ title, description, link, badge: badge || "HOT" });
    await newTask.save();
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

// 3. Frontend HTML/CSS/JS (iOS OLED Dark Glass)
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>AURA X • iOS Web Studio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background-color: #000000; color: #FFFFFF; min-height: 100vh; padding-bottom: 100px; position: relative; overflow-x: hidden; }
    
    .glow-1 { position: fixed; width: 250px; height: 250px; border-radius: 50%; filter: blur(90px); background: #0A84FF; top: -50px; left: -50px; opacity: 0.25; pointer-events: none; }
    .glow-2 { position: fixed; width: 250px; height: 250px; border-radius: 50%; filter: blur(90px); background: #BF5AF2; bottom: 50px; right: -50px; opacity: 0.2; pointer-events: none; }

    .header { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); background: rgba(0,0,0,0.7); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
    .header h2 { font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #0A84FF, #BF5AF2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 12px; background: rgba(10,132,255,0.2); color: #64D2FF; border: 1px solid rgba(10,132,255,0.3); }

    .main { max-width: 480px; margin: 0 auto; padding: 18px 16px; position: relative; z-index: 10; }
    .tab-view { display: none; }
    .tab-view.active { display: block; }

    .card { background: rgba(22, 22, 26, 0.75); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.12); border-radius: 22px; padding: 20px; margin-bottom: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); }
    .title { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
    .sub { font-size: 12px; color: #8E8E93; margin-bottom: 16px; }

    label { font-size: 11px; font-weight: 600; color: #8E8E93; text-transform: uppercase; margin-bottom: 5px; display: block; }
    input, textarea { width: 100%; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px; color: #fff; font-size: 14px; outline: none; margin-bottom: 12px; }
    input:focus, textarea:focus { border-color: #0A84FF; box-shadow: 0 0 0 3px rgba(10,132,255,0.25); }
    textarea { font-family: monospace; resize: vertical; }

    .btn { width: 100%; padding: 13px; border-radius: 14px; font-size: 14px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .btn-primary { background: linear-gradient(135deg, #0A84FF, #5E5CE6); color: #fff; box-shadow: 0 6px 20px rgba(10,132,255,0.35); }
    .btn-primary:active { transform: scale(0.97); }

    .nav { position: fixed; bottom: 15px; left: 50%; transform: translateX(-50%); width: calc(100% - 30px); max-width: 400px; background: rgba(18,18,22,0.85); backdrop-filter: blur(35px); -webkit-backdrop-filter: blur(35px); border: 1px solid rgba(255,255,255,0.15); border-radius: 28px; padding: 8px 12px; display: flex; justify-content: space-around; z-index: 50; box-shadow: 0 15px 35px rgba(0,0,0,0.9); }
    .nav-item { background: transparent; border: none; color: #8E8E93; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; cursor: pointer; padding: 6px 14px; border-radius: 16px; }
    .nav-item.active { color: #0A84FF; background: rgba(10,132,255,0.15); }
    
    .item-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; }
    
    .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); display: none; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
    .modal-box { background: #16161C; border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; width: 100%; max-width: 330px; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>

  <div class="header">
    <h2>AURA X STUDIO</h2>
    <span class="badge">OLED GLASS</span>
  </div>

  <div class="main">
    <!-- TAB 1: HOST -->
    <div id="tab-host" class="tab-view active">
      <div class="card">
        <div class="title">🚀 Host HTML Page</div>
        <div class="sub">HTML কোড দিয়ে এক ক্লিকে নিজস্ব লিংক বানান।</div>
        
        <label>URL Path (নাম)</label>
        <input type="text" id="slugInput" placeholder="যেমন: domain, username, portfolio">

        <label>HTML / CSS / JS কোড</label>
        <textarea id="htmlInput" rows="6" placeholder="<!DOCTYPE html> ..."></textarea>

        <button class="btn btn-primary" onclick="createPage()">⚡ লিংক তৈরি করুন</button>

        <div id="resBox" style="display:none; margin-top:14px; padding:12px; background:rgba(10,132,255,0.15); border:1px solid rgba(10,132,255,0.3); border-radius:14px; text-align:center;">
          <div style="font-size:12px; color:#64D2FF; margin-bottom:6px;">🎉 সফল হয়েছে! আপনার লাইভ লিংক:</div>
          <a id="resLink" href="" target="_blank" style="color:#fff; font-weight:700; word-break:break-all; font-size:13px; text-decoration:underline;"></a>
        </div>
      </div>
    </div>

    <!-- TAB 2: TASKS -->
    <div id="tab-tasks" class="tab-view">
      <div class="card">
        <div class="title">📋 Tasks</div>
        <div class="sub">নিচের টাস্কগুলো সম্পন্ন করুন:</div>
        <div id="tasksList"><div style="text-align:center; color:#8E8E93; padding:15px;">লোড হচ্ছে...</div></div>
      </div>
    </div>

    <!-- TAB 3: LINKS -->
    <div id="tab-links" class="tab-view">
      <div class="card">
        <div class="title">🌐 Recent Links</div>
        <div class="sub">সর্বশেষ তৈরি হওয়া লিংকগুলো:</div>
        <div id="recentList"><div style="text-align:center; color:#8E8E93; padding:15px;">লোড হচ্ছে...</div></div>
      </div>
    </div>

    <!-- TAB 4: ADMIN -->
    <div id="tab-admin" class="tab-view">
      <div id="adminLocked" class="card" style="text-align:center; padding:30px 15px;">
        <div style="font-size:40px; margin-bottom:10px;">🔒</div>
        <div class="title">Admin Locked</div>
        <div class="sub">এডমিন ফিচারের জন্য পাসওয়ার্ড দিয়ে আনলক করুন</div>
        <button class="btn btn-primary" onclick="openPassModal()">Unlock Admin</button>
      </div>

      <div id="adminUnlocked" style="display:none;">
        <div class="card">
          <div class="title">➕ Add New Task</div>
          <div class="sub">নতুন টাস্ক পাবলিশ করুন</div>

          <label>Title</label>
          <input type="text" id="tTitle" placeholder="Task Title">

          <label>Description</label>
          <input type="text" id="tDesc" placeholder="Task Description">

          <label>URL</label>
          <input type="text" id="tUrl" placeholder="https://t.me/yourlink">

          <label>Badge</label>
          <input type="text" id="tBadge" placeholder="HOT, NEW">

          <button class="btn btn-primary" onclick="addTask()">Publish Task</button>
        </div>

        <div class="card">
          <div class="title">📂 Manage Pages</div>
          <div class="sub">তৈরি করা লিংকগুলো নিয়ন্ত্রণ করুন:</div>
          <div id="adminPages"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Nav -->
  <div class="nav">
    <button class="nav-item active" onclick="setTab('host', this)">⚡ Host</button>
    <button class="nav-item" onclick="setTab('tasks', this)">📋 Tasks</button>
    <button class="nav-item" onclick="setTab('links', this)">🌐 Links</button>
    <button class="nav-item" onclick="setTab('admin', this)">🔒 Admin</button>
  </div>

  <!-- Modal -->
  <div id="passModal" class="modal">
    <div class="modal-box">
      <div style="font-size:30px; margin-bottom:6px;">🔑</div>
      <div style="font-size:16px; font-weight:700; margin-bottom:5px;">Master Key দিন</div>
      <div style="font-size:12px; color:#8E8E93; margin-bottom:12px;">এডমিন পাসওয়ার্ড দিন</div>
      <input type="password" id="passInput" placeholder="Password...">
      <div style="display:flex; gap:8px;">
        <button class="btn" style="background:rgba(255,255,255,0.1); color:#fff;" onclick="closePassModal()">Cancel</button>
        <button class="btn btn-primary" onclick="checkPass()">Unlock</button>
      </div>
    </div>
  </div>

  <script>
    let token = "";

    function setTab(name, btn) {
      document.querySelectorAll('.tab-view').forEach(e => e.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
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
        list.innerHTML = '<div style="text-align:center; color:#8E8E93; padding:15px;">কোনো টাস্ক নেই।</div>';
        return;
      }
      let html = '';
      data.forEach(t => {
        html += '<div class="item-card"><div style="display:flex; justify-content:space-between; margin-bottom:5px;"><b style="font-size:14px;">' + t.title + '</b><span class="badge">' + t.badge + '</span></div><p style="font-size:12px; color:#8E8E93; margin-bottom:10px;">' + t.description + '</p><a href="' + t.link + '" target="_blank" style="display:inline-block; padding:6px 14px; background:#0A84FF; color:#fff; font-size:12px; font-weight:600; border-radius:10px; text-decoration:none;">টাস্ক শুরু ↗</a></div>';
      });
      list.innerHTML = html;
    }

    async function getLinks() {
      const list = document.getElementById('recentList');
      const res = await fetch('/api/pages-public');
      const data = await res.json();
      if (!data.length) {
        list.innerHTML = '<div style="text-align:center; color:#8E8E93; padding:15px;">কোনো লিংক নেই।</div>';
        return;
      }
      let html = '';
      data.forEach(p => {
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; margin-bottom:8px;"><span>/' + p.slug + '</span><a href="/' + p.slug + '" target="_blank" style="color:#0A84FF; font-size:12px; text-decoration:none; font-weight:600;">Visit ↗</a></div>';
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
        alert("❌ ভুল পাসওয়ার্ড!");
      }
    }

    async function addTask() {
      const title = document.getElementById('tTitle').value;
      const description = document.getElementById('tDesc').value;
      const link = document.getElementById('tUrl').value;
      const badge = document.getElementById('tBadge').value;

      if (!title || !description || !link) return alert("সব তথ্য পূরণ করুন!");

      const res = await fetch('/api/admin/task/add', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pass: token, title, description, link, badge })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ টাস্ক যোগ হয়েছে!");
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
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; margin-bottom:8px;"><a href="/' + p.slug + '" target="_blank" style="color:#fff; text-decoration:none;">/' + p.slug + '</a><button onclick="delPage(\\'' + p._id + '\\')" style="background:#FF453A; color:#fff; border:none; padding:5px 10px; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer;">Delete</button></div>';
      });
      list.innerHTML = html;
    }

    async function delPage(id) {
      if (!confirm("ডিলিট করতে চান?")) return;
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

// 4. Serve dynamic HTML pages
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
app.listen(PORT, () => console.log('Server is running on port ' + PORT));
