const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

const FIREBASE_DB_URL = "https://sifatby-38886-default-rtdb.firebaseio.com";
const ADMIN_PASS = "py.py.php";

// ১. মূল ইউজার পেজ (/)
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SJEMAR • Cloud Web Engine</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(18, 18, 24, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --accent: #2563EB;
      --accent-gradient: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%);
      --text: #FFFFFF;
      --text-dim: #9CA3AF;
      --nav-bg: rgba(12, 12, 16, 0.85);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; padding-bottom: 110px; position: relative; overflow-x: hidden; }

    .glow-1 { position: fixed; width: 300px; height: 300px; border-radius: 50%; filter: blur(100px); background: #1D4ED8; top: -60px; left: -60px; opacity: 0.25; pointer-events: none; }
    .glow-2 { position: fixed; width: 300px; height: 300px; border-radius: 50%; filter: blur(100px); background: #8B5CF6; bottom: 80px; right: -60px; opacity: 0.2; pointer-events: none; }

    .header { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); background: rgba(0,0,0,0.75); border-bottom: 1px solid var(--border); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .header .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header .badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px; background: rgba(59,130,246,0.15); color: #60A5FA; border: 1px solid rgba(59,130,246,0.3); }

    .container { max-width: 480px; margin: 0 auto; padding: 20px 16px; position: relative; z-index: 10; }
    .tab-section { display: none; }
    .tab-section.active { display: block; animation: slideUp 0.25s ease; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .glass-card { background: var(--card-bg); backdrop-filter: blur(35px); -webkit-backdrop-filter: blur(35px); border: 1px solid var(--border); border-radius: 22px; padding: 22px; margin-bottom: 18px; box-shadow: 0 15px 35px rgba(0,0,0,0.7); }
    .card-title { font-size: 17px; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .card-desc { font-size: 13px; color: var(--text-dim); margin-bottom: 18px; line-height: 1.4; }

    .form-label { font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; display: block; }
    .glass-input, .glass-textarea { width: 100%; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px 16px; color: #fff; font-size: 14px; outline: none; margin-bottom: 14px; transition: 0.2s; }
    .glass-input:focus, .glass-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.25); background: rgba(0,0,0,0.9); }
    .glass-textarea { font-family: ui-monospace, Menlo, monospace; resize: vertical; }

    .glass-btn { width: 100%; padding: 14px; border-radius: 14px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; }
    .btn-gradient { background: var(--accent-gradient); color: #fff; box-shadow: 0 8px 25px rgba(37,99,235,0.35); }
    .btn-gradient:active { transform: scale(0.98); opacity: 0.9; }
    .btn-secondary { background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: #fff; }

    .list-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 12px; }

    .nav-bar { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); max-width: 420px; background: var(--nav-bg); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 30px; padding: 8px 10px; display: flex; justify-content: space-around; align-items: center; z-index: 50; box-shadow: 0 20px 45px rgba(0,0,0,0.9); }
    .nav-link { background: transparent; border: none; color: var(--text-dim); display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; cursor: pointer; padding: 6px 14px; border-radius: 20px; transition: 0.2s; text-decoration: none; }
    .nav-link svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .nav-link.active { color: #60A5FA; background: rgba(59,130,246,0.15); }
    .nav-link.active svg { stroke: #60A5FA; }

    /* Loading Overlay */
    .loader-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(25px); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 100; }
    .spinner { width: 48px; height: 48px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3B82F6; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 18px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loader-status { font-size: 13px; font-weight: 600; color: #93C5FD; text-align: center; }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>

  <!-- Loading Animation Overlay -->
  <div id="loaderModal" class="loader-overlay">
    <div class="spinner"></div>
    <div id="loadingStatusText" class="loader-status">Parsing HTML Structure...</div>
  </div>

  <header class="header">
    <div class="brand">SJEMAR</div>
    <div class="badge">CLOUD v3</div>
  </header>

  <main class="container">
    <!-- HOST TAB -->
    <section id="tab-host" class="tab-section active">
      <div class="glass-card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Custom Domain Builder
        </div>
        <div class="card-desc">আপনার নিজস্ব Slug ও HTML দিয়ে লাইভ ডোমেন তৈরি করুন।</div>

        <label class="form-label">Custom Slug (নাম)</label>
        <input type="text" id="domainSlug" class="glass-input" placeholder="যেমন: domain, portfolio, bio">

        <label class="form-label">HTML / CSS / JS কোড</label>
        <textarea id="domainHtml" class="glass-textarea" rows="7" placeholder="<!DOCTYPE html> ... Paste your code here"></textarea>

        <button class="glass-btn btn-gradient" onclick="handleDeploy()">
          Deploy Domain Now
        </button>

        <div id="resultBox" style="display:none; margin-top:16px; padding:16px; background:rgba(37,99,235,0.15); border:1px solid rgba(37,99,235,0.3); border-radius:16px; text-align:center;">
          <div style="font-size:12px; color:#93C5FD; margin-bottom:8px; font-weight:700;">DEPLOYED URL READY:</div>
          <a id="resultUrl" href="" target="_blank" style="color:#fff; font-weight:700; word-break:break-all; font-size:14px; text-decoration:underline;"></a>
        </div>
      </div>
    </section>

    <!-- CODES TAB -->
    <section id="tab-codes" class="tab-section">
      <div class="glass-card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          Official Projects
        </div>
        <div class="card-desc">এডমিনের দেওয়া রেডিমেড সোর্স কোড ও টেমপ্লেট:</div>
        <div id="projectsList"><div style="text-align:center; color:var(--text-dim); padding:20px;">লোড হচ্ছে...</div></div>
      </div>
    </section>

    <!-- TASKS TAB -->
    <section id="tab-tasks" class="tab-section">
      <div class="glass-card">
        <div class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Official Tasks
        </div>
        <div class="card-desc">নিচের টাস্কগুলো সম্পন্ন করে সক্রিয় থাকুন:</div>
        <div id="tasksList"><div style="text-align:center; color:var(--text-dim); padding:20px;">লোড হচ্ছে...</div></div>
      </div>
    </section>
  </main>

  <!-- Bottom Navigation -->
  <nav class="nav-bar">
    <button class="nav-link active" onclick="switchNav('host', this)">
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      Host
    </button>
    <button class="nav-link" onclick="switchNav('codes', this)">
      <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      Codes
    </button>
    <button class="nav-link" onclick="switchNav('tasks', this)">
      <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      Tasks
    </button>
    <a href="/admin" class="nav-link">
      <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Admin
    </a>
  </nav>

  <script>
    const firebaseConfig = {
      apiKey: "AIzaSyBTNUdaOHUrdFluaJAt2RQi6kZ5SjhVS8s",
      authDomain: "sifatby-38886.firebaseapp.com",
      databaseURL: "https://sifatby-38886-default-rtdb.firebaseio.com",
      projectId: "sifatby-38886",
      storageBucket: "sifatby-38886.firebasestorage.app",
      messagingSenderId: "571558461802",
      appId: "1:571558461802:web:34dc103c19aa3ed4b5a513",
      measurementId: "G-BJ04Q1WZ8Y"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    function switchNav(tab, el) {
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      el.classList.add('active');

      if (tab === 'codes') loadProjects();
      if (tab === 'tasks') loadTasks();
    }

    async function handleDeploy() {
      const slugInput = document.getElementById('domainSlug').value.trim();
      const htmlContent = document.getElementById('domainHtml').value;
      if (!slugInput || !htmlContent) return alert("ডোমেন নাম ও HTML কোড দিন!");

      const cleanSlug = slugInput.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
      const loader = document.getElementById('loaderModal');
      const statusText = document.getElementById('loadingStatusText');
      
      loader.style.display = 'flex';
      statusText.innerText = "1/3: Analyzing Code & Assets...";

      await new Promise(r => setTimeout(r, 600));
      statusText.innerText = "2/3: Uploading to Firebase Cloud Engine...";
      
      await db.ref('pages/' + cleanSlug).set({
        slug: cleanSlug,
        htmlContent: htmlContent,
        createdAt: Date.now()
      });

      await new Promise(r => setTimeout(r, 700));
      statusText.innerText = "3/3: Securing Cloud Domain & SSL...";

      await new Promise(r => setTimeout(r, 500));
      loader.style.display = 'none';

      // SJEMAR Prefix Link
      const fullUrl = window.location.origin + '/sjemar/' + cleanSlug;
      document.getElementById('resultBox').style.display = 'block';
      const linkElem = document.getElementById('resultUrl');
      linkElem.href = fullUrl;
      linkElem.innerText = fullUrl;
    }

    function loadProjects() {
      const list = document.getElementById('projectsList');
      db.ref('projects').on('value', snap => {
        const data = snap.val();
        if (!data) {
          list.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">কোনো প্রজেক্ট পাওয়া যায়নি।</div>';
          return;
        }
        let html = '';
        Object.keys(data).forEach(k => {
          const p = data[k];
          html += '<div class="list-card"><div style="display:flex; justify-content:space-between; margin-bottom:6px;"><b style="font-size:15px;">' + p.title + '</b><span style="font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px; background:rgba(139,92,246,0.2); color:#C4B5FD;">' + p.tag + '</span></div><p style="font-size:12px; color:var(--text-dim); margin-bottom:12px;">' + p.description + '</p><button onclick="copyCode(\\'' + encodeURIComponent(p.htmlCode) + '\\')" class="glass-btn btn-secondary" style="padding:8px 14px; font-size:12px;">Copy Source Code</button></div>';
        });
        list.innerHTML = html;
      });
    }

    function copyCode(encoded) {
      navigator.clipboard.writeText(decodeURIComponent(encoded));
      alert("✅ সোর্স কোড কপি করা হয়েছে!");
    }

    function loadTasks() {
      const list = document.getElementById('tasksList');
      db.ref('tasks').on('value', snap => {
        const data = snap.val();
        if (!data) {
          list.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px;">কোনো সক্রিয় টাস্ক নেই।</div>';
          return;
        }
        let html = '';
        Object.keys(data).forEach(k => {
          const t = data[k];
          html += '<div class="list-card"><div style="display:flex; justify-content:space-between; margin-bottom:6px;"><b style="font-size:14px;">' + t.title + '</b><span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; background:rgba(16,185,129,0.2); color:#6EE7B7;">' + t.badge + '</span></div><p style="font-size:12px; color:var(--text-dim); margin-bottom:12px;">' + t.description + '</p><a href="' + t.link + '" target="_blank" class="glass-btn btn-gradient" style="padding:8px 14px; font-size:12px; text-decoration:none;">Open Task ↗</a></div>';
        });
        list.innerHTML = html;
      });
    }
  </script>
</body>
</html>`);
});

// ২. আলাদা এডমিন পেজ (/admin)
app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SJEMAR • Admin Master Console</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(18, 18, 24, 0.75);
      --border: rgba(255, 255, 255, 0.1);
      --accent-gradient: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%);
      --text: #FFFFFF;
      --text-dim: #9CA3AF;
      --danger: #EF4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; padding: 20px 16px 80px; }

    .card { background: var(--card-bg); backdrop-filter: blur(35px); border: 1px solid var(--border); border-radius: 22px; padding: 22px; margin-bottom: 18px; box-shadow: 0 15px 35px rgba(0,0,0,0.7); max-width: 480px; margin-left: auto; margin-right: auto; }
    .card-title { font-size: 17px; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .card-desc { font-size: 13px; color: var(--text-dim); margin-bottom: 18px; }

    label { font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 6px; display: block; }
    input, textarea { width: 100%; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px; color: #fff; font-size: 14px; outline: none; margin-bottom: 14px; }
    input:focus, textarea:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }

    .btn { width: 100%; padding: 14px; border-radius: 14px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-grad { background: var(--accent-gradient); color: #fff; box-shadow: 0 8px 25px rgba(59,130,246,0.35); }
    .btn-sec { background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: #fff; }

    /* Master Lock Screen */
    .lock-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000000; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .lock-card { background: #0B0B0E; border: 1px solid var(--border); border-radius: 24px; padding: 30px 24px; width: 100%; max-width: 340px; text-align: center; }
  </style>
</head>
<body>

  <!-- Password Prompt Gate -->
  <div id="lockGate" class="lock-screen">
    <div class="lock-card">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" style="margin-bottom:12px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <div style="font-size:18px; font-weight:800; margin-bottom:4px;">Master Access Gate</div>
      <div style="font-size:12px; color:var(--text-dim); margin-bottom:18px;">এডমিন পাসওয়ার্ড ছাড়া পেজে ঢোকা নিষেধ</div>
      <input type="password" id="passCode" placeholder="••••••••">
      <button class="btn btn-grad" onclick="unlockAdmin()">Unlock Console</button>
      <a href="/" style="display:block; margin-top:14px; font-size:12px; color:var(--text-dim); text-decoration:none;">ইউজার পেজে ফিরে যান ↗</a>
    </div>
  </div>

  <!-- Admin Panel Dashboard -->
  <div id="adminPanel" style="display:none; max-width:480px; margin:auto;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2 style="font-size:20px; font-weight:800; background:var(--accent-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">SJEMAR ADMIN</h2>
      <a href="/" style="color:#60A5FA; font-size:12px; text-decoration:none; font-weight:700;">Visit Site ↗</a>
    </div>

    <!-- Upload HTML Project -->
    <div class="card">
      <div class="card-title">Upload Project / HTML Code</div>
      <div class="card-desc">ইউজারদের জন্য সোর্স কোড পাবলিশ করুন:</div>

      <label>Project Title</label>
      <input type="text" id="pTitle" placeholder="যেমন: Temp Mail Bot Script">

      <label>Description</label>
      <input type="text" id="pDesc" placeholder="প্রজেক্ট সম্পর্কে বিবরণ...">

      <label>Badge Tag</label>
      <input type="text" id="pTag" placeholder="PRO, HOT, FREE">

      <label>Raw HTML / Source Code</label>
      <textarea id="pHtml" rows="5" placeholder="<!DOCTYPE html> ..."></textarea>

      <button class="btn btn-grad" onclick="addProject()">Publish Project</button>
    </div>

    <!-- Add Task -->
    <div class="card">
      <div class="card-title">Add Official Task</div>
      <div class="card-desc">টেলিগ্রাম/ইউটিউব লিংক পাবলিশ করুন:</div>

      <label>Task Title</label>
      <input type="text" id="tTitle" placeholder="Join Telegram Channel">

      <label>Description</label>
      <input type="text" id="tDesc" placeholder="চ্যানেলে যুক্ত হয়ে আপডেট নিন">

      <label>Target URL</label>
      <input type="text" id="tUrl" placeholder="https://t.me/...">

      <label>Badge</label>
      <input type="text" id="tBadge" placeholder="MANDATORY">

      <button class="btn btn-grad" onclick="addTask()">Publish Task</button>
    </div>

    <!-- Manage Domains -->
    <div class="card">
      <div class="card-title">Manage Live Domains</div>
      <div class="card-desc">Firebase-এ সেভ থাকা ডোমেনগুলো ডিলিট করুন:</div>
      <div id="domainsList"></div>
    </div>
  </div>

  <script>
    const firebaseConfig = {
      apiKey: "AIzaSyBTNUdaOHUrdFluaJAt2RQi6kZ5SjhVS8s",
      authDomain: "sifatby-38886.firebaseapp.com",
      databaseURL: "https://sifatby-38886-default-rtdb.firebaseio.com",
      projectId: "sifatby-38886",
      storageBucket: "sifatby-38886.firebasestorage.app",
      messagingSenderId: "571558461802",
      appId: "1:571558461802:web:34dc103c19aa3ed4b5a513",
      measurementId: "G-BJ04Q1WZ8Y"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    function unlockAdmin() {
      const pass = document.getElementById('passCode').value;
      if (pass === "${ADMIN_PASS}") {
        document.getElementById('lockGate').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadAdminDomains();
      } else {
        alert("ভুল পাসওয়ার্ড! প্রবেশ নিষেধ।");
      }
    }

    function addProject() {
      const title = document.getElementById('pTitle').value;
      const description = document.getElementById('pDesc').value;
      const tag = document.getElementById('pTag').value || 'FEATURED';
      const htmlCode = document.getElementById('pHtml').value;

      if (!title || !htmlCode) return alert("টাইটেল ও কোড দিন!");

      db.ref('projects').push({
        title, description, tag, htmlCode, createdAt: Date.now()
      }, err => {
        if (!err) {
          alert("✅ প্রজেক্ট সফলভাবে পাবলিশ হয়েছে!");
          document.getElementById('pTitle').value = '';
          document.getElementById('pDesc').value = '';
          document.getElementById('pHtml').value = '';
        }
      });
    }

    function addTask() {
      const title = document.getElementById('tTitle').value;
      const description = document.getElementById('tDesc').value;
      const link = document.getElementById('tUrl').value;
      const badge = document.getElementById('tBadge').value || 'TASK';

      if (!title || !link) return alert("টাস্কের নাম ও লিংক দিন!");

      db.ref('tasks').push({
        title, description, link, badge, createdAt: Date.now()
      }, err => {
        if (!err) {
          alert("✅ টাস্ক সফলভাবে পাবলিশ হয়েছে!");
          document.getElementById('tTitle').value = '';
          document.getElementById('tDesc').value = '';
          document.getElementById('tUrl').value = '';
        }
      });
    }

    function loadAdminDomains() {
      const list = document.getElementById('domainsList');
      db.ref('pages').on('value', snap => {
        const data = snap.val();
        if (!data) {
          list.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:15px;">কোনো ডোমেন নেই।</div>';
          return;
        }
        let html = '';
        Object.keys(data).forEach(k => {
          const item = data[k];
          html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; margin-bottom:8px;"><a href="/sjemar/' + item.slug + '" target="_blank" style="color:#fff; text-decoration:none; font-weight:700;">/sjemar/' + item.slug + '</a><button onclick="deleteDomain(\\'' + item.slug + '\\')" style="background:#EF4444; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer;">Delete</button></div>';
        });
        list.innerHTML = html;
      });
    }

    function deleteDomain(slug) {
      if (!confirm("আপনি কি নিশ্চিত এই ডোমেনটি ডিলিট করতে চান?")) return;
      db.ref('pages/' + slug).remove();
    }
  </script>
</body>
</html>`);
});

// ৩. ডাইনামিক পেজ রেন্ডার (যেমন: /sjemar/:slug)
app.get('/sjemar/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const response = await fetch(`${FIREBASE_DB_URL}/pages/${slug}.json`);
    const pageData = await response.json();

    if (!pageData || !pageData.htmlContent) {
      return res.status(404).send("<h1 style='font-family:sans-serif; text-align:center; padding:60px; background:#000; color:#fff;'>404 - Domain Not Found</h1>");
    }

    res.set('Content-Type', 'text/html');
    res.send(pageData.htmlContent);
  } catch (err) {
    res.status(500).send("Error rendering domain: " + err.message);
  }
});

// ব্যাকওয়ার্ড কম্প্যাটিবিলিটি (/slug লিংকও কাজ করবে)
app.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    if (slug === 'admin') return;
    const response = await fetch(`${FIREBASE_DB_URL}/pages/${slug}.json`);
    const pageData = await response.json();

    if (!pageData || !pageData.htmlContent) {
      return res.status(404).send("<h1 style='font-family:sans-serif; text-align:center; padding:60px; background:#000; color:#fff;'>404 - Domain Not Found</h1>");
    }

    res.set('Content-Type', 'text/html');
    res.send(pageData.htmlContent);
  } catch (err) {
    res.status(500).send("Error rendering domain: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('SJEMAR Firebase Engine running on ' + PORT));
