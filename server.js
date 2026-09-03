const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(bodyParser.json({ limit: '100mb' }));

const FIREBASE_DB_URL = "https://sifatby-38886-default-rtdb.firebaseio.com";
const ADMIN_PASS = "py.py.php";

// ==========================================
// ১. মূল ইউজার অ্যাপ্লিকেশন (iOS OLED UI)
// ==========================================
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>SJEMAR • Cloud Web Engine</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(18, 18, 22, 0.72);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #3B82F6;
      --accent-gradient: linear-gradient(135deg, #60A5FA 0%, #A855F7 50%, #EC4899 100%);
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --border-subtle: rgba(255, 255, 255, 0.05);
      --danger: #EF4444;
      --success: #10B981;
      --warning: #F59E0B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: #000000; color: var(--text); min-height: 100vh; padding-bottom: 120px; overflow-x: hidden; position: relative; }

    /* OLED Background Glows */
    .glow-top { position: fixed; top: -120px; left: 50%; transform: translateX(-50%); width: 340px; height: 340px; border-radius: 50%; background: radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(0,0,0,0) 70%); filter: blur(70px); pointer-events: none; z-index: 0; }
    .glow-bottom { position: fixed; bottom: -80px; right: -50px; width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0) 70%); filter: blur(80px); pointer-events: none; z-index: 0; }

    /* Header */
    .header { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); background: rgba(0, 0, 0, 0.75); border-bottom: 1px solid var(--card-border); padding: 16px 22px; display: flex; justify-content: space-between; align-items: center; }
    .brand-box { display: flex; align-items: center; gap: 10px; }
    .brand-icon { width: 32px; height: 32px; border-radius: 10px; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff; font-size: 16px; box-shadow: 0 4px 15px rgba(59,130,246,0.4); }
    .brand-text { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .status-badge { font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 20px; background: rgba(59,130,246,0.12); color: #60A5FA; border: 1px solid rgba(59,130,246,0.3); display: flex; align-items: center; gap: 6px; }
    .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: #3B82F6; box-shadow: 0 0 10px #3B82F6; animation: pulse 1.8s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }

    .container { max-width: 500px; margin: 0 auto; padding: 20px 16px; position: relative; z-index: 10; }
    .tab-view { display: none; }
    .tab-view.active { display: block; animation: appleFade 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes appleFade { from { opacity: 0; transform: translateY(10px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }

    /* iOS Glass Cards */
    .glass-card { background: var(--card-bg); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border: 1px solid var(--card-border); border-radius: 24px; padding: 22px; margin-bottom: 18px; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
    .card-title { font-size: 17px; font-weight: 800; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; letter-spacing: -0.3px; }
    .card-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 18px; line-height: 1.5; }

    /* Inputs & Forms */
    .form-group { margin-bottom: 14px; }
    .form-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; display: block; }
    .glass-input, .glass-textarea, .glass-select { width: 100%; background: rgba(10, 10, 14, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 14px 16px; color: #fff; font-size: 14px; outline: none; transition: 0.2s; }
    .glass-input:focus, .glass-textarea:focus, .glass-select:focus { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(59,130,246,0.18); background: #0A0A0F; }
    .glass-textarea { font-family: 'JetBrains Mono', monospace; font-size: 13px; resize: vertical; }

    /* Switches */
    .toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid var(--border-subtle); margin-bottom: 12px; }
    .toggle-title { font-size: 13px; font-weight: 600; }
    .toggle-desc { font-size: 11px; color: var(--text-muted); }
    .ios-switch { position: relative; display: inline-block; width: 46px; height: 26px; }
    .ios-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.15); transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 30px; }
    .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }
    input:checked + .slider { background: #3B82F6; }
    input:checked + .slider:before { transform: translateX(20px); }

    /* Buttons */
    .glass-btn { width: 100%; padding: 15px; border-radius: 16px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s cubic-bezier(0.16, 1, 0.3, 1); text-decoration: none; }
    .btn-gradient { background: var(--accent-gradient); color: #fff; box-shadow: 0 8px 25px rgba(59,130,246,0.3); }
    .btn-gradient:active { transform: scale(0.97); filter: brightness(0.9); }
    .btn-secondary { background: rgba(255,255,255,0.07); border: 1px solid var(--card-border); color: #fff; }
    .btn-secondary:active { transform: scale(0.98); background: rgba(255,255,255,0.12); }

    /* My Links Card Items */
    .link-item-card { background: rgba(20, 20, 26, 0.85); border: 1px solid var(--card-border); border-radius: 20px; padding: 16px; margin-bottom: 14px; position: relative; backdrop-filter: blur(25px); }
    .link-item-card.pinned { border: 1px solid rgba(245, 158, 11, 0.4); background: rgba(30, 26, 16, 0.6); }
    .pin-tag { position: absolute; top: 12px; right: 12px; font-size: 10px; font-weight: 800; color: #FBBF24; background: rgba(245, 158, 11, 0.15); padding: 2px 8px; border-radius: 8px; }

    /* Bottom Navigation Bar */
    .nav-bar { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); max-width: 440px; background: rgba(14, 14, 18, 0.85); backdrop-filter: blur(45px); -webkit-backdrop-filter: blur(45px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 35px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; z-index: 90; box-shadow: 0 25px 50px rgba(0,0,0,0.9); }
    .nav-link { background: transparent; border: none; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; cursor: pointer; padding: 7px 14px; border-radius: 22px; transition: 0.2s; }
    .nav-link svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; }
    .nav-link.active { color: #60A5FA; background: rgba(59,130,246,0.15); }
    .nav-link.active svg { stroke: #60A5FA; }

    /* Popup Notice */
    .announcement-popup { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(30px); z-index: 200; display: none; align-items: center; justify-content: center; padding: 20px; }
    .popup-box { background: #0F0F14; border: 1px solid var(--card-border); border-radius: 26px; padding: 26px; max-width: 360px; width: 100%; text-align: center; box-shadow: 0 30px 60px rgba(0,0,0,0.9); }

    /* Loader Modal */
    .loader-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(30px); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 300; }
    .spinner { width: 44px; height: 44px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3B82F6; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="glow-top"></div>
  <div class="glow-bottom"></div>

  <!-- Global Announcement Popup -->
  <div id="noticeModal" class="announcement-popup">
    <div class="popup-box">
      <div style="font-size: 36px; margin-bottom: 10px;">📢</div>
      <h3 id="popupTitle" style="font-size: 18px; font-weight: 800; margin-bottom: 8px;">Notice</h3>
      <p id="popupDesc" style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;"></p>
      <button class="glass-btn btn-gradient" onclick="closeNotice()">ঠিক আছে</button>
    </div>
  </div>

  <!-- Loading Screen -->
  <div id="loaderModal" class="loader-overlay">
    <div class="spinner"></div>
    <div id="loadingStatusText" style="font-size: 13px; font-weight: 600; color: #93C5FD;">Processing Cloud Request...</div>
  </div>

  <header class="header">
    <div class="brand-box">
      <div class="brand-icon">S</div>
      <span class="brand-text">SJEMAR</span>
    </div>
    <div class="status-badge">
      <div class="pulse-dot"></div>
      <span id="headerEngineStatus">ENGINE V4 PRO</span>
    </div>
  </header>

  <main class="container">
    <!-- TAB 1: HOST BUILDER -->
    <section id="tab-host" class="tab-view active">
      <div class="glass-card">
        <div class="card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Deploy Custom Web Page
        </div>
        <div class="card-desc">আপনার নিজস্ব Slug, HTML ও প্রিমিয়াম কনফিগারেশন দিয়ে লাইভ করুন।</div>

        <div class="form-group">
          <label class="form-label">Custom Slug (ডোমেইন নাম)</label>
          <input type="text" id="domainSlug" class="glass-input" placeholder="যেমন: vip-offer, my-portfolio">
        </div>

        <div class="form-group">
          <label class="form-label">Bio / Page Note (ছোট বিবরণ)</label>
          <input type="text" id="domainBio" class="glass-input" placeholder="যেমন: This is my official event page">
        </div>

        <div class="form-group">
          <label class="form-label">Thumbnail / Preview Image URL (ঐচ্ছিক)</label>
          <input type="url" id="domainPhoto" class="glass-input" placeholder="https://i.ibb.co/banner.jpg">
        </div>

        <div class="form-group">
          <label class="form-label">Expiration Days (কত দিন সক্রিয় থাকবে)</label>
          <select id="domainExpiry" class="glass-select">
            <option value="365">Lifetime / 365 Days</option>
            <option value="30">30 Days</option>
            <option value="7">7 Days</option>
            <option value="3">3 Days</option>
            <option value="1">24 Hours</option>
          </select>
        </div>

        <!-- Switches -->
        <div class="toggle-row">
          <div>
            <div class="toggle-title">Show HTML Source to Visitor</div>
            <div class="toggle-desc">ভিজিটররা পেজে কোড কপি করার উইজেট দেখতে পাবে</div>
          </div>
          <label class="ios-switch">
            <input type="checkbox" id="domainShowSource" checked>
            <span class="slider"></span>
          </label>
        </div>

        <div class="toggle-row">
          <div>
            <div class="toggle-title">Make Link Public</div>
            <div class="toggle-desc">সরাসরি সবার জন্য উন্মুক্ত থাকবে</div>
          </div>
          <label class="ios-switch">
            <input type="checkbox" id="domainIsPublic" checked>
            <span class="slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">HTML / CSS / JS Source Code</label>
          <textarea id="domainHtml" class="glass-textarea" rows="8" placeholder="<!DOCTYPE html>&#10;<html>&#10;  <body>&#10;    <h1>Hello SJEMAR</h1>&#10;  </body>&#10;</html>"></textarea>
        </div>

        <button class="glass-btn btn-gradient" onclick="handleDeploy()">
          🚀 Deploy Link Now
        </button>

        <div id="resultBox" style="display:none; margin-top:16px; padding:16px; background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.3); border-radius:18px; text-align:center;">
          <div style="font-size:11px; color:#93C5FD; margin-bottom:6px; font-weight:800; text-transform:uppercase;">Domain Created Successfully!</div>
          <a id="resultUrl" href="" target="_blank" style="color:#fff; font-weight:700; word-break:break-all; font-size:14px; text-decoration:underline;"></a>
        </div>
      </div>
    </section>

    <!-- TAB 2: MY LINKS (USER DASHBOARD) -->
    <section id="tab-mylinks" class="tab-view">
      <div class="glass-card">
        <div class="card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          My Created Links
        </div>
        <div class="card-desc">আপনার ডিভাইসে সংরক্ষিত সকল লিংক, এডিট, পিন ও লাইভ ভিউ স্ট্যাটাস:</div>
        <div id="myLinksContainer">
          <div style="text-align:center; color:var(--text-muted); padding:30px 10px; font-size:13px;">কোনো তৈরি করা লিংক পাওয়া যায়নি।</div>
        </div>
      </div>
    </section>

    <!-- TAB 3: OFFICIAL CODES / TEMPLATES -->
    <section id="tab-codes" class="tab-view">
      <div class="glass-card">
        <div class="card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A855F7" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          Ready Codes & Templates
        </div>
        <div class="card-desc">এডমিনের দেওয়া অফিসিয়াল কোডগুলো ১-ক্লিকে কপি ও ব্যবহার করুন:</div>
        <div id="projectsListContainer"><div style="text-align:center; color:var(--text-muted); padding:25px;">লোড হচ্ছে...</div></div>
      </div>
    </section>

    <!-- TAB 4: TASKS & REWARDS -->
    <section id="tab-tasks" class="tab-view">
      <div class="glass-card">
        <div class="card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Official Tasks
        </div>
        <div class="card-desc">নিচের টাস্কগুলো ভিজিট করুন ও আকর্ষণীয় সোর্স কোড আনলক করুন:</div>
        <div id="tasksListContainer"><div style="text-align:center; color:var(--text-muted); padding:25px;">লোড হচ্ছে...</div></div>
      </div>
    </section>
  </main>

  <!-- Bottom Navigation -->
  <nav class="nav-bar">
    <button class="nav-link active" onclick="switchTab('host', this)">
      <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      Host
    </button>
    <button class="nav-link" onclick="switchTab('mylinks', this)">
      <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      My Links
    </button>
    <button class="nav-link" onclick="switchTab('codes', this)">
      <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      Codes
    </button>
    <button class="nav-link" onclick="switchTab('tasks', this)">
      <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      Tasks
    </button>
    <!-- Secret disguised router / admin entrance -->
    <a href="/roter" class="nav-link" title="Router Gate">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      #roter#
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

    // Local Storage tracking for My Links
    let myLocalSlugs = JSON.parse(localStorage.getItem('sjemar_my_slugs') || '[]');

    function switchTab(tab, btn) {
      document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      if (btn) btn.classList.add('active');

      if (tab === 'mylinks') renderMyLinks();
      if (tab === 'codes') loadCodes();
      if (tab === 'tasks') loadTasks();
    }

    // App Configuration Listener (Notice & Maintenance)
    db.ref('app_config').on('value', snap => {
      const config = snap.val();
      if (config) {
        if (config.popupActive && config.popupTitle) {
          document.getElementById('popupTitle').innerText = config.popupTitle;
          document.getElementById('popupDesc').innerText = config.popupDesc || '';
          document.getElementById('noticeModal').style.display = 'flex';
        }
      }
    });

    function closeNotice() {
      document.getElementById('noticeModal').style.display = 'none';
    }

    // Deploy Link
    async function handleDeploy() {
      const slugInput = document.getElementById('domainSlug').value.trim();
      const bio = document.getElementById('domainBio').value.trim();
      const photo = document.getElementById('domainPhoto').value.trim();
      const expiryDays = parseInt(document.getElementById('domainExpiry').value) || 365;
      const showSource = document.getElementById('domainShowSource').checked;
      const isPublic = document.getElementById('domainIsPublic').checked;
      const htmlContent = document.getElementById('domainHtml').value;

      if (!slugInput || !htmlContent) return alert("দয়া করে Slug এবং HTML কোড দিন!");

      const cleanSlug = slugInput.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
      const loader = document.getElementById('loaderModal');
      const statusText = document.getElementById('loadingStatusText');

      loader.style.display = 'flex';
      statusText.innerText = "1/3: Analyzing iOS OLED Engine...";

      await new Promise(r => setTimeout(r, 400));
      statusText.innerText = "2/3: Deploying to Cloud Database...";

      const expiresAt = Date.now() + (expiryDays * 24 * 60 * 60 * 1000);

      const domainData = {
        slug: cleanSlug,
        bio: bio || 'No description provided.',
        photo: photo || '',
        expiresAt: expiresAt,
        showSource: showSource,
        isPublic: isPublic,
        isPinned: false,
        htmlContent: htmlContent,
        views: 0,
        createdAt: Date.now()
      };

      await db.ref('pages/' + cleanSlug).set(domainData);

      // Save locally
      if (!myLocalSlugs.includes(cleanSlug)) {
        myLocalSlugs.push(cleanSlug);
        localStorage.setItem('sjemar_my_slugs', JSON.stringify(myLocalSlugs));
      }

      await new Promise(r => setTimeout(r, 400));
      statusText.innerText = "3/3: Securing Domain & Generating URL...";
      await new Promise(r => setTimeout(r, 300));
      loader.style.display = 'none';

      const fullUrl = window.location.origin + '/sjemar/' + cleanSlug;
      document.getElementById('resultBox').style.display = 'block';
      const linkElem = document.getElementById('resultUrl');
      linkElem.href = fullUrl;
      linkElem.innerText = fullUrl;
    }

    // Render User Created Links (My Links)
    async function renderMyLinks() {
      const container = document.getElementById('myLinksContainer');
      if (myLocalSlugs.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:30px 10px; font-size:13px;">আপনি এখনো কোনো লিংক তৈরি করেননি।</div>';
        return;
      }

      container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">ডাটা লোড হচ্ছে...</div>';
      
      const promises = myLocalSlugs.map(slug => db.ref('pages/' + slug).once('value'));
      const snapshots = await Promise.all(promises);

      let links = [];
      snapshots.forEach(snap => {
        if (snap.exists()) {
          links.push(snap.val());
        }
      });

      if (links.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:30px 10px; font-size:13px;">কোনো সক্রিয় লিংক নেই।</div>';
        return;
      }

      // Sort: Pinned first, then newest
      links.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

      let html = '';
      links.forEach(item => {
        const fullUrl = window.location.origin + '/sjemar/' + item.slug;
        const daysLeft = Math.max(0, Math.ceil((item.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));

        html += \`
          <div class="link-item-card \${item.isPinned ? 'pinned' : ''}">
            \${item.isPinned ? '<div class="pin-tag">★ PINNED</div>' : ''}
            
            \${item.photo ? \`<img src="\${item.photo}" style="width:100%; height:110px; object-fit:cover; border-radius:14px; margin-bottom:12px;" onerror="this.style.display='none'">\` : ''}

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <b style="font-size:16px; color:#fff;">/\${item.slug}</b>
              <span style="font-size:11px; padding:3px 8px; border-radius:8px; background:\${item.isPublic ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:\${item.isPublic ? '#34D399' : '#F87171'}; font-weight:700;">
                \${item.isPublic ? 'PUBLIC' : 'PRIVATE'}
              </span>
            </div>

            <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">\${item.bio || 'No bio provided'}</p>

            <div style="display:flex; gap:10px; margin-bottom:14px; font-size:12px;">
              <span style="background:rgba(255,255,255,0.06); padding:4px 10px; border-radius:10px;">👁️ <b>\${item.views || 0}</b> Views</span>
              <span style="background:rgba(255,255,255,0.06); padding:4px 10px; border-radius:10px;">⏳ <b>\${daysLeft}</b> Days left</span>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
              <button onclick="togglePin('\${item.slug}', \${!item.isPinned})" class="glass-btn btn-secondary" style="padding:10px; font-size:12px;">
                \${item.isPinned ? 'Unpin' : '★ Pin to Top'}
              </button>
              <button onclick="togglePublic('\${item.slug}', \${!item.isPublic})" class="glass-btn btn-secondary" style="padding:10px; font-size:12px;">
                \${item.isPublic ? 'Make Private' : 'Make Public'}
              </button>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
              <a href="\${fullUrl}" target="_blank" class="glass-btn btn-gradient" style="padding:10px; font-size:12px;">Visit ↗</a>
              <button onclick="editMyLink('\${item.slug}')" class="glass-btn btn-secondary" style="padding:10px; font-size:12px;">Edit</button>
              <button onclick="deleteMyLink('\${item.slug}')" class="glass-btn btn-secondary" style="padding:10px; font-size:12px; color:#EF4444;">Delete</button>
            </div>
          </div>
        \`;
      });
      container.innerHTML = html;
    }

    async function togglePin(slug, status) {
      await db.ref('pages/' + slug + '/isPinned').set(status);
      renderMyLinks();
    }

    async function togglePublic(slug, status) {
      await db.ref('pages/' + slug + '/isPublic').set(status);
      renderMyLinks();
    }

    async function deleteMyLink(slug) {
      if (!confirm("আপনি কি নিশ্চিত এই ডোমেনটি ডিলিট করবেন?")) return;
      await db.ref('pages/' + slug).remove();
      myLocalSlugs = myLocalSlugs.filter(s => s !== slug);
      localStorage.setItem('sjemar_my_slugs', JSON.stringify(myLocalSlugs));
      renderMyLinks();
    }

    async function editMyLink(slug) {
      const snap = await db.ref('pages/' + slug).once('value');
      const item = snap.val();
      if (!item) return;

      const newBio = prompt("নতুন Bio দিন:", item.bio || "");
      const newHtml = prompt("নতুন HTML কোড পেস্ট করুন:", item.htmlContent || "");

      if (newHtml !== null) {
        await db.ref('pages/' + slug).update({
          bio: newBio !== null ? newBio : item.bio,
          htmlContent: newHtml
        });
        alert("✅ লিংক আপডেট সম্পন্ন হয়েছে!");
        renderMyLinks();
      }
    }

    function loadCodes() {
      const container = document.getElementById('projectsListContainer');
      db.ref('projects').on('value', snap => {
        const data = snap.val();
        if (!data) {
          container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">কোনো কোড পাওয়া যায়নি।</div>';
          return;
        }
        let html = '';
        Object.keys(data).forEach(k => {
          const p = data[k];
          html += \`
            <div class="link-item-card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <b style="font-size:15px; color:#fff;">\${p.title}</b>
                <span style="font-size:10px; font-weight:800; padding:3px 8px; border-radius:8px; background:rgba(168,85,247,0.2); color:#C084FC;">\${p.tag || 'HOT'}</span>
              </div>
              <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">\${p.description}</p>
              <button onclick="copyCode('\${encodeURIComponent(p.htmlCode)}')" class="glass-btn btn-secondary" style="padding:10px; font-size:12px;">Copy Source Code 📋</button>
            </div>
          \`;
        });
        container.innerHTML = html;
      });
    }

    function loadTasks() {
      const container = document.getElementById('tasksListContainer');
      db.ref('tasks').on('value', snap => {
        const data = snap.val();
        if (!data) {
          container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">কোনো সক্রিয় টাস্ক নেই।</div>';
          return;
        }
        let html = '';
        Object.keys(data).forEach(k => {
          const t = data[k];
          html += \`
            <div class="link-item-card">
              \${t.image ? \`<img src="\${t.image}" style="width:100%; height:120px; object-fit:cover; border-radius:14px; margin-bottom:12px;" onerror="this.style.display='none'">\` : ''}
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <b style="font-size:15px; color:#fff;">\${t.title}</b>
                <span style="font-size:10px; font-weight:800; padding:3px 8px; border-radius:8px; background:rgba(16,185,129,0.2); color:#6EE7B7;">\${t.badge || 'FREE'}</span>
              </div>
              <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">\${t.description}</p>
              <div style="display:flex; gap:8px;">
                <a href="\${t.link}" target="_blank" class="glass-btn btn-gradient" style="padding:10px; font-size:12px; flex:1;">Open Task ↗</a>
                \${t.rewardHtml ? \`<button onclick="copyCode('\${encodeURIComponent(t.rewardHtml)}')" class="glass-btn btn-secondary" style="padding:10px; font-size:12px;">Get Code</button>\` : ''}
              </div>
            </div>
          \`;
        });
        container.innerHTML = html;
      });
    }

    function copyCode(encoded) {
      navigator.clipboard.writeText(decodeURIComponent(encoded));
      alert("✅ সোর্স কোড ক্লিপবোর্ডে কপি করা হয়েছে!");
    }
  </script>
</body>
</html>`);
});

// ==========================================
// ২. সিক্রেট এডমিন গেট (#roter# / /roter)
// ==========================================
app.get('/roter', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>#roter# • Master Admin Console</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(16, 16, 20, 0.8);
      --card-border: rgba(255, 255, 255, 0.1);
      --accent-gradient: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #000; color: #fff; min-height: 100vh; padding: 20px 16px 80px; }

    .card { background: var(--card-bg); backdrop-filter: blur(40px); border: 1px solid var(--card-border); border-radius: 22px; padding: 22px; margin-bottom: 18px; max-width: 500px; margin-left: auto; margin-right: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
    .card-title { font-size: 16px; font-weight: 800; margin-bottom: 6px; }
    .card-desc { font-size: 12px; color: #94A3B8; margin-bottom: 16px; }

    label { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 6px; display: block; }
    input, textarea, select { width: 100%; background: #08080C; border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 12px 14px; color: #fff; font-size: 13px; outline: none; margin-bottom: 14px; }
    textarea { font-family: 'JetBrains Mono', monospace; }

    .btn { width: 100%; padding: 14px; border-radius: 14px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-grad { background: var(--accent-gradient); color: #fff; box-shadow: 0 8px 25px rgba(59,130,246,0.35); }
    .btn-sec { background: rgba(255,255,255,0.08); border: 1px solid var(--card-border); color: #fff; }

    .lock-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .lock-card { background: #0A0A0E; border: 1px solid var(--card-border); border-radius: 26px; padding: 32px 24px; width: 100%; max-width: 340px; text-align: center; }
  </style>
</head>
<body>

  <!-- Disguised Lock Gate -->
  <div id="lockGate" class="lock-screen">
    <div class="lock-card">
      <div style="font-size:36px; margin-bottom:10px;">🛡️</div>
      <div style="font-size:18px; font-weight:800; margin-bottom:4px;">#roter# Access Gate</div>
      <div style="font-size:12px; color:#94A3B8; margin-bottom:18px;">সঠিক মাস্টার পাসওয়ার্ড দিন</div>
      <input type="password" id="passCode" placeholder="••••••••" style="text-align:center; font-size:18px; letter-spacing:3px;">
      <button class="btn btn-grad" onclick="unlockAdmin()">Unlock Master Console</button>
      <a href="/" style="display:block; margin-top:14px; font-size:12px; color:#94A3B8; text-decoration:none;">ইউজার পেজে ফিরে যান ↗</a>
    </div>
  </div>

  <!-- Admin Dashboard -->
  <div id="adminPanel" style="display:none; max-width:500px; margin:auto;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h2 style="font-size:20px; font-weight:800; background:var(--accent-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">#ROTER# MASTER ADMIN</h2>
      <a href="/" style="color:#60A5FA; font-size:12px; text-decoration:none; font-weight:700;">View App ↗</a>
    </div>

    <!-- 1. App Control & Settings -->
    <div class="card">
      <div class="card-title">⚙️ App Service & Global Controls</div>
      <div class="card-desc">সার্ভিস স্ট্যাটাস, পপআপ নোটিশ ও সাপোর্ট লিংক কনফিগারেশন:</div>

      <label>Service Mode</label>
      <select id="cfgServiceMode">
        <option value="online">🟢 Online / Active</option>
        <option value="maintenance">🔴 Maintenance (Service OFF)</option>
      </select>

      <label>Popup Announcement Title</label>
      <input type="text" id="cfgPopupTitle" placeholder="যেমন: নতুন আপডেট প্রকাশ হয়েছে!">

      <label>Popup Description</label>
      <textarea id="cfgPopupDesc" rows="2" placeholder="নোটিশের বিস্তারিত লিখুন..."></textarea>

      <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
        <input type="checkbox" id="cfgPopupActive" style="width:auto; margin-bottom:0;">
        <label for="cfgPopupActive" style="margin-bottom:0; cursor:pointer;">Show Popup to All Users</label>
      </div>

      <button class="btn btn-grad" onclick="saveAppConfig()">Save App Settings</button>
    </div>

    <!-- 2. Publish Official Task -->
    <div class="card">
      <div class="card-title">🎯 Publish Task with Banner & HTML</div>
      <div class="card-desc">টেলিগ্রাম/ইউটিউব টাস্ক বা রিওয়ার্ড কোড যুক্ত করুন:</div>

      <label>Task Title</label>
      <input type="text" id="taskTitle" placeholder="Join Official Telegram">

      <label>Task Banner Image URL</label>
      <input type="url" id="taskImage" placeholder="https://i.ibb.co/banner.jpg">

      <label>Badge Tag</label>
      <input type="text" id="taskBadge" placeholder="HOT, FREE, REWARD">

      <label>Target Action Link</label>
      <input type="text" id="taskLink" placeholder="https://t.me/...">

      <label>Task Bio / Description</label>
      <input type="text" id="taskDesc" placeholder="টাস্কটি সম্পন্ন করে বোনাস কোড নিন...">

      <label>Reward HTML / Source Code (ঐচ্ছিক)</label>
      <textarea id="taskRewardHtml" rows="4" placeholder="<!DOCTYPE html> ..."></textarea>

      <button class="btn btn-grad" onclick="publishTask()">Publish Task</button>
    </div>

    <!-- 3. Publish Code / Template -->
    <div class="card">
      <div class="card-title">📦 Publish Code / Template</div>
      <div class="card-desc">ইউজারদের জন্য অফিসিয়াল কোড পাবলিশ করুন:</div>

      <label>Project Title</label>
      <input type="text" id="projTitle" placeholder="যেমন: Ultra Glass Bio Page">

      <label>Category Tag</label>
      <input type="text" id="projTag" placeholder="PRO, FREE, BIO">

      <label>Description</label>
      <input type="text" id="projDesc" placeholder="প্রজেক্ট সম্পর্কে বিবরণ...">

      <label>Raw Source Code (HTML)</label>
      <textarea id="projHtml" rows="5" placeholder="<!DOCTYPE html> ..."></textarea>

      <button class="btn btn-grad" onclick="publishProject()">Publish Code</button>
    </div>

    <!-- 4. Manage All Live Domains -->
    <div class="card">
      <div class="card-title">🌐 All Hosted User Domains</div>
      <div class="card-desc">Firebase-এ থাকা সকল লিংক মনিটর ও ডিলিট করুন:</div>
      <div id="allDomainsList"><div style="text-align:center; color:#94A3B8; padding:15px;">লোড হচ্ছে...</div></div>
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
        loadAdminData();
      } else {
        alert("ভুল পাসওয়ার্ড! প্রবেশাধিকার সংরক্ষিত।");
      }
    }

    function loadAdminData() {
      // Load Config
      db.ref('app_config').once('value', snap => {
        const c = snap.val();
        if (c) {
          document.getElementById('cfgServiceMode').value = c.serviceMode || 'online';
          document.getElementById('cfgPopupTitle').value = c.popupTitle || '';
          document.getElementById('cfgPopupDesc').value = c.popupDesc || '';
          document.getElementById('cfgPopupActive').checked = !!c.popupActive;
        }
      });

      // Load Domains
      db.ref('pages').on('value', snap => {
        const data = snap.val();
        const list = document.getElementById('allDomainsList');
        if (!data) {
          list.innerHTML = '<div style="text-align:center; color:#94A3B8; padding:15px;">কোনো ডোমেন পাওয়া যায়নি।</div>';
          return;
        }
        let html = '';
        Object.keys(data).forEach(k => {
          const item = data[k];
          html += \`
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px; margin-bottom:8px;">
              <div>
                <a href="/sjemar/\${item.slug}" target="_blank" style="color:#fff; text-decoration:none; font-weight:700; font-size:13px;">/\${item.slug}</a>
                <div style="font-size:11px; color:#94A3B8; margin-top:3px;">👁️ \${item.views || 0} Views • \${item.isPublic ? 'Public' : 'Private'}</div>
              </div>
              <button onclick="adminDeleteDomain('\${item.slug}')" style="background:#EF4444; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer;">Delete</button>
            </div>
          \`;
        });
        list.innerHTML = html;
      });
    }

    function saveAppConfig() {
      db.ref('app_config').set({
        serviceMode: document.getElementById('cfgServiceMode').value,
        popupTitle: document.getElementById('cfgPopupTitle').value,
        popupDesc: document.getElementById('cfgPopupDesc').value,
        popupActive: document.getElementById('cfgPopupActive').checked
      }, err => {
        if (!err) alert("✅ App Settings সংরক্ষিত হয়েছে!");
      });
    }

    function publishTask() {
      const title = document.getElementById('taskTitle').value;
      const image = document.getElementById('taskImage').value;
      const badge = document.getElementById('taskBadge').value || 'HOT';
      const link = document.getElementById('taskLink').value;
      const description = document.getElementById('taskDesc').value;
      const rewardHtml = document.getElementById('taskRewardHtml').value;

      if (!title || !link) return alert("টাস্ক নাম ও লিংক দিন!");

      db.ref('tasks').push({ title, image, badge, link, description, rewardHtml, createdAt: Date.now() }, err => {
        if (!err) {
          alert("✅ টাস্ক সফলভাবে পাবলিশ হয়েছে!");
          document.getElementById('taskTitle').value = '';
          document.getElementById('taskImage').value = '';
          document.getElementById('taskLink').value = '';
          document.getElementById('taskDesc').value = '';
          document.getElementById('taskRewardHtml').value = '';
        }
      });
    }

    function publishProject() {
      const title = document.getElementById('projTitle').value;
      const tag = document.getElementById('projTag').value || 'PRO';
      const description = document.getElementById('projDesc').value;
      const htmlCode = document.getElementById('projHtml').value;

      if (!title || !htmlCode) return alert("টাইটেল ও সোর্স কোড দিন!");

      db.ref('projects').push({ title, tag, description, htmlCode, createdAt: Date.now() }, err => {
        if (!err) {
          alert("✅ প্রজেক্ট সফলভাবে পাবলিশ হয়েছে!");
          document.getElementById('projTitle').value = '';
          document.getElementById('projDesc').value = '';
          document.getElementById('projHtml').value = '';
        }
      });
    }

    function adminDeleteDomain(slug) {
      if (!confirm("আপনি কি নিশ্চিত এই ডোমেনটি ডিলিট করতে চান?")) return;
      db.ref('pages/' + slug).remove();
    }
  </script>
</body>
</html>`);
});

// Backward compatibility alias for /admin
app.get('/admin', (req, res) => res.redirect('/roter'));

// ==========================================
// ৩. ডাইনামিক পেজ রেন্ডার ইঞ্জিন (/sjemar/:slug & /:slug)
// ==========================================
async function renderCloudPage(req, res, slug) {
  try {
    cleanSlug = slug.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');

    // চেক করুন কোনো সিস্টেম রাউট কি না
    if (['roter', 'admin', 'api'].includes(cleanSlug)) return;

    // ১. অ্যাপ সার্ভিস স্ট্যাটাস চেক
    const configRes = await fetch(`${FIREBASE_DB_URL}/app_config.json`);
    const configData = await configRes.json();
    if (configData && configData.serviceMode === 'maintenance') {
      return res.status(503).send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Maintenance</title></head>
        <body style="background:#000; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; font-family:sans-serif; text-align:center; padding:20px;">
          <div>
            <h1 style="font-size:26px;">🛠️ Service Under Maintenance</h1>
            <p style="color:#94A3B8; font-size:14px; margin-top:8px;">এডমিন সাময়িকভাবে সার্ভিস বন্ধ রেখেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।</p>
          </div>
        </body>
        </html>
      `);
    }

    // ২. পেজ ডাটা ফেচ
    const response = await fetch(`${FIREBASE_DB_URL}/pages/${cleanSlug}.json`);
    const pageData = await response.json();

    if (!pageData || !pageData.htmlContent) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>404 Not Found</title></head>
        <body style="background:#000; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; font-family:sans-serif; text-align:center;">
          <div>
            <h1 style="font-size:32px; font-weight:800; background:linear-gradient(135deg, #3B82F6, #EC4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">404</h1>
            <p style="color:#94A3B8; font-size:14px; margin-top:6px;">Domain Not Found or Expired</p>
          </div>
        </body>
        </html>
      `);
    }

    // ৩. এক্সপায়ারি চেক
    if (pageData.expiresAt && Date.now() > pageData.expiresAt) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Domain Expired</title></head>
        <body style="background:#000; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; font-family:sans-serif; text-align:center;">
          <div>
            <h1 style="font-size:24px;">⏳ Domain Has Expired</h1>
            <p style="color:#94A3B8; font-size:13px; margin-top:6px;">এই লিংকের কার্যকাল শেষ হয়ে গেছে।</p>
          </div>
        </body>
        </html>
      `);
    }

    // ৪. প্রাইভেট পেজ প্রোটেকশন চেক
    if (pageData.isPublic === false) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Private Link</title></head>
        <body style="background:#000; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; font-family:sans-serif; text-align:center;">
          <div>
            <h1 style="font-size:24px;">🔒 Private Domain</h1>
            <p style="color:#94A3B8; font-size:13px; margin-top:6px;">এই লিংকটি বর্তমানে প্রাইভেট অবস্থায় রয়েছে।</p>
          </div>
        </body>
        </html>
      `);
    }

    // ৫. ভিউ কাউন্টার বৃদ্ধি
    const newViews = (pageData.views || 0) + 1;
    fetch(`${FIREBASE_DB_URL}/pages/${cleanSlug}/views.json`, {
      method: 'PUT',
      body: JSON.stringify(newViews)
    }).catch(() => {});

    let finalHtml = pageData.htmlContent;

    // ৬. যদি ইউজার "Show HTML for Visitor" অপশন অন করে রাখে:
    if (pageData.showSource) {
      const encodedCode = encodeURIComponent(pageData.htmlContent);
      const inspectorWidget = `
        <!-- SJEMAR iOS Source Inspector Widget -->
        <div id="sjemar-source-bar" style="position:fixed; bottom:16px; left:50%; transform:translateX(-50%); z-index:99999; background:rgba(12,12,16,0.85); backdrop-filter:blur(30px); -webkit-backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,0.15); border-radius:30px; padding:8px 16px; display:flex; align-items:center; gap:12px; box-shadow:0 15px 35px rgba(0,0,0,0.8); font-family:-apple-system, sans-serif;">
          <span style="font-size:11px; font-weight:700; color:#93C5FD; display:flex; align-items:center; gap:6px;">
            ⚡ SJEMAR ENGINE
          </span>
          <button onclick="navigator.clipboard.writeText(decodeURIComponent('${encodedCode}')); alert('✅ এই পেজের HTML সোর্স কোড কপি করা হয়েছে!');" style="background:linear-gradient(135deg, #3B82F6, #8B5CF6); border:none; color:#fff; font-size:11px; font-weight:700; padding:6px 12px; border-radius:18px; cursor:pointer;">
            Copy HTML
          </button>
        </div>
      `;
      finalHtml += inspectorWidget;
    }

    res.set('Content-Type', 'text/html');
    res.send(finalHtml);
  } catch (err) {
    res.status(500).send("Error rendering page: " + err.message);
  }
}

app.get('/sjemar/:slug', (req, res) => renderCloudPage(req, res, req.params.slug));
app.get('/:slug', (req, res) => renderCloudPage(req, res, req.params.slug));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 SJEMAR OLED Cloud Engine running on port ' + PORT));
