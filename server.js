const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch(err => console.log("MongoDB Error: " + err));

// Database Schemas
const pageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  htmlContent: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Page = mongoose.model('Page', pageSchema);

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  htmlCode: { type: String, required: true },
  tag: { type: String, default: "PREMIUM" },
  createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', projectSchema);

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  link: { type: String, required: true },
  badge: { type: String, default: "REQUIRED" },
  createdAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

const ADMIN_PASS = "py.py.php";

// --- API ROUTES ---

// 1. User/Public APIs
app.post('/api/create-domain', async (req, res) => {
  try {
    const { slug, htmlContent } = req.body;
    if (!slug || !htmlContent) return res.status(400).json({ error: "সকল তথ্য সঠিকভাবে পূরণ করুন" });
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

app.get('/api/get-projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/get-tasks', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/get-recent-links', async (req, res) => {
  try {
    const pages = await Page.find().select('slug createdAt').sort({ createdAt: -1 }).limit(10);
    res.json(pages);
  } catch (err) {
    res.json([]);
  }
});

// 2. Admin APIs
app.post('/api/admin/auth', (req, res) => {
  const { pass } = req.body;
  if (pass === ADMIN_PASS) return res.json({ success: true });
  res.status(401).json({ error: "অননুমোদিত এক্সেস! পাসওয়ার্ড ভুল।" });
});

app.post('/api/admin/project/add', async (req, res) => {
  try {
    const { pass, title, description, htmlCode, tag } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    const newProj = new Project({ title, description, htmlCode, tag: tag || "FEATURED" });
    await newProj.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/project/:id', async (req, res) => {
  try {
    const { pass } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/task/add', async (req, res) => {
  try {
    const { pass, title, description, link, badge } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    const newTask = new Task({ title, description, link, badge: badge || "TASK" });
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

app.get('/api/admin/all-domains', async (req, res) => {
  try {
    const { pass } = req.query;
    if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    const pages = await Page.find().sort({ createdAt: -1 });
    res.json(pages);
  } catch (err) {
    res.json([]);
  }
});

app.delete('/api/admin/domain/:id', async (req, res) => {
  try {
    const { pass } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    await Page.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- FRONTEND CLIENT ---
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SJEMAR • Web Hub & Hosting Engine</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --card: rgba(18, 18, 22, 0.7);
      --card-border: rgba(255, 255, 255, 0.09);
      --primary: #2563EB;
      --primary-hover: #1D4ED8;
      --accent-gradient: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%);
      --text-main: #FFFFFF;
      --text-dim: #9CA3AF;
      --nav-bg: rgba(12, 12, 16, 0.85);
      --danger: #EF4444;
      --success: #10B981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background-color: var(--bg); color: var(--text-main); min-height: 100vh; padding-bottom: 110px; position: relative; overflow-x: hidden; }

    /* Background Ambient Glow */
    .glow-1 { position: fixed; width: 280px; height: 280px; border-radius: 50%; filter: blur(100px); background: #2563EB; top: -60px; left: -60px; opacity: 0.25; pointer-events: none; }
    .glow-2 { position: fixed; width: 280px; height: 280px; border-radius: 50%; filter: blur(100px); background: #8B5CF6; bottom: 80px; right: -60px; opacity: 0.2; pointer-events: none; }

    /* App Header */
    .header { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); background: rgba(0, 0, 0, 0.75); border-bottom: 1px solid var(--card-border); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .header .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header .badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px; background: rgba(59, 130, 246, 0.15); color: #60A5FA; border: 1px solid rgba(59, 130, 246, 0.3); }

    /* Layout */
    .container { max-width: 480px; margin: 0 auto; padding: 20px 16px; position: relative; z-index: 10; }
    .tab-section { display: none; }
    .tab-section.active { display: block; animation: slideUp 0.25s ease; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    /* OLED Glass Cards */
    .glass-card { background: var(--card); backdrop-filter: blur(35px); -webkit-backdrop-filter: blur(35px); border: 1px solid var(--card-border); border-radius: 22px; padding: 22px; margin-bottom: 18px; box-shadow: 0 15px 35px rgba(0,0,0,0.7); }
    .card-title { font-size: 17px; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .card-desc { font-size: 13px; color: var(--text-dim); margin-bottom: 18px; line-height: 1.4; }

    /* Inputs */
    .form-label { font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; display: block; }
    .glass-input, .glass-textarea { width: 100%; background: rgba(0, 0, 0, 0.7); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 14px 16px; color: #fff; font-size: 14px; outline: none; margin-bottom: 14px; transition: 0.2s; }
    .glass-input:focus, .glass-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25); background: rgba(0, 0, 0, 0.9); }
    .glass-textarea { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; resize: vertical; }

    /* Action Buttons */
    .glass-btn { width: 100%; padding: 14px; border-radius: 14px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease; }
    .btn-gradient { background: var(--accent-gradient); color: #fff; box-shadow: 0 8px 25px rgba(37, 99, 235, 0.35); }
    .btn-gradient:active { transform: scale(0.98); opacity: 0.9; }
    .btn-secondary { background: rgba(255, 255, 255, 0.08); border: 1px solid var(--card-border); color: #fff; }

    /* Lists */
    .list-card { background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: 16px; padding: 16px; margin-bottom: 12px; }
    
    /* Bottom Navigation Bar */
    .nav-bar { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); max-width: 420px; background: var(--nav-bg); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 30px; padding: 8px 10px; display: flex; justify-content: space-around; align-items: center; z-index: 50; box-shadow: 0 20px 45px rgba(0,0,0,0.9); }
    .nav-link { background: transparent; border: none; color: var(--text-dim); display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; cursor: pointer; padding: 6px 14px; border-radius: 20px; transition: 0.2s; }
    .nav-link svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .nav-link.active { color: #60A5FA; background: rgba(59, 130, 246, 0.15); }
    .nav-link.active svg { stroke: #60A5FA; }

    /* Modal */
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(25px); display: none; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
    .modal-window { background: #0B0B0E; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 24px; width: 100%; max-width: 340px; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>

  <!-- Header -->
  <header class="header">
    <div class="brand">SJEMAR</div>
    <div class="badge">STUDIO v3</div>
  </header>

  <main class="container">
    <!-- 1. HOST TAB -->
    <section id="tab-host" class="tab-section active">
      <div class="glass-card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Custom Domain Builder
        </div>
        <div class="card-desc">আপনার নিজস্ব নাম (Slug) ও HTML কোড দিয়ে ডোমেন লাইভ করুন।</div>

        <label class="form-label">Domain Name / Path</label>
        <input type="text" id="domainInput" class="glass-input" placeholder="যেমন: domain, portfolio, bio">

        <label class="form-label">HTML / CSS / JS Code</label>
        <textarea id="codeContent" class="glass-textarea" rows="7" placeholder="<!DOCTYPE html> ... Paste here"></textarea>

        <button class="glass-btn btn-gradient" onclick="publishDomain()">
          Deploy Domain Now
        </button>

        <div id="outputBox" style="display:none; margin-top:16px; padding:14px; background:rgba(37,99,235,0.15); border:1px solid rgba(37,99,235,0.3); border-radius:14px; text-align:center;">
          <div style="font-size:12px; color:#93C5FD; margin-bottom:6px; font-weight:700;">DEPLOYED URL:</div>
          <a id="outputLink" href="" target="_blank" style="color:#fff; font-weight:700; word-break:break-all; font-size:13px; text-decoration:underline;"></a>
        </div>
      </div>
    </section>

    <!-- 2. PROJECTS / TEMPLATES TAB -->
    <section id="tab-projects" class="tab-section">
      <div class="glass-card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          Official HTML Projects
        </div>
        <div class="card-desc">এডমিনের দেওয়া প্রজেক্ট ও প্রিমিয়াম সোর্স কোড সংগ্রহ করুন:</div>
        <div id="projectCatalog"><div style="text-align:center; color:var(--text-dim); padding:20px;">লোড হচ্ছে...</div></div>
      </div>
    </section>

    <!-- 3. TASKS TAB -->
    <section id="tab-tasks" class="tab-section">
      <div class="glass-card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Official Tasks
        </div>
        <div class="card-desc">লক করা ফিচার বা সোর্স কোড পেতে নিচের টাস্ক সম্পন্ন করুন:</div>
        <div id="tasksFeed"><div style="text-align:center; color:var(--text-dim); padding:20px;">লোড হচ্ছে...</div></div>
      </div>
    </section>

    <!-- 4. RECENT LINKS TAB -->
    <section id="tab-links" class="tab-section">
      <div class="glass-card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EC4899" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
          Recent Live Domains
        </div>
        <div class="card-desc">ইউজারদের তৈরি করা সর্বশেষ সক্রিয় লিংকগুলো:</div>
        <div id="recentDomainsList"><div style="text-align:center; color:var(--text-dim); padding:20px;">লোড হচ্ছে...</div></div>
      </div>
    </section>

    <!-- 5. ADMIN CONTROL TAB -->
    <section id="tab-admin" class="tab-section">
      <div id="adminLockedState" class="glass-card" style="text-align:center; padding:35px 20px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" style="margin-bottom:12px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <div class="card-title" style="justify-content:center; margin-bottom:6px;">Admin Master Access</div>
        <div class="card-desc">পাসওয়ার্ড দিয়ে এডমিন কনসোল আনলক করুন</div>
        <button class="glass-btn btn-gradient" onclick="openKeyPrompt()">Unlock Console</button>
      </div>

      <div id="adminUnlockedState" style="display:none;">
        <!-- Add Project -->
        <div class="glass-card">
          <div class="card-title">Upload Locked Project / HTML</div>
          <div class="card-desc">নতুন সোর্স কোড ও টেমপ্লেট যুক্ত করুন</div>

          <label class="form-label">Project Title</label>
          <input type="text" id="pTitle" class="glass-input" placeholder="যেমন: Temp Mail Script, UID Checker">

          <label class="form-label">Description</label>
          <input type="text" id="pDesc" class="glass-input" placeholder="বিবরণ লিখুন...">

          <label class="form-label">Badge Tag</label>
          <input type="text" id="pTag" class="glass-input" placeholder="PRO, HOT, FREE">

          <label class="form-label">Raw HTML Code</label>
          <textarea id="pHtml" class="glass-textarea" rows="5" placeholder="<!DOCTYPE html> ..."></textarea>

          <button class="glass-btn btn-gradient" onclick="saveProject()">Publish Project</button>
        </div>

        <!-- Add Task -->
        <div class="glass-card">
          <div class="card-title">Add Official Task</div>
          <div class="card-desc">টেলিগ্রাম/ইউটিউব ভেরিফিকেশন লিংক পাবলিশ করুন</div>

          <label class="form-label">Task Title</label>
          <input type="text" id="tTitle" class="glass-input" placeholder="Join Telegram Channel">

          <label class="form-label">Task Info</label>
          <input type="text" id="tDesc" class="glass-input" placeholder="চ্যানেলে জয়েন করে আপডেট পান">

          <label class="form-label">Target Link</label>
          <input type="text" id="tUrl" class="glass-input" placeholder="https://t.me/...">

          <label class="form-label">Badge</label>
          <input type="text" id="tBadge" class="glass-input" placeholder="MANDATORY">

          <button class="glass-btn btn-gradient" onclick="saveTask()">Publish Task</button>
        </div>

        <!-- Manage Domains -->
        <div class="glass-card">
          <div class="card-title">Manage Live Domains</div>
          <div class="card-desc">তৈরি হওয়া ডোমেন লিংকগুলো মুছে ফেলুন বা পরিদর্শন করুন:</div>
          <div id="adminDomainsList"></div>
        </div>
      </div>
    </section>
  </main>

  <!-- Bottom Floating Tab Bar -->
  <nav class="nav-bar">
    <button class="nav-link active" onclick="navigate('host', this)">
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      Host
    </button>
    <button class="nav-link" onclick="navigate('projects', this)">
      <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      Codes
    </button>
    <button class="nav-link" onclick="navigate('tasks', this)">
      <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      Tasks
    </button>
    <button class="nav-link" onclick="navigate('links', this)">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
      Links
    </button>
    <button class="nav-link" onclick="navigate('admin', this)">
      <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Admin
    </button>
  </nav>

  <!-- Auth Modal -->
  <div id="authDialog" class="modal-backdrop">
    <div class="modal-window">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" style="margin-bottom:8px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      <div style="font-size:16px; font-weight:700; margin-bottom:4px;">Master Passcode</div>
      <div style="font-size:12px; color:var(--text-dim); margin-bottom:14px;">এডমিন পাসওয়ার্ড দিয়ে আনলক করুন</div>
      <input type="password" id="adminSecret" class="glass-input" placeholder="••••••••">
      <div style="display:flex; gap:10px;">
        <button class="glass-btn btn-secondary" onclick="closeKeyPrompt()">Cancel</button>
        <button class="glass-btn btn-gradient" onclick="authorizeAdmin()">Authorize</button>
      </div>
    </div>
  </div>

  <script>
    let adminKey = "";

    function navigate(tab, element) {
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      element.classList.add('active');

      if (tab === 'projects') loadProjects();
      if (tab === 'tasks') loadTasksFeed();
      if (tab === 'links') loadRecentDomains();
      if (tab === 'admin' && adminKey) loadAdminDomains();
    }

    async function publishDomain() {
      const slug = document.getElementById('domainInput').value.trim();
      const htmlContent = document.getElementById('codeContent').value;
      if (!slug || !htmlContent) return alert("ডোমেন নাম ও HTML কোড প্রদান করুন!");

      const res = await fetch('/api/create-domain', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ slug, htmlContent })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('outputBox').style.display = 'block';
        const link = document.getElementById('outputLink');
        link.href = data.fullUrl;
        link.innerText = data.fullUrl;
      } else {
        alert(data.error || "সমস্যা হয়েছে!");
      }
    }

    async function loadProjects() {
      const catalog = document.getElementById('projectCatalog');
      const res = await fetch('/api/get-projects');
      const items = await res.json();
      if (!items.length) {
        catalog.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">এখনো কোনো প্রজেক্ট কোড দেওয়া হয়নি।</div>';
        return;
      }
      let html = '';
      items.forEach(p => {
        html += '<div class="list-card"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;"><b style="font-size:15px;">' + p.title + '</b><span style="font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px; background:rgba(139,92,246,0.2); color:#C4B5FD;">' + p.tag + '</span></div><p style="font-size:12px; color:var(--text-dim); margin-bottom:12px;">' + p.description + '</p><button onclick="copyCode(\\'' + encodeURIComponent(p.htmlCode) + '\\')" class="glass-btn btn-secondary" style="padding:8px 14px; font-size:12px;">Copy Source Code</button></div>';
      });
      catalog.innerHTML = html;
    }

    function copyCode(encoded) {
      navigator.clipboard.writeText(decodeURIComponent(encoded));
      alert("✅ সোর্স কোড কপি করা হয়েছে!");
    }

    async function loadTasksFeed() {
      const feed = document.getElementById('tasksFeed');
      const res = await fetch('/api/get-tasks');
      const tasks = await res.json();
      if (!tasks.length) {
        feed.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">কোনো সক্রিয় টাস্ক পাওয়া যায়নি।</div>';
        return;
      }
      let html = '';
      tasks.forEach(t => {
        html += '<div class="list-card"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;"><b style="font-size:14px;">' + t.title + '</b><span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; background:rgba(16,185,129,0.2); color:#6EE7B7;">' + t.badge + '</span></div><p style="font-size:12px; color:var(--text-dim); margin-bottom:12px;">' + t.description + '</p><a href="' + t.link + '" target="_blank" class="glass-btn btn-gradient" style="padding:8px 14px; font-size:12px; text-decoration:none;">Open & Complete Task ↗</a></div>';
      });
      feed.innerHTML = html;
    }

    async function loadRecentDomains() {
      const list = document.getElementById('recentDomainsList');
      const res = await fetch('/api/get-recent-links');
      const links = await res.json();
      if (!links.length) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">কোনো সক্রিয় ডোমেন নেই।</div>';
        return;
      }
      let html = '';
      links.forEach(l => {
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--card-border); border-radius:14px; margin-bottom:8px;"><span style="font-weight:600;">/' + l.slug + '</span><a href="/' + l.slug + '" target="_blank" style="color:#60A5FA; font-size:12px; text-decoration:none; font-weight:700;">Live Page ↗</a></div>';
      });
      list.innerHTML = html;
    }

    function openKeyPrompt() { document.getElementById('authDialog').style.display = 'flex'; }
    function closeKeyPrompt() { document.getElementById('authDialog').style.display = 'none'; }

    async function authorizeAdmin() {
      const pass = document.getElementById('adminSecret').value;
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pass })
      });
      const data = await res.json();
      if (data.success) {
        adminKey = pass;
        closeKeyPrompt();
        document.getElementById('adminLockedState').style.display = 'none';
        document.getElementById('adminUnlockedState').style.display = 'block';
        loadAdminDomains();
      } else {
        alert(data.error || "ভুল পাসওয়ার্ড!");
      }
    }

    async function saveProject() {
      const title = document.getElementById('pTitle').value;
      const description = document.getElementById('pDesc').value;
      const tag = document.getElementById('pTag').value;
      const htmlCode = document.getElementById('pHtml').value;
      if (!title || !htmlCode) return alert("টাইটেল ও HTML কোড দিন!");

      const res = await fetch('/api/admin/project/add', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pass: adminKey, title, description, tag, htmlCode })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ প্রজেক্ট সফলভাবে পাবলিশ হয়েছে!");
        document.getElementById('pTitle').value = '';
        document.getElementById('pDesc').value = '';
        document.getElementById('pHtml').value = '';
      }
    }

    async function saveTask() {
      const title = document.getElementById('tTitle').value;
      const description = document.getElementById('tDesc').value;
      const link = document.getElementById('tUrl').value;
      const badge = document.getElementById('tBadge').value;
      if (!title || !link) return alert("টাস্কের নাম ও লিংক দিন!");

      const res = await fetch('/api/admin/task/add', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pass: adminKey, title, description, link, badge })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ টাস্ক সফলভাবে পাবলিশ হয়েছে!");
        document.getElementById('tTitle').value = '';
        document.getElementById('tDesc').value = '';
        document.getElementById('tUrl').value = '';
      }
    }

    async function loadAdminDomains() {
      const list = document.getElementById('adminDomainsList');
      const res = await fetch('/api/admin/all-domains?pass=' + adminKey);
      const domains = await res.json();
      let html = '';
      domains.forEach(d => {
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--card-border); border-radius:14px; margin-bottom:8px;"><a href="/' + d.slug + '" target="_blank" style="color:#fff; text-decoration:none; font-weight:600;">/' + d.slug + '</a><button onclick="removeDomain(\\'' + d._id + '\\')" style="background:#EF4444; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer;">Delete</button></div>';
      });
      list.innerHTML = html;
    }

    async function removeDomain(id) {
      if (!confirm("আপনি কি নিশ্চিত এই ডোমেনটি ডিলিট করতে চান?")) return;
      await fetch('/api/admin/domain/' + id, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pass: adminKey })
      });
      loadAdminDomains();
    }
  </script>
</body>
</html>`);
});

// Serve Dynamic Slug HTML
app.get('/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug.toLowerCase() });
    if (!page) return res.status(404).send("<h1 style='font-family:sans-serif; text-align:center; padding:50px; background:#000; color:#fff;'>404 - Domain Not Found</h1>");
    res.set('Content-Type', 'text/html');
    res.send(page.htmlContent);
  } catch (err) {
    res.send("Error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('SJEMAR Engine Running on port ' + PORT));
