const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ১. Schemas
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

// ২. API Endpoints
app.post('/api/create', async (req, res) => {
  try {
    const { slug, htmlContent } = req.body;
    if (!slug || !htmlContent) return res.status(400).json({ error: "সকল তথ্য দিন" });
    const cleanSlug = slug.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
    
    await Page.findOneAndUpdate(
      { slug: cleanSlug },
      { htmlContent: htmlContent },
      { upsert: true, new: true }
    );
    res.json({ success: true, link: `/${cleanSlug}`, fullUrl: `${req.protocol}://${req.get('host')}/${cleanSlug}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1 });
  res.json(tasks);
});

app.get('/api/pages-public', async (req, res) => {
  const pages = await Page.find().select('slug createdAt').sort({ createdAt: -1 }).limit(10);
  res.json(pages);
});

// Admin APIs
app.post('/api/admin/verify', (req, res) => {
  const { pass } = req.body;
  if (pass === ADMIN_PASS) return res.json({ success: true });
  res.status(401).json({ error: "ভুল পাসওয়ার্ড!" });
});

app.post('/api/admin/task/add', async (req, res) => {
  const { pass, title, description, link, badge } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
  const newTask = new Task({ title, description, link, badge: badge || "TASK" });
  await newTask.save();
  res.json({ success: true });
});

app.delete('/api/admin/task/:id', async (req, res) => {
  const { pass } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
  await Task.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/all-pages', async (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
  const pages = await Page.find().sort({ createdAt: -1 });
  res.json(pages);
});

app.delete('/api/admin/page/:id', async (req, res) => {
  const { pass } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
  await Page.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ৩. iOS OLED Dark Glass Blur Frontend UI
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>AURA X • iOS Web Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(18, 18, 22, 0.75);
      --card-border: rgba(255, 255, 255, 0.12);
      --card-border-glow: rgba(0, 122, 255, 0.35);
      --primary: #0A84FF;
      --primary-gradient: linear-gradient(135deg, #0A84FF 0%, #5E5CE6 50%, #BF5AF2 100%);
      --text: #FFFFFF;
      --text-dim: #8E8E93;
      --nav-bg: rgba(15, 15, 18, 0.85);
      --success: #30D158;
      --danger: #FF453A;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Plus Jakarta Sans", sans-serif; -webkit-tap-highlight-color: transparent; }
    
    body {
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
      padding-bottom: 110px;
      position: relative;
    }

    /* Background Neon Glow Orbs */
    .glow-orb {
      position: fixed;
      width: 260px;
      height: 260px;
      border-radius: 50%;
      filter: blur(90px);
      opacity: 0.25;
      pointer-events: none;
      z-index: 0;
    }
    .orb-1 { top: -40px; left: -40px; background: #0A84FF; }
    .orb-2 { top: 40%; right: -60px; background: #BF5AF2; }
    .orb-3 { bottom: 100px; left: 20%; background: #5E5CE6; }

    /* App Header */
    .app-header {
      position: sticky;
      top: 0;
      z-index: 40;
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      background: rgba(0, 0, 0, 0.7);
      border-bottom: 1px solid var(--card-border);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(10, 132, 255, 0.15);
      border: 1px solid rgba(10, 132, 255, 0.3);
      color: #64D2FF;
    }

    /* Container */
    .main-content {
      max-width: 480px;
      margin: 0 auto;
      padding: 20px 16px;
      position: relative;
      z-index: 10;
    }

    /* Tab Sections */
    .tab-section { display: none; animation: fadeIn 0.3s ease; }
    .tab-section.active { display: block; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* iOS Glass Cards */
    .glass-card {
      background: var(--card-bg);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 22px;
      margin-bottom: 20px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
      transition: border 0.3s ease;
    }
    .glass-card:hover {
      border-color: rgba(255, 255, 255, 0.22);
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-subtitle {
      font-size: 13px;
      color: var(--text-dim);
      margin-bottom: 18px;
      line-height: 1.4;
    }

    /* Inputs */
    .input-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-dim);
      margin-bottom: 6px;
      display: block;
    }
    .ios-input, .ios-textarea {
      width: 100%;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 14px 16px;
      color: #fff;
      font-size: 14px;
      outline: none;
      transition: all 0.25s ease;
      margin-bottom: 14px;
    }
    .ios-input:focus, .ios-textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.25);
      background: rgba(0, 0, 0, 0.85);
    }
    .ios-textarea {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      resize: vertical;
      font-size: 13px;
    }

    /* Buttons */
    .ios-btn {
      width: 100%;
      padding: 15px;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .ios-btn-primary {
      background: var(--primary-gradient);
      color: #fff;
      box-shadow: 0 8px 24px rgba(10, 132, 255, 0.4);
    }
    .ios-btn-primary:active {
      transform: scale(0.97);
      opacity: 0.9;
    }
    .ios-btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    /* Tasks list */
    .task-item {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 16px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .task-title {
      font-size: 15px;
      font-weight: 600;
    }
    .task-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 8px;
      background: rgba(48, 209, 88, 0.15);
      border: 1px solid rgba(48, 209, 88, 0.3);
      color: var(--success);
    }
    .task-desc {
      font-size: 13px;
      color: var(--text-dim);
      line-height: 1.4;
    }
    .task-action-btn {
      align-self: flex-start;
      padding: 8px 18px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 12px;
      background: var(--primary);
      color: white;
      text-decoration: none;
      display: inline-block;
      transition: 0.2s;
    }

    /* Bottom iOS Nav Bar */
    .bottom-nav {
      position: fixed;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 32px);
      max-width: 420px;
      background: var(--nav-bg);
      backdrop-filter: blur(35px);
      -webkit-backdrop-filter: blur(35px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 30px;
      padding: 8px 14px;
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 50;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85);
    }
    .nav-btn {
      background: transparent;
      border: none;
      color: var(--text-dim);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 20px;
      transition: all 0.25s ease;
    }
    .nav-btn svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: stroke 0.25s;
    }
    .nav-btn.active {
      color: var(--primary);
      background: rgba(10, 132, 255, 0.12);
    }
    .nav-btn.active svg {
      stroke: var(--primary);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(20px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }
    .modal-box {
      background: #15151A;
      border: 1px solid var(--card-border);
      border-radius: 24px;
      width: 100%;
      max-width: 360px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8);
      animation: modalPop 0.25s ease;
    }
    @keyframes modalPop {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  </style>
</head>
<body>

  <!-- Glow Backgrounds -->
  <div class="glow-orb orb-1"></div>
  <div class="glow-orb orb-2"></div>
  <div class="glow-orb orb-3"></div>

  <!-- Header -->
  <div class="app-header">
    <div class="brand-title">AURA X STUDIO</div>
    <div class="brand-badge">OLED GLASS</div>
  </div>

  <!-- Content -->
  <div class="main-content">

    <!-- 1. TAB: CREATE HTML LINK -->
    <div id="tab-host" class="tab-section active">
      <div class="glass-card">
        <div class="card-title">🚀 Host HTML Page</div>
        <div class="card-subtitle">আপনার HTML, CSS ও JS কোড দিয়ে মুহূর্তে নিজস্ব URL তৈরি করুন।</div>
        
        <label class="input-label">CUSTOM SLUG (URL NAME)</label>
        <input type="text" id="slugInput" class="ios-input" placeholder="যেমন: domain, portfolio, myapp">

        <label class="input-label">HTML / CSS / JS CODE</label>
        <textarea id="htmlInput" class="ios-textarea" rows="7" placeholder="<!DOCTYPE html> ... Paste your code"></textarea>

        <button class="ios-btn ios-btn-primary" onclick="createPage()">
          <span>⚡ লিংক তৈরি করুন</span>
        </button>

        <!-- Result Box -->
        <div id="resultBox" style="display:none; margin-top:16px; padding:14px; background:rgba(10,132,255,0.1); border:1px solid rgba(10,132,255,0.3); border-radius:16px; text-align:center;">
          <div style="font-size:13px; color:#64D2FF; margin-bottom:8px;">🎉 সফল হয়েছে! আপনার লাইভ লিংক:</div>
          <a id="resultLink" href="" target="_blank" style="color:#fff; font-weight:700; word-break:break-all; font-size:14px; text-decoration:underline;"></a>
        </div>
      </div>
    </div>

    <!-- 2. TAB: TASKS -->
    <div id="tab-tasks" class="tab-section">
      <div class="glass-card">
        <div class="card-title">📋 Available Tasks</div>
        <div class="card-subtitle">এডমিনের দেওয়া টাস্কগুলো সম্পন্ন করুন।</div>
        <div id="tasksList">
          <div style="text-align:center; color:var(--text-dim); padding:20px;">লোড হচ্ছে...</div>
        </div>
      </div>
    </div>

    <!-- 3. TAB: RECENT LINKS -->
    <div id="tab-links" class="tab-section">
      <div class="glass-card">
        <div class="card-title">🌐 Recent Live Links</div>
        <div class="card-subtitle">হোস্ট করা পেজগুলোর সাম্প্রতিক লিংক:</div>
        <div id="recentPagesList"></div>
      </div>
    </div>

    <!-- 4. TAB: ADMIN PANEL -->
    <div id="tab-admin" class="tab-section">
      <div id="adminLockedView" class="glass-card" style="text-align:center; padding:35px 20px;">
        <div style="font-size:45px; margin-bottom:12px;">🔒</div>
        <div class="card-title" style="justify-content:center;">Admin Access Locked</div>
        <div class="card-subtitle">এডমিন ফিচার ব্যবহার করার জন্য মাস্টার কি দিয়ে আনলক করুন।</div>
        <button class="ios-btn ios-btn-primary" onclick="openAdminPassModal()">আনলক করুন</button>
      </div>

      <div id="adminUnlockedView" style="display:none;">
        <!-- Add Task Card -->
        <div class="glass-card">
          <div class="card-title">➕ নতুন Task যোগ করুন</div>
          <div class="card-subtitle">টাস্ক টাইটেল ও লিংক দিন:</div>

          <label class="input-label">TASK TITLE</label>
          <input type="text" id="taskTitle" class="ios-input" placeholder="যেমন: Join Telegram Community">

          <label class="input-label">TASK DESCRIPTION</label>
          <input type="text" id="taskDesc" class="ios-input" placeholder="টাস্কের বিবরণ লিখুন...">

          <label class="input-label">TARGET URL</label>
          <input type="text" id="taskUrl" class="ios-input" placeholder="https://t.me/yourgroup">

          <label class="input-label">BADGE TAG</label>
          <input type="text" id="taskBadge" class="ios-input" placeholder="HOT, 50 COIN, NEW">

          <button class="ios-btn ios-btn-primary" onclick="addTask()">টাস্ক পাবলিশ করুন</button>
        </div>

        <!-- Manage Pages -->
        <div class="glass-card">
          <div class="card-title">📂 Manage All Created Links</div>
          <div class="card-subtitle">তৈরি হওয়া পেজগুলো ডিলিট বা নিয়ন্ত্রণ করুন:</div>
          <div id="adminPagesList"></div>
        </div>
      </div>
    </div>

  </div>

  <!-- Bottom iOS Navigation Bar -->
  <nav class="bottom-nav">
    <button class="nav-btn active" onclick="switchTab('host', this)">
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      Host
    </button>
    <button class="nav-btn" onclick="switchTab('tasks', this)">
      <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      Tasks
    </button>
    <button class="nav-btn" onclick="switchTab('links', this)">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      Links
    </button>
    <button class="nav-btn" onclick="switchTab('admin', this)">
      <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Admin
    </button>
  </nav>

  <!-- Password Prompt Modal -->
  <div id="passModal" class="modal-overlay">
    <div class="modal-box">
      <div style="font-size:32px; margin-bottom:8px;">🔑</div>
      <div style="font-size:17px; font-weight:700; margin-bottom:6px;">Master Key দিন</div>
      <div style="font-size:12px; color:var(--text-dim); margin-bottom:16px;">এডমিন পাসওয়ার্ড দিয়ে আনলক করুন</div>
      <input type="password" id="adminPassInput" class="ios-input" placeholder="Password...">
      <div style="display:flex; gap:10px;">
        <button class="ios-btn ios-btn-secondary" onclick="closeAdminPassModal()">Cancel</button>
        <button class="ios-btn ios-btn-primary" onclick="verifyAdminPass()">Unlock</button>
      </div>
    </div>
  </div>

  <script>
    let adminToken = "";

    function switchTab(tabId, btn) {
      document.querySelectorAll('.tab-section').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('tab-' + tabId).classList.add('active');
      btn.classList.add('active');

      if (tabId === 'tasks') loadTasks();
      if (tabId === 'links') loadRecentLinks();
      if (tabId === 'admin' && adminToken) loadAdminPages();
    }

    async function createPage() {
      const slug = document.getElementById('slugInput').value.trim();
      const htmlContent = document.getElementById('htmlInput').value;
      if (!slug || !htmlContent) return alert("দয়া করে নাম ও HTML কোড লিখুন!");

      try {
        const res = await fetch('/api/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, htmlContent })
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('resultBox').style.display = 'block';
          const linkElem = document.getElementById('resultLink');
          linkElem.href = data.fullUrl;
          linkElem.innerText = data.fullUrl;
        } else {
          alert("Error: " + data.error);
        }
      } catch (e) {
        alert("সার্ভার সমস্যা: " + e.message);
      }
    }

    async function loadTasks() {
      const list = document.getElementById('tasksList');
      try {
        const res = await fetch('/api/tasks');
        const tasks = await res.json();
        if (!tasks.length) {
          list.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">এখনো কোনো টাস্ক যোগ করা হয়নি।</div>';
          return;
        }
        list.innerHTML = tasks.map(t => \`
          <div class="task-item">
            <div class="task-header">
              <span class="task-title">\${t.title}</span>
              <span class="task-badge">\${t.badge}</span>
            </div>
            <div class="task-desc">\${t.description}</div>
            <a href="\${t.link}" target="_blank" class="task-action-btn">টাস্ক শুরু করুন ↗</a>
          </div>
        \`).join('');
      } catch(e) {
        list.innerHTML = 'টাস্ক লোড করতে সমস্যা হয়েছে।';
      }
    }

    async function loadRecentLinks() {
      const list = document.getElementById('recentPagesList');
      try {
        const res = await fetch('/api/pages-public');
        const pages = await res.json();
        if (!pages.length) {
          list.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">কোনো লিংক তৈরি করা হয়নি।</div>';
          return;
        }
        list.innerHTML = pages.map(p => \`
          <div style="padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:600;">/\${p.slug}</span>
            <a href="/\${p.slug}" target="_blank" style="color:var(--primary); font-size:13px; text-decoration:none; font-weight:600;">ভিজিট করুন ↗</a>
          </div>
        \`).join('');
      } catch(e) {}
    }

    function openAdminPassModal() {
      document.getElementById('passModal').style.display = 'flex';
    }
    function closeAdminPassModal() {
      document.getElementById('passModal').style.display = 'none';
    }

    async function verifyAdminPass() {
      const pass = document.getElementById('adminPassInput').value;
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass })
      });
      const data = await res.json();
      if (data.success) {
        adminToken = pass;
        closeAdminPassModal();
        document.getElementById('adminLockedView').style.display = 'none';
        document.getElementById('adminUnlockedView').style.display = 'block';
        loadAdminPages();
      } else {
        alert("❌ ভুল পাসওয়ার্ড!");
      }
    }

    async function addTask() {
      const title = document.getElementById('taskTitle').value;
      const description = document.getElementById('taskDesc').value;
      const link = document.getElementById('taskUrl').value;
      const badge = document.getElementById('taskBadge').value;

      if (!title || !description || !link) return alert("সব তথ্য পূরণ করুন!");

      const res = await fetch('/api/admin/task/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass: adminToken, title, description, link, badge })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ টাস্ক যোগ করা হয়েছে!");
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDesc').value = '';
        document.getElementById('taskUrl').value = '';
      }
    }

    async function loadAdminPages() {
      const list = document.getElementById('adminPagesList');
      const res = await fetch('/api/admin/all-pages?pass=' + adminToken);
      const pages = await res.json();
      list.innerHTML = pages.map(p => \`
        <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <a href="/\${p.slug}" target="_blank" style="color:#fff; font-weight:600; text-decoration:none;">/\${p.slug}</a>
          <button onclick="deletePage('\${p._id}')" style="background:#FF453A; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer;">Delete</button>
        </div>
      \`).join('');
    }

    async function deletePage(id) {
      if (!confirm("আপনি কি নিশ্চিত এই পেজটি ডিলিট করতে চান?")) return;
      await fetch('/api/admin/page/' + id, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass: adminToken })
      });
      loadAdminPages();
    }
  </script>
</body>
</html>
  `);
});

// ৪. ইউজারদের কাঙ্ক্ষিত HTML লিংক সার্ভ করা
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
/* Ambient glow */

body::before{
    content:"";
    position:fixed;
    width:280px;
    height:280px;
    border-radius:50%;
    background:rgba(10,132,255,.08);
    filter:blur(90px);
    top:10%;
    left:-100px;
    pointer-events:none;
}

body::after{
    content:"";
    position:fixed;
    width:280px;
    height:280px;
    border-radius:50%;
    background:rgba(191,90,242,.07);
    filter:blur(90px);
    right:-100px;
    bottom:5%;
    pointer-events:none;
}

/* Main */

.container{
    width:100%;
    max-width:520px;
    position:relative;
    z-index:2;
}

/* Glass card */

.card{
    width:100%;
    padding:30px;

    background:
        linear-gradient(
            145deg,
            rgba(255,255,255,.075),
            rgba(255,255,255,.025)
        );

    background-color:var(--card);

    border:1px solid var(--border);

    border-radius:28px;

    backdrop-filter:blur(35px) saturate(150%);
    -webkit-backdrop-filter:blur(35px) saturate(150%);

    box-shadow:
        0 30px 80px rgba(0,0,0,.65),
        inset 0 1px 0 rgba(255,255,255,.07);

    animation:appear .45s ease;
}

@keyframes appear{
    from{
        opacity:0;
        transform:translateY(15px) scale(.98);
    }
    to{
        opacity:1;
        transform:translateY(0) scale(1);
    }
}

/* Logo */

.logo-wrap{
    display:flex;
    justify-content:center;
    margin-bottom:18px;
}

.logo{
    width:68px;
    height:68px;

    display:flex;
    align-items:center;
    justify-content:center;

    border-radius:21px;

    background:
        linear-gradient(
            145deg,
            rgba(10,132,255,.22),
            rgba(191,90,242,.18)
        );

    border:1px solid rgba(255,255,255,.12);

    box-shadow:
        0 15px 40px rgba(10,132,255,.15),
        inset 0 1px 0 rgba(255,255,255,.10);

    font-size:30px;
}

/* Heading */

h1{
    text-align:center;
    font-size:25px;
    font-weight:800;
    letter-spacing:-.7px;

    margin-bottom:8px;

    background:
        linear-gradient(
            90deg,
            #fff,
            #b9c7ff
        );

    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
}

.subtitle{
    text-align:center;
    color:var(--muted);

    font-size:13px;
    line-height:1.6;

    margin-bottom:27px;
}

/* Labels */

.field{
    margin-bottom:18px;
}

label{
    display:flex;
    align-items:center;
    gap:7px;

    color:#d1d1d6;

    font-size:12px;
    font-weight:600;

    margin-bottom:9px;
}

.label-dot{
    width:6px;
    height:6px;
    border-radius:50%;
    background:var(--blue);
    box-shadow:0 0 10px rgba(10,132,255,.7);
}

/* Inputs */

input,
textarea{
    width:100%;

    color:#fff;

    background:
        rgba(0,0,0,.62);

    border:1px solid rgba(255,255,255,.10);

    border-radius:15px;

    padding:14px 15px;

    outline:none;

    font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;

    font-size:14px;

    transition:
        border .2s,
        box-shadow .2s,
        background .2s;
}

input{
    height:50px;
}

textarea{
    min-height:150px;
    resize:vertical;

    font-family:
        "SFMono-Regular",
        Consolas,
        monospace;

    line-height:1.55;
}

input::placeholder,
textarea::placeholder{
    color:#55555b;
}

input:focus,
textarea:focus{
    border-color:rgba(10,132,255,.65);

    background:rgba(5,8,14,.85);

    box-shadow:
        0 0 0 3px rgba(10,132,255,.10),
        0 10px 30px rgba(0,0,0,.25);
}

/* Button */

button{
    width:100%;
    height:52px;

    border:none;
    border-radius:16px;

    color:#fff;

    font-size:14px;
    font-weight:700;

    cursor:pointer;

    background:
        linear-gradient(
            135deg,
            #0a84ff,
            #5856d6
        );

    box-shadow:
        0 12px 30px rgba(10,132,255,.20),
        inset 0 1px 0 rgba(255,255,255,.20);

    transition:
        transform .15s,
        filter .15s;
}

button:active{
    transform:scale(.975);
    filter:brightness(.9);
}

.button-content{
    display:flex;
    align-items:center;
    justify-content:center;
    gap:9px;
}

/* Footer */

.footer{
    text-align:center;
    margin-top:18px;

    color:#55555b;

    font-size:10px;
    letter-spacing:.3px;
}

@media(max-width:480px){

    body{
        padding:14px;
        align-items:center;
    }

    .card{
        padding:24px 20px;
        border-radius:25px;
    }

    h1{
        font-size:23px;
    }

    textarea{
        min-height:135px;
    }
}

</style>
</head>

<body>

<div class="container">

<div class="card">

    <div class="logo-wrap">
        <div class="logo">⚡</div>
    </div>

    <h1>Instant HTML Host</h1>

    <p class="subtitle">
        আপনার HTML, CSS ও JavaScript কোডকে
        একটি সুন্দর পাবলিক লিংকে প্রকাশ করুন।
    </p>

    <form action="/create" method="POST">

        <div class="field">

            <label>
                <span class="label-dot"></span>
                URL নাম
            </label>

            <input
                type="text"
                name="slug"
                placeholder="যেমন: portfolio"
                autocomplete="off"
                required
            >

        </div>


        <div class="field">

            <label>
                <span class="label-dot"></span>
                HTML / CSS / JS
            </label>

            <textarea
                name="htmlContent"
                placeholder="<!DOCTYPE html>
<html>
  <head>
    ...
  </head>
</html>"
                spellcheck="false"
                required
            ></textarea>

        </div>


        <button type="submit">

            <span class="button-content">
                <span>🚀</span>
                <span>লিংক তৈরি করুন</span>
            </span>

        </button>

    </form>

    <div class="footer">
        SECURE • FAST • SIMPLE
    </div>

</div>

</div>

</body>
</html>
  `);
});


// =====================================================
// CREATE PAGE
// =====================================================

app.post('/create', async (req, res) => {

  try {

    const { slug, htmlContent } = req.body;

    if (!slug || !htmlContent) {
      return res.status(400).send("Slug এবং HTML code প্রয়োজন");
    }

    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .trim();

    if (!cleanSlug) {
      return res.status(400).send("সঠিক URL নাম দিন");
    }

    await Page.findOneAndUpdate(
      { slug: cleanSlug },
      {
        slug: cleanSlug,
        htmlContent: htmlContent
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    const link =
      `${req.protocol}://${req.get('host')}/${cleanSlug}`;


    res.send(`
<!DOCTYPE html>
<html lang="bn">

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width,
      initial-scale=1.0,
      maximum-scale=1.0">

<meta name="theme-color" content="#000">

<title>Page Created</title>

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet">

<style>

*{
    box-sizing:border-box;
    margin:0;
    padding:0;
    -webkit-tap-highlight-color:transparent;
}

body{

    min-height:100vh;

    display:flex;
    align-items:center;
    justify-content:center;

    padding:20px;

    background:
        radial-gradient(
            circle at 50% -10%,
            rgba(48,209,88,.13),
            transparent 35%
        ),
        radial-gradient(
            circle at 100% 100%,
            rgba(10,132,255,.10),
            transparent 35%
        ),
        #000;

    color:#fff;

    font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "SF Pro Display",
        sans-serif;
}

.card{

    width:100%;
    max-width:470px;

    padding:30px;

    text-align:center;

    border-radius:28px;

    background:
        linear-gradient(
            145deg,
            rgba(255,255,255,.075),
            rgba(255,255,255,.025)
        );

    border:1px solid rgba(255,255,255,.10);

    backdrop-filter:blur(35px) saturate(150%);
    -webkit-backdrop-filter:blur(35px) saturate(150%);

    box-shadow:
        0 30px 80px rgba(0,0,0,.7),
        inset 0 1px 0 rgba(255,255,255,.07);

    animation:show .4s ease;
}

@keyframes show{

    from{
        opacity:0;
        transform:translateY(15px) scale(.97);
    }

    to{
        opacity:1;
        transform:translateY(0) scale(1);
    }

}

.success-icon{

    width:76px;
    height:76px;

    margin:0 auto 18px;

    display:flex;
    align-items:center;
    justify-content:center;

    border-radius:24px;

    background:
        rgba(48,209,88,.10);

    border:1px solid rgba(48,209,88,.20);

    font-size:34px;

    box-shadow:
        0 15px 40px rgba(48,209,88,.08);
}

h2{

    font-size:23px;
    font-weight:800;

    letter-spacing:-.5px;

    margin-bottom:8px;
}

.desc{

    color:#8e8e93;

    font-size:13px;

    margin-bottom:20px;
}

.link-box{

    padding:15px;

    border-radius:15px;

    background:
        rgba(0,0,0,.55);

    border:1px solid rgba(255,255,255,.09);

    color:#0a84ff;

    font-size:13px;

    line-height:1.5;

    word-break:break-all;

    margin-bottom:18px;
}

.actions{

    display:grid;

    grid-template-columns:1fr 1fr;

    gap:10px;
}

a,
button{

    height:48px;

    border-radius:14px;

    display:flex;

    align-items:center;
    justify-content:center;

    text-decoration:none;

    font-size:13px;
    font-weight:700;

    cursor:pointer;

    border:none;
}

.visit{

    color:#fff;

    background:
        linear-gradient(
            135deg,
            #0a84ff,
            #5856d6
        );

    box-shadow:
        0 10px 25px rgba(10,132,255,.18);
}

.home{

    color:#fff;

    background:
        rgba(255,255,255,.07);

    border:1px solid rgba(255,255,255,.09);
}

.footer{

    margin-top:18px;

    color:#55555b;

    font-size:10px;
}

@media(max-width:430px){

    .card{
        padding:25px 19px;
        border-radius:25px;
    }

    .actions{
        grid-template-columns:1fr;
    }

}

</style>

</head>

<body>

<div class="card">

    <div class="success-icon">
        ✓
    </div>

    <h2>
        পেজ তৈরি হয়েছে
    </h2>

    <p class="desc">
        আপনার HTML পেজ এখন অনলাইনে প্রকাশিত।
    </p>

    <div class="link-box">
        ${link}
    </div>

    <div class="actions">

        <a
            href="${link}"
            target="_blank"
            rel="noopener"
            class="visit"
        >
            পেজ দেখুন ↗
        </a>

        <a
            href="/"
            class="home"
        >
            নতুন পেজ
        </a>

    </div>

    <div class="footer">
        INSTANT HTML HOST
    </div>

</div>

</body>
</html>
    `);

  } catch (err) {

    console.error(err);

    res.status(500).send(`
      <h2 style="
        font-family:sans-serif;
        text-align:center;
        margin-top:50px;
      ">
        Server Error
      </h2>
    `);

  }

});


// =====================================================
// DYNAMIC HTML PAGE
// =====================================================

app.get('/:slug', async (req, res) => {

  try {

    const page = await Page.findOne({
      slug: req.params.slug.toLowerCase()
    });

    if (!page) {

      return res.status(404).send(`
<!DOCTYPE html>
<html>

<head>

<meta name="viewport"
      content="width=device-width,
      initial-scale=1">

<title>404</title>

<style>

body{
    margin:0;
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    background:#000;
    color:#fff;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
}

.box{
    text-align:center;
}

h1{
    font-size:55px;
    margin:0 0 10px;
}

p{
    color:#8e8e93;
}

a{
    color:#0a84ff;
    text-decoration:none;
}

</style>

</head>

<body>

<div class="box">

<h1>404</h1>

<p>এই পেজটি পাওয়া যায়নি।</p>

<a href="/">← Home</a>

</div>

</body>

</html>
      `);

    }

    res.set('Content-Type', 'text/html; charset=utf-8');

    res.send(page.htmlContent);

  } catch (err) {

    console.error(err);

    res.status(500).send("Server Error");

  }

});


// =====================================================
// SERVER
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(\`Server is running on port \${PORT}\`);
});
