const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(bodyParser.json({ limit: '100mb' }));

const FIREBASE_DB_URL = "https://sifatby-38886-default-rtdb.firebaseio.com";
const ADMIN_PASS = "py.py.php";

// ==========================================
// ১. মূল ইউজার পেজ (iOS OLED Pure Dark)
// ==========================================
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>SJEMAR • Cloud Web Engine</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(16, 16, 20, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent-blue: #0A84FF;
      --accent-purple: #BF5AF2;
      --accent-pink: #FF375F;
      --accent-gradient: linear-gradient(135deg, #0A84FF 0%, #BF5AF2 50%, #FF375F 100%);
      --text: #FFFFFF;
      --text-dim: #8E8E93;
      --border-subtle: rgba(255, 255, 255, 0.05);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; padding-bottom: 110px; overflow-x: hidden; position: relative; }

    /* OLED Ambient Glows */
    .glow-1 { position: fixed; top: -80px; left: 50%; transform: translateX(-50%); width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, rgba(10,132,255,0.15) 0%, transparent 70%); filter: blur(60px); pointer-events: none; z-index: 0; }
    .glow-2 { position: fixed; bottom: 80px; right: -50px; width: 250px; height: 250px; border-radius: 50%; background: radial-gradient(circle, rgba(191,90,242,0.12) 0%, transparent 70%); filter: blur(60px); pointer-events: none; z-index: 0; }

    /* iOS Glass Header */
    .header { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(35px); -webkit-backdrop-filter: blur(35px); background: rgba(0, 0, 0, 0.75); border-bottom: 1px solid var(--card-border); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
    .brand-wrap { display: flex; align-items: center; gap: 10px; }
    .brand-logo { width: 30px; height: 30px; border-radius: 9px; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff; font-size: 15px; box-shadow: 0 4px 15px rgba(10,132,255,0.4); }
    .brand-title { font-size: 17px; font-weight: 800; letter-spacing: -0.4px; background: linear-gradient(180deg, #FFFFFF 0%, #D1D5DB 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .status-pill { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 14px; background: rgba(10,132,255,0.12); color: #60A5FA; border: 1px solid rgba(10,132,255,0.3); display: flex; align-items: center; gap: 5px; }
    .pulse-dot { width: 5px; height: 5px; border-radius: 50%; background: #0A84FF; box-shadow: 0 0 8px #0A84FF; animation: pulse 1.8s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    .container { max-width: 480px; margin: 0 auto; padding: 18px 14px; position: relative; z-index: 10; }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: iosFade 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes iosFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    /* Glass Cards */
    .glass-card { background: var(--card-bg); backdrop-filter: blur(35px); -webkit-backdrop-filter: blur(35px); border: 1px solid var(--card-border); border-radius: 20px; padding: 18px; margin-bottom: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.8); }
    .card-header { font-size: 16px; font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .card-subtitle { font-size: 12px; color: var(--text-dim); margin-bottom: 16px; line-height: 1.4; }

    /* Form Inputs */
    .form-group { margin-bottom: 12px; }
    .form-label { font-size: 10px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 5px; display: block; }
    .glass-input, .glass-textarea, .glass-select { width: 100%; background: rgba(8, 8, 12, 0.85); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 12px 14px; color: #fff; font-size: 13px; outline: none; transition: 0.2s; }
    .glass-input:focus, .glass-textarea:focus, .glass-select:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(10,132,255,0.2); }
    .glass-textarea { font-family: 'JetBrains Mono', monospace; font-size: 12px; resize: vertical; }

    /* iOS Toggles */
    .toggle-box { display: flex; justify-content: space-between; align-items: center; padding: 11px 13px; background: rgba(255,255,255,0.03); border-radius: 14px; border: 1px solid var(--border-subtle); margin-bottom: 10px; }
    .toggle-txt-title { font-size: 12px; font-weight: 600; }
    .toggle-txt-desc { font-size: 10px; color: var(--text-dim); }
    .ios-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .ios-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.15); transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 30px; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 50%; }
    input:checked + .slider { background: var(--accent-blue); }
    input:checked + .slider:before { transform: translateX(20px); }

    /* Action Buttons */
    .glass-btn { width: 100%; padding: 13px; border-radius: 14px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; text-decoration: none; transition: 0.15s; }
    .btn-gradient { background: var(--accent-gradient); color: #fff; box-shadow: 0 6px 20px rgba(10,132,255,0.3); }
    .btn-gradient:active { transform: scale(0.98); opacity: 0.9; }
    .btn-subtle { background: rgba(255,255,255,0.06); border: 1px solid var(--card-border); color: #fff; }
    .btn-subtle:active { transform: scale(0.98); background: rgba(255,255,255,0.12); }

    /* Task & Item Card */
    .item-card { background: rgba(22, 22, 28, 0.85); border: 1px solid var(--card-border); border-radius: 18px; padding: 14px; margin-bottom: 12px; }
    .item-card.pinned { border: 1px solid rgba(245, 158, 11, 0.4); background: rgba(32, 26, 14, 0.6); }
    .badge-tag { font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 6px; letter-spacing: 0.3px; }

    /* Contact Support Grid */
    .contact-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
    .contact-btn { background: rgba(255,255,255,0.04); border: 1px solid var(--card-border); border-radius: 14px; padding: 12px; display: flex; align-items: center; gap: 10px; text-decoration: none; color: #fff; transition: 0.2s; }
    .contact-btn:active { background: rgba(255,255,255,0.1); transform: scale(0.98); }
    .contact-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 15px; }

    /* Fixed iOS Dock Navigation (Ultra-Fit & Responsive) */
    .dock-container { position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); width: calc(100% - 24px); max-width: 440px; z-index: 60; }
    .dock-bar { background: rgba(14, 14, 18, 0.88); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 28px; padding: 6px 8px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; box-shadow: 0 20px 45px rgba(0,0,0,0.9); }
    .dock-tab { background: transparent; border: none; color: var(--text-dim); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; padding: 6px 0; border-radius: 18px; transition: 0.15s; text-decoration: none; min-width: 0; }
    .dock-tab svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2; flex-shrink: 0; }
    .dock-label { font-size: 9.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .dock-tab.active { color: #60A5FA; background: rgba(10,132,255,0.15); }
    .dock-tab.active svg { stroke: #60A5FA; }

    /* Modal / Popup */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(30px); z-index: 200; display: none; align-items: center; justify-content: center; padding: 18px; }
    .modal-box { background: #0F0F14; border: 1px solid var(--card-border); border-radius: 22px; padding: 22px; max-width: 340px; width: 100%; text-align: center; }

    /* Loader */
    .loader-wrap { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(30px); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 300; }
    .spinner { width: 38px; height: 38px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #0A84FF; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 14px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>

  <!-- Announcement Modal -->
  <div id="noticeModal" class="modal-overlay">
    <div class="modal-box">
      <div style="font-size:32px; margin-bottom:8px;">📢</div>
      <h3 id="popupTitle" style="font-size:16px; font-weight:800; margin-bottom:6px;">Notice</h3>
      <p id="popupDesc" style="font-size:12px; color:var(--text-dim); margin-bottom:18px; line-height:1.4;"></p>
      <button class="glass-btn btn-gradient" onclick="closeNotice()">ঠিক আছে</button>
    </div>
  </div>

  <!-- Loader -->
  <div id="loaderModal" class="loader-wrap">
    <div class="spinner"></div>
    <div id="loadingStatusText" style="font-size: 12px; font-weight: 600; color: #93C5FD;">Processing Cloud Engine...</div>
  </div>

  <header class="header">
    <div class="brand-wrap">
      <div class="brand-logo">S</div>
      <span class="brand-title">SJEMAR</span>
    </div>
    <div class="status-pill">
      <div class="pulse-dot"></div>
      <span>ENGINE PRO</span>
    </div>
  </header>

  <main class="container">
    <!-- TAB 1: HOME (TASKS & CONTACTS FIRST) -->
    <section id="tab-home" class="tab-pane active">
      <!-- 1. Official Tasks -->
      <div class="glass-card">
        <div class="card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" stroke-width="2.2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Official Tasks
        </div>
        <div class="card-subtitle">টাস্কগুলো সম্পন্ন করুন ও স্পেশাল কোড আনলক করুন:</div>
        <div id="homeTasksList"><div style="text-align:center; color:var(--text-dim); padding:20px; font-size:12px;">টাস্ক লোড হচ্ছে...</div></div>
      </div>

      <!-- 2. Support & Contacts -->
      <div class="glass-card">
        <div class="card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BF5AF2" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          অফিসিয়াল যোগাযোগ
        </div>
        <div class="card-subtitle">এডমিন সাপোর্ট বা কোনো সমস্যায় সরাসরি যুক্ত হোন:</div>
        
        <div class="contact-grid">
          <a id="linkTgChannel" href="https://t.me/" target="_blank" class="contact-btn">
            <div class="contact-icon" style="background: rgba(10,132,255,0.2); color:#60A5FA;">📢</div>
            <div>
              <div style="font-size:12px; font-weight:700;">Telegram</div>
              <div style="font-size:10px; color:var(--text-dim);">অফিসিয়াল চ্যানেল</div>
            </div>
          </a>

          <a id="linkTgSupport" href="https://t.me/" target="_blank" class="contact-btn">
            <div class="contact-icon" style="background: rgba(16,185,129,0.2); color:#6EE7B7;">💬</div>
            <div>
              <div style="font-size:12px; font-weight:700;">Support Bot</div>
              <div style="font-size:10px; color:var(--text-dim);">লাইভ চ্যাট</div>
            </div>
          </a>
        </div>
      </div>
    </section>

    <!-- TAB 2: HOST BUILDER -->
    <section id="tab-host" class="tab-pane">
      <div class="glass-card">
        <div class="card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" stroke-width="2.2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Deploy Custom Web Page
        </div>
        <div class="card-subtitle">আপনার নিজস্ব Slug ও কোড দিয়ে লাইভ ওয়েব ডোমেন তৈরি করুন।</div>

        <div class="form-group">
          <label class="form-label">Custom Slug (ডোমেইন নাম)</label>
          <input type="text" id="domainSlug" class="glass-input" placeholder="যেমন: my-bio, event2026">
        </div>

        <div class="form-group">
          <label class="form-label">Bio / ছোট বিবরণ</label>
          <input type="text" id="domainBio" class="glass-input" placeholder="যেমন: Official Bio & Links Page">
        </div>

        <div class="form-group">
          <label class="form-label">Thumbnail / Preview Image (URL)</label>
          <input type="url" id="domainPhoto" class="glass-input" placeholder="https://i.ibb.co/banner.jpg">
        </div>

        <div class="form-group">
          <label class="form-label">Expiration (মেয়াদ)</label>
          <select id="domainExpiry" class="glass-select">
            <option value="365">Lifetime (365 Days)</option>
            <option value="30">30 Days</option>
            <option value="7">7 Days</option>
            <option value="1">24 Hours</option>
          </select>
        </div>

        <div class="toggle-box">
          <div>
            <div class="toggle-txt-title">Show HTML Source to Visitor</div>
            <div class="toggle-txt-desc">ভিজিটররা পেজে কোড কপি উইজেট পাবে</div>
          </div>
          <label class="ios-switch">
            <input type="checkbox" id="domainShowSource" checked>
            <span class="slider"></span>
          </label>
        </div>

        <div class="toggle-box">
          <div>
            <div class="toggle-txt-title">Make Link Public</div>
            <div class="toggle-txt-desc">সরাসরি সবার জন্য উন্মুক্ত থাকবে</div>
          </div>
          <label class="ios-switch">
            <input type="checkbox" id="domainIsPublic" checked>
            <span class="slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">HTML / CSS / JS Code</label>
          <textarea id="domainHtml" class="glass-textarea" rows="7" placeholder="<!DOCTYPE html>&#10;<html>...</html>"></textarea>
        </div>

        <button class="glass-btn btn-gradient" onclick="handleDeploy()">
          🚀 Deploy Link Now
        </button>

        <div id="resultBox" style="display:none; margin-top:14px; padding:14px; background:rgba(10,132,255,0.12); border:1px solid rgba(10,132,255,0.3); border-radius:16px; text-align:center;">
          <div style="font-size:10px; color:#93C5FD; margin-bottom:4px; font-weight:800;">DEPLOYED LINK READY:</div>
          <a id="resultUrl" href="" target="_blank" style="color:#fff; font-weight:700; word-break:break-all; font-size:13px; text-decoration:underline;"></a>
        </div>
      </div>
    </section>

    <!-- TAB 3: MY LINKS -->
    <section id="tab-mylinks" class="tab-pane">
      <div class="glass-card">
        <div class="card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          My Created Links
        </div>
        <div class="card-subtitle">আপনার তৈরি করা সকল লিংক ও লাইভ ভিজিটর সংখ্যা:</div>
        <div id="myLinksContainer">
          <div style="text-align:center; color:var(--text-dim); padding:25px; font-size:12px;">কোনো লিংক তৈরি করা হয়নি।</div>
        </div>
      </div>
    </section>

    <!-- TAB 4: CODES / TEMPLATES -->
    <section id="tab-codes" class="tab-pane">
      <div class="glass-card">
        <div class="card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BF5AF2" stroke-width="2.2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          Templates & Source Codes
        </div>
        <div class="card-subtitle">এডমিনের দেওয়া রেডিমেড কোড ১-ক্লিকে কপি করুন:</div>
        <div id="projectsListContainer"><div style="text-align:center; color:var(--text-dim); padding:20px; font-size:12px;">লোড হচ্ছে...</div></div>
      </div>
    </section>
  </main>

  <!-- iOS Slim Dock Bar (Ultra Clean & Responsive) -->
  <div class="dock-container">
    <nav class="dock-bar">
      <button class="dock-tab active" onclick="switchNav('home', this)">
        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span class="dock-label">Home</span>
      </button>
      <button class="dock-tab" onclick="switchNav('host', this)">
        <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <span class="dock-label">Host</span>
      </button>
      <button class="dock-tab" onclick="switchNav('mylinks', this)">
        <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <span class="dock-label">Links</span>
      </button>
      <button class="dock-tab" onclick="switchNav('codes', this)">
        <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <span class="dock-label">Codes</span>
      </button>
      <a href="/roter" class="dock-tab" title="Admin Gate">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span class="dock-label">#roter#</span>
      </a>
    </nav>
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

    let myLocalSlugs = JSON.parse(localStorage.getItem('sjemar_my_slugs') || '[]');

    // Initial Load
    window.onload = () => {
      loadHomeTasks();
      loadAppConfig();
    };

    function switchNav(tab, el) {
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.dock-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      if (el) el.classList.add('active');

      if (tab === 'home') loadHomeTasks();
      if (tab === 'mylinks') renderMyLinks();
      if (tab === 'codes') loadCodes();
    }

    function loadAppConfig() {
      db.ref('app_config').on('value', snap => {
        const c = snap.val();
        if (c) {
          if (c.popupActive && c.popupTitle) {
            document.getElementById('popupTitle').innerText = c.popupTitle;
            document.getElementById('popupDesc').innerText = c.popupDesc || '';
            document.getElementById('noticeModal').style.display = 'flex';
          }
          if (c.tgChannel) document.getElementById('linkTgChannel').href = c.tgChannel;
          if (c.tgSupport) document.getElementById('linkTgSupport').href = c.tgSupport;
        }
      });
    }

    function closeNotice() {
      document.getElementById('noticeModal').style.display = 'none';
    }

    function loadHomeTasks() {
      const container = document.getElementById('homeTasksList');
      db.ref('tasks').on('value', snap => {
        const data = snap.val();
        if (!data) {
          container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:16px; font-size:12px;">কোনো সক্রিয় টাস্ক নেই।</div>';
          return;
        }
        let html = '';
        Object.keys(data).forEach(k => {
          const t = data[k];
          html += \`
            <div class="item-card">
              \${t.image ? \`<img src="\${t.image}" style="width:100%; height:110px; object-fit:cover; border-radius:12px; margin-bottom:10px;" onerror="this.style.display='none'">\` : ''}
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <b style="font-size:14px; color:#fff;">\${t.title}</b>
                <span class="badge-tag" style="background:rgba(16,185,129,0.2); color:#6EE7B7;">\${t.badge || 'HOT'}</span>
              </div>
              <p style="font-size:12px; color:var(--text-dim); margin-bottom:12px; line-height:1.4;">\${t.description || ''}</p>
              <div style="display:flex; gap:8px;">
                <a href="\${t.link}" target="_blank" class="glass-btn btn-gradient" style="padding:9px; font-size:12px; flex:1;">Open Task ↗</a>
                \${t.rewardHtml ? \`<button onclick="copyCode('\${encodeURIComponent(t.rewardHtml)}')" class="glass-btn btn-subtle" style="padding:9px; font-size:12px;">Get Code 📋</button>\` : ''}
              </div>
            </div>
          \`;
        });
        container.innerHTML = html;
      });
    }

    async function handleDeploy() {
      const slugInput = document.getElementById('domainSlug').value.trim();
      const bio = document.getElementById('domainBio').value.trim();
      const photo = document.getElementById('domainPhoto').value.trim();
      const expiryDays = parseInt(document.getElementById('domainExpiry').value) || 365;
      const showSource = document.getElementById('domainShowSource').checked;
      const isPublic = document.getElementById('domainIsPublic').checked;
      const htmlContent = document.getElementById('domainHtml').value;

      if (!slugInput || !htmlContent) return alert("Slug এবং HTML কোড দিন!");

      const cleanSlug = slugInput.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
      const loader = document.getElementById('loaderModal');
      loader.style.display = 'flex';

      const expiresAt = Date.now() + (expiryDays * 24 * 60 * 60 * 1000);

      await db.ref('pages/' + cleanSlug).set({
        slug: cleanSlug,
        bio: bio || 'No description',
        photo: photo || '',
        expiresAt: expiresAt,
        showSource: showSource,
        isPublic: isPublic,
        isPinned: false,
        htmlContent: htmlContent,
        views: 0,
        createdAt: Date.now()
      });

      if (!myLocalSlugs.includes(cleanSlug)) {
        myLocalSlugs.push(cleanSlug);
        localStorage.setItem('sjemar_my_slugs', JSON.stringify(myLocalSlugs));
      }

      await new Promise(r => setTimeout(r, 600));
      loader.style.display = 'none';

      const fullUrl = window.location.origin + '/sjemar/' + cleanSlug;
      document.getElementById('resultBox').style.display = 'block';
      const linkElem = document.getElementById('resultUrl');
      linkElem.href = fullUrl;
      linkElem.innerText = fullUrl;
    }

    async function renderMyLinks() {
      const container = document.getElementById('myLinksContainer');
      if (myLocalSlugs.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:25px; font-size:12px;">কোনো লিংক তৈরি করা হয়নি।</div>';
        return;
      }

      container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:15px; font-size:12px;">লোড হচ্ছে...</div>';
      const promises = myLocalSlugs.map(slug => db.ref('pages/' + slug).once('value'));
      const snapshots = await Promise.all(promises);

      let links = [];
      snapshots.forEach(s => { if (s.exists()) links.push(s.val()); });

      if (links.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:25px; font-size:12px;">কোনো সক্রিয় লিংক নেই।</div>';
        return;
      }

      links.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

      let html = '';
      links.forEach(item => {
        const fullUrl = window.location.origin + '/sjemar/' + item.slug;
        const daysLeft = Math.max(0, Math.ceil((item.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));

        html += \`
          <div class="item-card \${item.isPinned ? 'pinned' : ''}">
            \${item.isPinned ? '<div style="font-size:9px; font-weight:800; color:#FBBF24; margin-bottom:4px;">★ PINNED</div>' : ''}
            \${item.photo ? \`<img src="\${item.photo}" style="width:100%; height:100px; object-fit:cover; border-radius:12px; margin-bottom:8px;" onerror="this.style.display='none'">\` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <b style="font-size:15px; color:#fff;">/\${item.slug}</b>
              <span class="badge-tag" style="background:\${item.isPublic ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:\${item.isPublic ? '#34D399' : '#F87171'};">
                \${item.isPublic ? 'PUBLIC' : 'PRIVATE'}
              </span>
            </div>
            <p style="font-size:11px; color:var(--text-dim); margin-bottom:10px;">\${item.bio}</p>

            <div style="display:flex; gap:8px; margin-bottom:10px; font-size:11px;">
              <span style="background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:8px;">👁️ <b>\${item.views || 0}</b> Views</span>
              <span style="background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:8px;">⏳ <b>\${daysLeft}</b> Days left</span>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:6px;">
              <button onclick="togglePin('\${item.slug}', \${!item.isPinned})" class="glass-btn btn-subtle" style="padding:8px; font-size:11px;">\${item.isPinned ? 'Unpin' : '★ Pin'}</button>
              <button onclick="togglePublic('\${item.slug}', \${!item.isPublic})" class="glass-btn btn-subtle" style="padding:8px; font-size:11px;">\${item.isPublic ? 'Make Private' : 'Make Public'}</button>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px;">
              <a href="\${fullUrl}" target="_blank" class="glass-btn btn-gradient" style="padding:8px; font-size:11px;">Visit ↗</a>
              <button onclick="editMyLink('\${item.slug}')" class="glass-btn btn-subtle" style="padding:8px; font-size:11px;">Edit</button>
              <button onclick="deleteMyLink('\${item.slug}')" class="glass-btn btn-subtle" style="padding:8px; font-size:11px; color:#EF4444;">Delete</button>
            </div>
          </div>
        \`;
      });
      container.innerHTML = html;
    }

    async function togglePin(slug, s) { await db.ref('pages/' + slug + '/isPinned').set(s); renderMyLinks(); }
    async function togglePublic(slug, s) { await db.ref('pages/' + slug + '/isPublic').set(s); renderMyLinks(); }
    async function deleteMyLink(slug) {
      if (!confirm("ডোমেনটি ডিলিট করতে চান?")) return;
      await db.ref('pages/' + slug).remove();
      myLocalSlugs = myLocalSlugs.filter(s => s !== slug);
      localStorage.setItem('sjemar_my_slugs', JSON.stringify(myLocalSlugs));
      renderMyLinks();
    }

    async function editMyLink(slug) {
      const s = await db.ref('pages/' + slug).once('value');
      const item = s.val();
      if (!item) return;
      const newBio = prompt("নতুন Bio দিন:", item.bio || "");
      const newHtml = prompt("নতুন HTML কোড পেস্ট করুন:", item.htmlContent || "");
      if (newHtml !== null) {
        await db.ref('pages/' + slug).update({ bio: newBio !== null ? newBio : item.bio, htmlContent: newHtml });
        alert("✅ লিংক আপডেট সম্পন্ন!");
        renderMyLinks();
      }
    }

    function loadCodes() {
      const container = document.getElementById('projectsListContainer');
      db.ref('projects').on('value', snap => {
        const data = snap.val();
        if (!data) {
          container.innerHTML = '<div style="text-align:center; color:var(--text-dim); padding:20px; font-size:12px;">কোনো কোড পাওয়া যায়নি।</div>';
          return;
        }
        let html = '';
        Object.keys(data).forEach(k => {
          const p = data[k];
          html += \`
            <div class="item-card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <b style="font-size:14px; color:#fff;">\${p.title}</b>
                <span class="badge-tag" style="background:rgba(191,90,242,0.2); color:#E879F9;">\${p.tag || 'HOT'}</span>
              </div>
              <p style="font-size:11px; color:var(--text-dim); margin-bottom:12px;">\${p.description}</p>
              <button onclick="copyCode('\${encodeURIComponent(p.htmlCode)}')" class="glass-btn btn-subtle" style="padding:9px; font-size:12px;">Copy Code 📋</button>
            </div>
          \`;
        });
        container.innerHTML = html;
      });
    }

    function copyCode(encoded) {
      navigator.clipboard.writeText(decodeURIComponent(encoded));
      alert("✅ সোর্স কোড কপি করা হয়েছে!");
    }
  </script>
</body>
</html>`);
});

// ==========================================
// ২. সিক্রেট এডমিন প্যানেল (#roter# / /roter)
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
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
    body { background: #000000; color: #fff; min-height: 100vh; padding: 20px 14px 80px; }
    .card { background: rgba(16, 16, 20, 0.85); backdrop-filter: blur(35px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; margin-bottom: 16px; max-width: 480px; margin-left: auto; margin-right: auto; }
    .card-title { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
    .card-desc { font-size: 11px; color: #8E8E93; margin-bottom: 14px; }
    label { font-size: 10px; font-weight: 700; color: #8E8E93; text-transform: uppercase; margin-bottom: 5px; display: block; }
    input, textarea, select { width: 100%; background: #08080C; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: #fff; font-size: 13px; outline: none; margin-bottom: 12px; }
    textarea { font-family: 'JetBrains Mono', monospace; }
    .btn { width: 100%; padding: 13px; border-radius: 14px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; background: linear-gradient(135deg, #0A84FF, #BF5AF2); color: #fff; }
    .lock-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .lock-card { background: #0B0B0E; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 28px 20px; width: 100%; max-width: 320px; text-align: center; }
  </style>
</head>
<body>
  <!-- Disguised Lock Gate -->
  <div id="lockGate" class="lock-screen">
    <div class="lock-card">
      <div style="font-size:32px; margin-bottom:8px;">🛡️</div>
      <div style="font-size:17px; font-weight:800; margin-bottom:4px;">#roter# Access Gate</div>
      <div style="font-size:11px; color:#8E8E93; margin-bottom:16px;">সঠিক মাস্টার পাসওয়ার্ড দিন</div>
      <input type="password" id="passCode" placeholder="••••••••" style="text-align:center; font-size:16px; letter-spacing:3px;">
      <button class="btn" onclick="unlockAdmin()">Unlock Master Console</button>
      <a href="/" style="display:block; margin-top:14px; font-size:11px; color:#8E8E93; text-decoration:none;">ইউজার পেজে ফিরে যান ↗</a>
    </div>
  </div>

  <div id="adminPanel" style="display:none; max-width:480px; margin:auto;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h2 style="font-size:18px; font-weight:800; background:linear-gradient(135deg, #0A84FF, #FF375F); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">#ROTER# MASTER ADMIN</h2>
      <a href="/" style="color:#60A5FA; font-size:11px; text-decoration:none; font-weight:700;">View App ↗</a>
    </div>

    <!-- Global App & Contact Links Config -->
    <div class="card">
      <div class="card-title">⚙️ App Service & Support Links</div>
      <div class="card-desc">যোগাযোগ লিংক, সার্ভিস মোড ও পপআপ নোটিশ:</div>

      <label>Telegram Channel URL</label>
      <input type="url" id="cfgTgChannel" placeholder="https://t.me/yourchannel">

      <label>Telegram Support Bot URL</label>
      <input type="url" id="cfgTgSupport" placeholder="https://t.me/yourbot">

      <label>Popup Announcement Title</label>
      <input type="text" id="cfgPopupTitle" placeholder="যেমন: নতুন আপডেট প্রকাশ হয়েছে!">

      <label>Popup Description</label>
      <textarea id="cfgPopupDesc" rows="2" placeholder="নোটিশের বিস্তারিত লিখুন..."></textarea>

      <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
        <input type="checkbox" id="cfgPopupActive" style="width:auto; margin-bottom:0;">
        <label for="cfgPopupActive" style="margin-bottom:0; cursor:pointer;">Show Popup to All Users</label>
      </div>

      <button class="btn" onclick="saveAppConfig()">Save Settings</button>
    </div>

    <!-- Publish Official Task -->
    <div class="card">
      <div class="card-title">🎯 Publish Official Task</div>
      <div class="card-desc">হোম পেজে দেখানোর জন্য টাস্ক যুক্ত করুন:</div>

      <label>Task Title</label>
      <input type="text" id="taskTitle" placeholder="Join Official Channel">

      <label>Banner Image URL</label>
      <input type="url" id="taskImage" placeholder="https://i.ibb.co/banner.jpg">

      <label>Tag Badge</label>
      <input type="text" id="taskBadge" placeholder="HOT, FREE, REWARD">

      <label>Target Action Link</label>
      <input type="text" id="taskLink" placeholder="https://t.me/...">

      <label>Description / Bio</label>
      <input type="text" id="taskDesc" placeholder="টাস্কটি সম্পন্ন করে বোনাস কোড নিন...">

      <label>Reward Source Code (ঐচ্ছিক HTML)</label>
      <textarea id="taskRewardHtml" rows="3" placeholder="<!DOCTYPE html> ..."></textarea>

      <button class="btn" onclick="publishTask()">Publish Task</button>
    </div>

    <!-- Publish Codes -->
    <div class="card">
      <div class="card-title">📦 Publish Code / Template</div>
      <label>Project Title</label>
      <input type="text" id="projTitle" placeholder="Bio Link Page Template">

      <label>Category Tag</label>
      <input type="text" id="projTag" placeholder="PRO, BIO, FREE">

      <label>Description</label>
      <input type="text" id="projDesc" placeholder="প্রজেক্ট সম্পর্কে বিবরণ...">

      <label>Source Code (HTML)</label>
      <textarea id="projHtml" rows="4" placeholder="<!DOCTYPE html> ..."></textarea>

      <button class="btn" onclick="publishProject()">Publish Code</button>
    </div>

    <!-- All User Domains Control -->
    <div class="card">
      <div class="card-title">🌐 All User Hosted Domains</div>
      <div id="allDomainsList"><div style="text-align:center; color:#8E8E93; padding:15px;">লোড হচ্ছে...</div></div>
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
      if (document.getElementById('passCode').value === "${ADMIN_PASS}") {
        document.getElementById('lockGate').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadAdminData();
      } else {
        alert("ভুল পাসওয়ার্ড!");
      }
    }

    function loadAdminData() {
      db.ref('app_config').once('value', snap => {
        const c = snap.val();
        if (c) {
          document.getElementById('cfgTgChannel').value = c.tgChannel || '';
          document.getElementById('cfgTgSupport').value = c.tgSupport || '';
          document.getElementById('cfgPopupTitle').value = c.popupTitle || '';
          document.getElementById('cfgPopupDesc').value = c.popupDesc || '';
          document.getElementById('cfgPopupActive').checked = !!c.popupActive;
        }
      });

      db.ref('pages').on('value', snap => {
        const data = snap.val();
        const list = document.getElementById('allDomainsList');
        if (!data) { list.innerHTML = '<div style="text-align:center; color:#8E8E93; padding:15px;">কোনো ডোমেন নেই।</div>'; return; }
        let html = '';
        Object.keys(data).forEach(k => {
          const item = data[k];
          html += \`
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; margin-bottom:6px;">
              <div>
                <a href="/sjemar/\${item.slug}" target="_blank" style="color:#fff; text-decoration:none; font-weight:700; font-size:12px;">/\${item.slug}</a>
                <div style="font-size:10px; color:#8E8E93;">👁️ \${item.views || 0} views</div>
              </div>
              <button onclick="adminDeleteDomain('\${item.slug}')" style="background:#EF4444; color:#fff; border:none; padding:5px 10px; border-radius:8px; font-size:10px; font-weight:700; cursor:pointer;">Delete</button>
            </div>
          \`;
        });
        list.innerHTML = html;
      });
    }

    function saveAppConfig() {
      db.ref('app_config').update({
        tgChannel: document.getElementById('cfgTgChannel').value,
        tgSupport: document.getElementById('cfgTgSupport').value,
        popupTitle: document.getElementById('cfgPopupTitle').value,
        popupDesc: document.getElementById('cfgPopupDesc').value,
        popupActive: document.getElementById('cfgPopupActive').checked
      }, err => { if (!err) alert("✅ সেটিংস সংরক্ষিত হয়েছে!"); });
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
          alert("✅ টাস্ক পাবলিশ হয়েছে!");
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
      if (!title || !htmlCode) return alert("টাইটেল ও কোড দিন!");

      db.ref('projects').push({ title, tag, description, htmlCode, createdAt: Date.now() }, err => {
        if (!err) {
          alert("✅ কোড পাবলিশ হয়েছে!");
          document.getElementById('projTitle').value = '';
          document.getElementById('projDesc').value = '';
          document.getElementById('projHtml').value = '';
        }
      });
    }

    function adminDeleteDomain(slug) {
      if (!confirm("ডোমেনটি ডিলিট করতে চান?")) return;
      db.ref('pages/' + slug).remove();
    }
  </script>
</body>
</html>`);
});

app.get('/admin', (req, res) => res.redirect('/roter'));

// ==========================================
// ৩. ডাইনামিক পেজ রেন্ডার ইঞ্জিন (/sjemar/:slug & /:slug)
// ==========================================
async function renderPage(req, res, rawSlug) {
  try {
    const slug = rawSlug.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
    if (['roter', 'admin', 'api'].includes(slug)) return;

    const response = await fetch(`${FIREBASE_DB_URL}/pages/${slug}.json`);
    const pageData = await response.json();

    if (!pageData || !pageData.htmlContent) {
      return res.status(404).send("<h1 style='background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:50px;'>404 - Domain Not Found</h1>");
    }

    if (pageData.expiresAt && Date.now() > pageData.expiresAt) {
      return res.status(410).send("<h1 style='background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:50px;'>⏳ Domain Has Expired</h1>");
    }

    if (pageData.isPublic === false) {
      return res.status(403).send("<h1 style='background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:50px;'>🔒 This Domain is Private</h1>");
    }

    // ভিউ কাউন্টার +১ বৃদ্ধি
    fetch(`${FIREBASE_DB_URL}/pages/${slug}/views.json`, {
      method: 'PUT',
      body: JSON.stringify((pageData.views || 0) + 1)
    }).catch(() => {});

    let finalHtml = pageData.htmlContent;

    // Show HTML for visitor widget
    if (pageData.showSource) {
      const codeStr = encodeURIComponent(pageData.htmlContent);
      finalHtml += `
        <div style="position:fixed; bottom:14px; left:50%; transform:translateX(-50%); z-index:99999; background:rgba(14,14,18,0.85); backdrop-filter:blur(30px); -webkit-backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,0.12); border-radius:24px; padding:6px 14px; display:flex; align-items:center; gap:10px; font-family:-apple-system, sans-serif; box-shadow:0 10px 30px rgba(0,0,0,0.8);">
          <span style="font-size:10px; font-weight:800; color:#60A5FA;">⚡ SJEMAR</span>
          <button onclick="navigator.clipboard.writeText(decodeURIComponent('${codeStr}')); alert('✅ HTML সোর্স কোড কপি হয়েছে!');" style="background:linear-gradient(135deg, #0A84FF, #BF5AF2); border:none; color:#fff; font-size:10px; font-weight:700; padding:5px 10px; border-radius:12px; cursor:pointer;">
            Copy HTML
          </button>
        </div>
      `;
    }

    res.set('Content-Type', 'text/html');
    res.send(finalHtml);
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
}

app.get('/sjemar/:slug', (req, res) => renderPage(req, res, req.params.slug));
app.get('/:slug', (req, res) => renderPage(req, res, req.params.slug));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 SJEMAR iOS Engine running on ' + PORT));
