const express = require('express');
const https = require('https');
const os = require('os');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.json({ limit: '100mb' }));

const FIREBASE_DB_URL = "https://sifatby-38886-default-rtdb.firebaseio.com";
const ADMIN_PASS = "py.py.php";

// ------------------------------------------
// ১. ফায়ারবেস REST API হেল্পার
// ------------------------------------------
function firebaseFetch(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${FIREBASE_DB_URL}${cleanPath}.json`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// ------------------------------------------
// ২. ব্যাকএন্ড API ও অ্যাডমিন টাস্ক রাউটস
// ------------------------------------------

// অ্যাডমিন অথেন্টিকেশন
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASS) {
    const token = crypto.createHash('sha256').update(ADMIN_PASS + Date.now()).digest('hex');
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, message: 'Invalid Admin Password!' });
});

// সিস্টেম মেট্রিক্স
app.get('/api/system/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptime: Math.floor(process.uptime()),
    heapRam: (mem.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    totalRam: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
    cpuCores: os.cpus().length
  });
});

// টাস্ক তৈরি (Admin Task)
app.post('/api/admin/tasks/create', async (req, res) => {
  try {
    const { title, reward, description, type } = req.body;
    const taskId = 'task_' + Date.now();
    const taskData = { id: taskId, title, reward, description, type, createdAt: new Date().toISOString() };
    
    await firebaseFetch(`/tasks/${taskId}`, 'PUT', taskData);
    res.json({ success: true, task: taskData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// টাস্ক লিস্ট ফেচ
app.get('/api/tasks/list', async (req, res) => {
  try {
    const result = await firebaseFetch('/tasks', 'GET');
    const tasks = result.data ? Object.values(result.data) : [];
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// টাস্ক ডিলিট (Admin Task)
app.post('/api/admin/tasks/delete', async (req, res) => {
  try {
    const { taskId } = req.body;
    await firebaseFetch(`/tasks/${taskId}`, 'DELETE');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ইউজার টাস্ক সাবমিট
app.post('/api/user/task/submit', async (req, res) => {
  try {
    const { taskId, username, proof } = req.body;
    const submissionId = 'sub_' + Date.now();
    const data = { submissionId, taskId, username, proof, status: 'PENDING', time: new Date().toLocaleTimeString() };
    
    await firebaseFetch(`/submissions/${submissionId}`, 'PUT', data);
    res.json({ success: true, message: 'Submission sent for review' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ফায়ারবেস ব্যাকআপ এক্সপোর্ট
app.get('/api/admin/export', async (req, res) => {
  const result = await firebaseFetch('/', 'GET');
  res.setHeader('Content-disposition', 'attachment; filename=database_backup.json');
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(result.data, null, 2));
});

// ------------------------------------------
// ৩. ইউজার ইন্টারফেস (User App Page: '/')
// ------------------------------------------
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SJEMAR Cloud Client</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(14, 14, 18, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #2563EB;
      --accent-glow: rgba(37, 99, 235, 0.35);
      --text: #FFFFFF;
      --text-muted: #71717A;
      --text-sub: #A1A1AA;
      --success: #10B981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: #000000; color: var(--text); min-height: 100vh; padding-bottom: 90px; }

    /* Pure SVG Common Classes */
    .icon { width: 20px; height: 20px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; display: inline-block; vertical-align: middle; }
    .icon-sm { width: 16px; height: 16px; }

    /* Header */
    .header { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(25px); background: rgba(0, 0, 0, 0.9); border-bottom: 1px solid var(--card-border); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
    .brand-wrap { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, #2563EB, #7C3AED); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px var(--accent-glow); }
    .brand-logo svg { stroke: #fff; width: 18px; height: 18px; }
    .brand-title { font-size: 16px; font-weight: 800; letter-spacing: -0.3px; }

    /* 3-Line Hamburger Menu Button */
    .hamburger-btn { background: rgba(255,255,255,0.06); border: 1px solid var(--card-border); padding: 8px; border-radius: 10px; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; }

    /* Side Drawer Menu */
    .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); z-index: 90; display: none; }
    .drawer-backdrop.show { display: block; }
    .drawer { position: fixed; top: 0; right: -280px; width: 280px; height: 100%; background: #08080A; border-left: 1px solid var(--card-border); z-index: 100; transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1); padding: 24px 18px; display: flex; flex-direction: column; justify-content: space-between; }
    .drawer.open { right: 0; }
    .drawer-link { display: flex; align-items: center; gap: 12px; padding: 12px 14px; color: var(--text-sub); text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; margin-bottom: 8px; transition: 0.2s; }
    .drawer-link:hover, .drawer-link.active { background: rgba(255,255,255,0.06); color: #fff; }

    .container { max-width: 480px; margin: 0 auto; padding: 18px 14px; }
    
    /* Cards */
    .glass-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; padding: 18px; margin-bottom: 14px; box-shadow: 0 15px 35px rgba(0,0,0,0.9); }
    .card-head { font-size: 15px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }

    /* Form Elements */
    .glass-input, .glass-textarea { width: 100%; background: #050507; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px 14px; color: #FFFFFF; font-size: 13px; outline: none; margin-bottom: 10px; }
    .glass-input:focus, .glass-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }

    .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; gap: 8px; transition: 0.2s; }
    .btn-primary { background: var(--accent); color: #fff; box-shadow: 0 4px 15px var(--accent-glow); }
    .btn-primary:active { transform: scale(0.98); }

    /* Task Item Card */
    .task-card { background: #050508; border: 1px solid var(--card-border); border-radius: 16px; padding: 14px; margin-bottom: 10px; }
    .task-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .task-reward { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: var(--success); }

    /* Toast */
    #toast-box { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 120; pointer-events: none; }
    .toast { background: #121218; border: 1px solid var(--card-border); color: #fff; padding: 10px 18px; border-radius: 30px; font-size: 12px; font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.8); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
  </style>
</head>
<body>

  <div id="toast-box"></div>

  <!-- Side Drawer Menu -->
  <div class="drawer-backdrop" id="drawerBackdrop" onclick="toggleDrawer()"></div>
  <div class="drawer" id="drawerMenu">
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <span style="font-size:16px; font-weight:800;">Navigation</span>
        <button class="hamburger-btn" onclick="toggleDrawer()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <a href="/" class="drawer-link active">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        User Portal
      </a>
      <a href="/admin" class="drawer-link">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Admin Panel
      </a>
    </div>
    <div style="font-size:11px; color:var(--text-muted); text-align:center;">SJEMAR Engine v2.0</div>
  </div>

  <!-- Header with SVG Hamburger Button -->
  <header class="header">
    <div class="brand-wrap">
      <div class="brand-logo">
        <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      </div>
      <div>
        <div class="brand-title">SJEMAR Client</div>
      </div>
    </div>
    <!-- 3-Line Nav Button -->
    <button class="hamburger-btn" onclick="toggleDrawer()">
      <svg class="icon" viewBox="0 0 24 24">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
  </header>

  <div class="container">

    <!-- Active Tasks Stream -->
    <div class="glass-card">
      <div class="card-head">
        <div style="display:flex; align-items:center; gap:8px;">
          <svg class="icon" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span>Available Tasks</span>
        </div>
        <button class="btn" style="width:auto; padding:4px 10px; font-size:11px; background:rgba(255,255,255,0.06);" onclick="loadUserTasks()">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
      </div>
      <div id="tasks-container">
        <div style="text-align:center; font-size:12px; color:var(--text-muted); padding:16px;">Loading tasks...</div>
      </div>
    </div>

    <!-- Submit Task Proof -->
    <div class="glass-card">
      <div class="card-head">
        <div style="display:flex; align-items:center; gap:8px;">
          <svg class="icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>Submit Task Proof</span>
        </div>
      </div>
      <input type="text" id="sub-task-id" class="glass-input" placeholder="Task ID (e.g. task_1700...)">
      <input type="text" id="sub-username" class="glass-input" placeholder="Your Username">
      <textarea id="sub-proof" class="glass-textarea" placeholder="Enter proof / link / details..."></textarea>
      <button class="btn btn-primary" onclick="submitTaskProof()">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Submit Task
      </button>
    </div>

  </div>

  <script>
    function toggleDrawer() {
      document.getElementById('drawerBackdrop').classList.toggle('show');
      document.getElementById('drawerMenu').classList.toggle('open');
    }

    function showToast(text) {
      if (navigator.vibrate) navigator.vibrate([25]);
      const box = document.getElementById('toast-box');
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = text;
      box.appendChild(t);
      setTimeout(() => t.remove(), 2500);
    }

    async function loadUserTasks() {
      try {
        const res = await fetch('/api/tasks/list');
        const data = await res.json();
        const container = document.getElementById('tasks-container');
        if (!data.tasks || data.tasks.length === 0) {
          container.innerHTML = '<div style="text-align:center; font-size:12px; color:var(--text-muted); padding:16px;">No tasks available right now.</div>';
          return;
        }
        container.innerHTML = data.tasks.map(t => \`
          <div class="task-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="task-title">\${t.title}</div>
              <div class="task-reward">\${t.reward || 'Free'}</div>
            </div>
            <div style="font-size:11px; color:var(--text-sub); margin:4px 0;">\${t.description || ''}</div>
            <div style="font-size:10px; color:var(--text-muted); font-family:'JetBrains Mono',monospace;">ID: \${t.id}</div>
          </div>
        \`).join('');
      } catch (err) {
        showToast('Failed to load tasks');
      }
    }

    async function submitTaskProof() {
      const taskId = document.getElementById('sub-task-id').value;
      const username = document.getElementById('sub-username').value;
      const proof = document.getElementById('sub-proof').value;

      if (!taskId || !username || !proof) return showToast('Please fill all fields');

      const res = await fetch('/api/user/task/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, username, proof })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Task Submitted Successfully!');
        document.getElementById('sub-task-id').value = '';
        document.getElementById('sub-username').value = '';
        document.getElementById('sub-proof').value = '';
      }
    }

    loadUserTasks();
  </script>
</body>
</html>`);
});

// ------------------------------------------
// ৪. অ্যাডমিন ড্যাশবোর্ড (Admin HQ: '/admin')
// ------------------------------------------
app.get('/admin', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SJEMAR Admin HQ</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(14, 14, 18, 0.9);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #7C3AED;
      --accent-glow: rgba(124, 58, 237, 0.35);
      --text: #FFFFFF;
      --text-muted: #71717A;
      --text-sub: #A1A1AA;
      --danger: #EF4444;
      --success: #10B981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #000000; color: var(--text); min-height: 100vh; padding-bottom: 90px; }

    .icon { width: 18px; height: 18px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; display: inline-block; vertical-align: middle; }
    .icon-sm { width: 14px; height: 14px; }

    .header { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(25px); background: rgba(0, 0, 0, 0.9); border-bottom: 1px solid var(--card-border); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
    .brand-wrap { display: flex; align-items: center; gap: 10px; }
    .brand-logo { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, #7C3AED, #2563EB); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px var(--accent-glow); }
    .brand-logo svg { stroke: #fff; width: 18px; height: 18px; }

    .hamburger-btn { background: rgba(255,255,255,0.06); border: 1px solid var(--card-border); padding: 8px; border-radius: 10px; cursor: pointer; color: #fff; }

    .container { max-width: 500px; margin: 0 auto; padding: 18px 14px; }
    .glass-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; padding: 18px; margin-bottom: 14px; }
    .card-head { font-size: 15px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }

    .glass-input, .glass-textarea { width: 100%; background: #050507; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px 14px; color: #FFFFFF; font-size: 13px; outline: none; margin-bottom: 10px; }
    
    .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; gap: 8px; }
    .btn-accent { background: var(--accent); color: #fff; box-shadow: 0 4px 15px var(--accent-glow); }
    .btn-danger { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }

    /* Stats */
    .stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
    .stat-box { background: #060608; border: 1px solid var(--card-border); border-radius: 14px; padding: 12px; }
    .stat-num { font-size: 16px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #fff; margin-top: 4px; }

    /* Drawer */
    .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); z-index: 90; display: none; }
    .drawer-backdrop.show { display: block; }
    .drawer { position: fixed; top: 0; right: -280px; width: 280px; height: 100%; background: #08080A; border-left: 1px solid var(--card-border); z-index: 100; transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1); padding: 24px 18px; }
    .drawer.open { right: 0; }
    .drawer-link { display: flex; align-items: center; gap: 12px; padding: 12px 14px; color: var(--text-sub); text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; margin-bottom: 8px; }
    .drawer-link.active { background: rgba(255,255,255,0.06); color: #fff; }

    /* Auth lock screen */
    #auth-screen { position: fixed; inset: 0; background: #000; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  </style>
</head>
<body>

  <!-- Admin Login Auth Modal -->
  <div id="auth-screen">
    <div class="glass-card" style="width:100%; max-width:360px;">
      <div style="text-align:center; margin-bottom:18px;">
        <div class="brand-logo" style="margin:0 auto 12px;">
          <svg class="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div style="font-size:16px; font-weight:800;">Admin HQ Access</div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Enter Master Password</div>
      </div>
      <input type="password" id="admin-pass-input" class="glass-input" placeholder="Password (py.py.php)">
      <button class="btn btn-accent" onclick="authenticateAdmin()">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        Unlock Panel
      </button>
    </div>
  </div>

  <!-- Drawer Menu -->
  <div class="drawer-backdrop" id="adminBackdrop" onclick="toggleAdminDrawer()"></div>
  <div class="drawer" id="adminDrawer">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <span style="font-size:16px; font-weight:800;">Admin Navigation</span>
      <button class="hamburger-btn" onclick="toggleAdminDrawer()">
        <svg class="icon" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <a href="/" class="drawer-link">
      <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      User Portal
    </a>
    <a href="/admin" class="drawer-link active">
      <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Admin Panel
    </a>
    <a href="/api/admin/export" class="drawer-link" style="margin-top:20px; color:#60A5FA;">
      <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Export DB Backup
    </a>
  </div>

  <!-- Header -->
  <header class="header">
    <div class="brand-wrap">
      <div class="brand-logo">
        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      <div>
        <div class="brand-title">Admin Task Hub</div>
      </div>
    </div>
    <button class="hamburger-btn" onclick="toggleAdminDrawer()">
      <svg class="icon" viewBox="0 0 24 24">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
  </header>

  <div class="container">
    
    <!-- Live Server Metrics -->
    <div class="stat-row">
      <div class="stat-box">
        <div style="font-size:11px; color:var(--text-muted);">RAM Heap</div>
        <div class="stat-num" id="adm-ram">0 MB</div>
      </div>
      <div class="stat-box">
        <div style="font-size:11px; color:var(--text-muted);">Uptime</div>
        <div class="stat-num" id="adm-uptime">0s</div>
      </div>
    </div>

    <!-- Create New Task Form -->
    <div class="glass-card">
      <div class="card-head">
        <div style="display:flex; align-items:center; gap:8px;">
          <svg class="icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Create User Task</span>
        </div>
      </div>
      <input type="text" id="task-title" class="glass-input" placeholder="Task Title (e.g. Subscribe Channel)">
      <input type="text" id="task-reward" class="glass-input" placeholder="Reward / Points (e.g. 50 BDT / $0.50)">
      <textarea id="task-desc" class="glass-textarea" placeholder="Detailed instruction for users..."></textarea>
      <button class="btn btn-accent" onclick="publishAdminTask()">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        Publish Task to Database
      </button>
    </div>

    <!-- Active Tasks Manager -->
    <div class="glass-card">
      <div class="card-head">
        <span>Manage Published Tasks</span>
        <button class="btn" style="width:auto; padding:4px 8px; font-size:11px; background:rgba(255,255,255,0.06);" onclick="fetchAdminTasks()">Refresh</button>
      </div>
      <div id="admin-task-list">Loading tasks...</div>
    </div>

  </div>

  <script>
    function toggleAdminDrawer() {
      document.getElementById('adminBackdrop').classList.toggle('show');
      document.getElementById('adminDrawer').classList.toggle('open');
    }

    async function authenticateAdmin() {
      const password = document.getElementById('admin-pass-input').value;
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('auth-screen').style.display = 'none';
        initAdminMetrics();
        fetchAdminTasks();
      } else {
        alert('Wrong Password!');
      }
    }

    async function initAdminMetrics() {
      try {
        const res = await fetch('/api/system/metrics');
        const data = await res.json();
        document.getElementById('adm-ram').innerText = data.heapRam;
        document.getElementById('adm-uptime').innerText = data.uptime + 's';
      } catch (e) {}
      setTimeout(initAdminMetrics, 3000);
    }

    async function publishAdminTask() {
      const title = document.getElementById('task-title').value;
      const reward = document.getElementById('task-reward').value;
      const description = document.getElementById('task-desc').value;

      if (!title) return alert('Task Title is required');

      const res = await fetch('/api/admin/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, reward, description })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('task-title').value = '';
        document.getElementById('task-reward').value = '';
        document.getElementById('task-desc').value = '';
        fetchAdminTasks();
      }
    }

    async function deleteAdminTask(taskId) {
      if (!confirm('Are you sure you want to delete this task?')) return;
      await fetch('/api/admin/tasks/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      fetchAdminTasks();
    }

    async function fetchAdminTasks() {
      const res = await fetch('/api/tasks/list');
      const data = await res.json();
      const list = document.getElementById('admin-task-list');

      if (!data.tasks || data.tasks.length === 0) {
        list.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center;">No tasks found</div>';
        return;
      }

      list.innerHTML = data.tasks.map(t => \`
        <div style="background:#050508; border:1px solid var(--card-border); border-radius:12px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#fff;">\${t.title}</div>
            <div style="font-size:11px; color:#10B981;">\${t.reward || ''}</div>
          </div>
          <button class="btn btn-danger" style="width:auto; padding:6px 10px; font-size:11px;" onclick="deleteAdminTask('\${t.id}')">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      \`).join('');
    }
  </script>
</body>
</html>`);
});

// সার্ভার স্টার্ট
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`⚡ SJEMAR Engine Ready!`);
  console.log(`👤 User Portal: http://localhost:${PORT}/`);
  console.log(`🛠️ Admin Portal: http://localhost:${PORT}/admin`);
  console.log(`🔑 Admin Pass: ${ADMIN_PASS}`);
  console.log(`=========================================`);
});
