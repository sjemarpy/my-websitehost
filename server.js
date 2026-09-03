const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();

app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(bodyParser.json({ limit: '100mb' }));

const FIREBASE_DB_URL = "https://sifatby-38886-default-rtdb.firebaseio.com";
const ADMIN_PASS = "py.py.php";

// Helper function to fetch Firebase via REST API
function firebaseFetch(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + (parsedUrl.search || ''),
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : null);
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// ==========================================
// ১. ইউজার পেজ (OLED Pitch Black + Pure SVG)
// ==========================================
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>SJEMAR Cloud Engine</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(10, 10, 14, 0.8);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #2563EB;
      --accent-glow: rgba(37, 99, 235, 0.35);
      --text: #FFFFFF;
      --text-muted: #71717A;
      --text-sub: #A1A1AA;
      --border-subtle: rgba(255, 255, 255, 0.05);
      --danger: #EF4444;
      --success: #10B981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: #000000 !important; color: var(--text); min-height: 100vh; padding-bottom: 110px; overflow-x: hidden; position: relative; }

    .header { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(35px); -webkit-backdrop-filter: blur(35px); background: rgba(0, 0, 0, 0.85); border-bottom: 1px solid var(--card-border); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
    .brand-wrap { display: flex; align-items: center; gap: 10px; }
    .brand-logo { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, #2563EB, #7C3AED); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px var(--accent-glow); }
    .brand-logo svg { width: 18px; height: 18px; stroke: #fff; stroke-width: 2.5; fill: none; }
    .brand-title { font-size: 17px; font-weight: 800; letter-spacing: -0.4px; color: #FFFFFF; }
    .status-badge { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 16px; background: rgba(37,99,235,0.12); color: #60A5FA; border: 1px solid rgba(37,99,235,0.3); display: flex; align-items: center; gap: 6px; }
    .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: #3B82F6; box-shadow: 0 0 8px #3B82F6; animation: pulse 1.8s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    .container { max-width: 480px; margin: 0 auto; padding: 18px 14px; position: relative; z-index: 10; }
    .tab-view { display: none; }
    .tab-view.active { display: block; animation: oledSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes oledSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .glass-card { background: var(--card-bg); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border: 1px solid var(--card-border); border-radius: 22px; padding: 18px; margin-bottom: 16px; box-shadow: 0 20px 45px rgba(0,0,0,0.95); }
    .card-head { font-size: 15px; font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; color: #FFFFFF; }
    .card-head svg { width: 18px; height: 18px; stroke-width: 2.2; flex-shrink: 0; }
    .card-sub { font-size: 12px; color: var(--text-sub); margin-bottom: 16px; line-height: 1.4; }

    .form-group { margin-bottom: 13px; }
    .form-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; display: block; }
    .glass-input, .glass-textarea, .glass-select { width: 100%; background: #000000; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 13px 14px; color: #FFFFFF; font-size: 13px; outline: none; transition: 0.2s; }
    .glass-input:focus, .glass-textarea:focus, .glass-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .glass-textarea { font-family: 'JetBrains Mono', monospace; font-size: 12px; resize: vertical; }

    .toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(255,255,255,0.02); border-radius: 14px; border: 1px solid var(--border-subtle); margin-bottom: 10px; }
    .toggle-text-title { font-size: 12px; font-weight: 600; color: #FFFFFF; }
    .toggle-text-desc { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
    .ios-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .ios-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.15); transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 30px; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: #FFFFFF; transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 50%; }
    input:checked + .slider { background: var(--accent); }
    input:checked + .slider:before { transform: translateX(20px); }

    .glass-btn { width: 100%; padding: 13px; border-radius: 14px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; text-decoration: none; transition: 0.15s; }
    .glass-btn svg { width: 16px; height: 16px; stroke-width: 2.2; flex-shrink: 0; }
    .btn-gradient { background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%); color: #FFFFFF; box-shadow: 0 6px 20px var(--accent-glow); }
    .btn-gradient:active { transform: scale(0.98); opacity: 0.9; }
    .btn-subtle { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: #FFFFFF; }
    .btn-subtle:active { transform: scale(0.98); background: rgba(255,255,255,0.1); }

    .oled-item { background: #050508; border: 1px solid var(--card-border); border-radius: 16px; padding: 14px; margin-bottom: 12px; }
    .oled-item.pinned { border: 1px solid rgba(245, 158, 11, 0.35); background: rgba(20, 16, 6, 0.5); }
    .badge { font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 6px; letter-spacing: 0.3px; display: inline-flex; align-items: center; gap: 4px; }
    .badge svg { width: 11px; height: 11px; stroke-width: 2.5; }

    .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .contact-item { background: #050508; border: 1px solid var(--card-border); border-radius: 14px; padding: 12px; display: flex; align-items: center; gap: 10px; text-decoration: none; color: #FFFFFF; transition: 0.15s; }
    .contact-item:active { transform: scale(0.98); border-color: rgba(255,255,255,0.2); }
    .contact-icon-box { width: 34px; height: 34px; border-radius: 10px; background: rgba(37,99,235,0.15); border: 1px solid rgba(37,99,235,0.3); display: flex; align-items: center; justify-content: center; }
    .contact-icon-box svg { width: 17px; height: 17px; stroke: #60A5FA; stroke-width: 2.2; fill: none; }

    .dock-wrapper { position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); width: calc(100% - 24px); max-width: 440px; z-index: 50; }
    .dock-bar { background: rgba(8, 8, 10, 0.9); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 28px; padding: 6px 8px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; box-shadow: 0 20px 50px rgba(0,0,0,0.95); }
    .dock-item { background: transparent; border: none; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; padding: 6px 0; border-radius: 18px; transition: 0.15s; text-decoration: none; min-width: 0; }
    .dock-item svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2; flex-shrink: 0; }
    .dock-text { font-size: 9.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .dock-item.active { color: #60A5FA; background: rgba(37,99,235,0.15); }
    .dock-item.active svg { stroke: #60A5FA; }

    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(30px); z-index: 200; display: none; align-items: center; justify-content: center; padding: 18px; }
    .modal-box { background: #050508; border: 1px solid var(--card-border); border-radius: 22px; padding: 22px; max-width: 340px; width: 100%; text-align: center; }

    .loader-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); backdrop-filter: blur(35px); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 300; }
    .oled-spinner { width: 38px; height: 38px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #2563EB; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 14px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="noticeModal" class="modal-backdrop">
    <div class="modal-box">
      <div style="width:44px; height:44px; border-radius:14px; background:rgba(37,99,235,0.15); border:1px solid rgba(37,99,235,0.3); display:flex; align-items:center; justify-content:center; margin:0 auto 12px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      </div>
      <h3 id="popupTitle" style="font-size:16px; font-weight:800; margin-bottom:6px;">Notice</h3>
      <p id="popupDesc" style="font-size:12px; color:var(--text-sub); margin-bottom:18px; line-height:1.4;"></p>
      <button class="glass-btn btn-gradient" onclick="closeNotice()">Understood</button>
    </div>
  </div>

  <div id="loaderModal" class="loader-layer">
    <div class="oled-spinner"></div>
    <div id="loadingStatusText" style="font-size: 12px; font-weight: 600; color: #93C5FD;">Processing...</div>
  </div>

  <header class="header">
    <div class="brand-wrap">
      <div class="brand-logo">
        <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      </div>
      <span class="brand-title">SJEMAR</span>
    </div>
    <div class="status-badge">
      <div class="pulse-dot"></div>
      <span>PRO ENGINE</span>
    </div>
  </header>

  <main class="container">
    <section id="tab-home" class="tab-view active">
      <div class="glass-card">
        <div class="card-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Official Tasks
        </div>
        <div class="card-sub">নিচের টাস্কগুলো সম্পন্ন করে সোর্স কোড আনলক করুন:</div>
        <div id="homeTasksList"><div style="text-align:center; color:var(--text-muted); padding:20px; font-size:12px;">টাস্ক লোড হচ্ছে...</div></div>
      </div>

      <div class="glass-card">
        <div class="card-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="#A855F7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          যোগাযোগ ও সাপোর্ট
        </div>
        <div class="card-sub">যেকোনো সহায়তার জন্য যুক্ত থাকুন:</div>
        <div class="contact-grid">
          <a id="linkTgChannel" href="https://t.me/" target="_blank" class="contact-item">
            <div class="contact-icon-box">
              <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </div>
            <div>
              <div style="font-size:12px; font-weight:700;">Telegram</div>
              <div style="font-size:10px; color:var(--text-muted);">Channel</div>
            </div>
          </a>

          <a id="linkTgSupport" href="https://t.me/" target="_blank" class="contact-item">
            <div class="contact-icon-box" style="background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3);">
              <svg viewBox="0 0 24 24" style="stroke: #34D399;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </div>
            <div>
              <div style="font-size:12px; font-weight:700;">Support</div>
              <div style="font-size:10px; color:var(--text-muted);">Live Chat</div>
            </div>
          </a>
        </div>
      </div>
    </section>

    <section id="tab-host" class="tab-view">
      <div class="glass-card">
        <div class="card-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Deploy Custom Web Page
        </div>
        <div class="card-sub">আপনার নিজস্ব Slug ও কোড দিয়ে লাইভ ওয়েব ডোমেন তৈরি করুন।</div>

        <div class="form-group">
          <label class="form-label">Custom Slug (ডোমেইন নাম)</label>
          <input type="text" id="domainSlug" class="glass-input" placeholder="যেমন: event-2026, my-portfolio">
        </div>

        <div class="form-group">
          <label class="form-label">Bio / ছোট বিবরণ</label>
          <input type="text" id="domainBio" class="glass-input" placeholder="যেমন: Official Bio & Portfolio">
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

        <div class="toggle-row">
          <div>
            <div class="toggle-text-title">Show HTML Source to Visitor</div>
            <div class="toggle-text-desc">ভিজিটররা পেজে কোড কপি উইজেট পাবে</div>
          </div>
          <label class="ios-switch">
            <input type="checkbox" id="domainShowSource" checked>
            <span class="slider"></span>
          </label>
        </div>

        <div class="toggle-row">
          <div>
            <div class="toggle-text-title">Make Link Public</div>
            <div class="toggle-text-desc">সরাসরি সবার জন্য উন্মুক্ত থাকবে</div>
          </div>
          <label class="ios-switch">
            <input type="checkbox" id="domainIsPublic" checked>
            <span class="slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">HTML / CSS / JS Code</label>
          <textarea id="domainHtml" class="glass-textarea" rows="7" placeholder="<!DOCTYPE html>&#10;<html>&#10;  <body>&#10;    <h1>Live Site</h1>&#10;  </body>&#10;</html>"></textarea>
        </div>

        <button class="glass-btn btn-gradient" onclick="handleDeploy()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Deploy Link Now
        </button>

        <div id="resultBox" style="display:none; margin-top:14px; padding:14px; background:rgba(37,99,235,0.12); border:1px solid rgba(37,99,235,0.3); border-radius:16px; text-align:center;">
          <div style="font-size:10px; color:#93C5FD; margin-bottom:4px; font-weight:800; text-transform:uppercase;">DEPLOYED URL READY:</div>
          <a id="resultUrl" href="" target="_blank" style="color:#fff; font-weight:700; word-break:break-all; font-size:13px; text-decoration:underline;"></a>
        </div>
      </div>
    </section>

    <section id="tab-mylinks" class="tab-view">
      <div class="glass-card">
        <div class="card-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="#60A5FA"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          My Created Links
        </div>
        <div class="card-sub">আপনার তৈরি করা সকল লিংক ও লাইভ ভিউ স্ট্যাটাস:</div>
        <div id="myLinksContainer">
          <div style="text-align:center; color:var(--text-muted); padding:25px; font-size:12px;">কোনো লিংক তৈরি করা হয়নি।</div>
        </div>
      </div>
    </section>

    <section id="tab-codes" class="tab-view">
      <div class="glass-card">
        <div class="card-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="#A855F7"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          Templates & Source Codes
        </div>
        <div class="card-sub">রেডিমেড প্রজেক্ট সোর্স কোড ১-ক্লিকে কপি করুন:</div>
        <div id="projectsListContainer"><div style="text-align:center; color:var(--text-muted); padding:20px; font-size:12px;">লোড হচ্ছে...</div></div>
      </div>
    </section>
  </main>

  <div class="dock-wrapper">
    <nav class="dock-bar">
      <button class="dock-item active" onclick="switchNav('home', this)">
        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span class="dock-text">Home</span>
      </button>
      <button class="dock-item" onclick="switchNav('host', this)">
        <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <span class="dock-text">Host</span>
      </button>
      <button class="dock-item" onclick="switchNav('mylinks', this)">
        <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <span class="dock-text">Links</span>
      </button>
      <button class="dock-item" onclick="switchNav('codes', this)">
        <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <span class="dock-text">Codes</span>
      </button>
      <a href="/roter" class="dock-item" title="Router Gate">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span class="dock-text">#roter#</span>
      </a>
    </nav>
  </div>

  <script>
    var firebaseConfig = {
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
    var db = firebase.database();

    var myLocalSlugs = JSON.parse(localStorage.getItem('sjemar_my_slugs') || '[]');

    window.onload = function() {
      loadHomeTasks();
      loadAppConfig();
    };

    function switchNav(tab, el) {
      document.querySelectorAll('.tab-view').forEach(function(p) { p.classList.remove('active'); });
      document.querySelectorAll('.dock-item').forEach(function(t) { t.classList.remove('active'); });
      document.getElementById('tab-' + tab).classList.add('active');
      if (el) el.classList.add('active');

      if (tab === 'home') loadHomeTasks();
      if (tab === 'mylinks') renderMyLinks();
      if (tab === 'codes') loadCodes();
    }

    function loadAppConfig() {
      db.ref('app_config').on('value', function(snap) {
        var c = snap.val();
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
      var container = document.getElementById('homeTasksList');
      db.ref('tasks').on('value', function(snap) {
        var data = snap.val();
        if (!data) {
          container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:16px; font-size:12px;">কোনো সক্রিয় টাস্ক নেই।</div>';
          return;
        }
        var html = '';
        Object.keys(data).forEach(function(k) {
          var t = data[k];
          html += '<div class="oled-item">' +
            (t.image ? '<img src="' + t.image + '" style="width:100%; height:110px; object-fit:cover; border-radius:12px; margin-bottom:10px;" onerror="this.style.display=\\'none\\'">' : '') +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
              '<b style="font-size:14px; color:#fff;">' + (t.title || 'Task') + '</b>' +
              '<span class="badge" style="background:rgba(16,185,129,0.15); color:#34D399; border:1px solid rgba(16,185,129,0.3);">' + (t.badge || 'HOT') + '</span>' +
            '</div>' +
            '<p style="font-size:12px; color:var(--text-sub); margin-bottom:12px; line-height:1.4;">' + (t.description || '') + '</p>' +
            '<div style="display:flex; gap:8px;">' +
              '<a href="' + (t.link || '#') + '" target="_blank" class="glass-btn btn-gradient" style="padding:9px; font-size:12px; flex:1;">Open Task</a>' +
              (t.rewardHtml ? '<button onclick="copyCode(\\'' + encodeURIComponent(t.rewardHtml) + '\\')" class="glass-btn btn-subtle" style="padding:9px; font-size:12px;">Get Code</button>' : '') +
            '</div>' +
          '</div>';
        });
        container.innerHTML = html;
      });
    }

    function handleDeploy() {
      var slugInput = document.getElementById('domainSlug').value.trim();
      var bio = document.getElementById('domainBio').value.trim();
      var photo = document.getElementById('domainPhoto').value.trim();
      var expiryDays = parseInt(document.getElementById('domainExpiry').value) || 365;
      var showSource = document.getElementById('domainShowSource').checked;
      var isPublic = document.getElementById('domainIsPublic').checked;
      var htmlContent = document.getElementById('domainHtml').value;

      if (!slugInput || !htmlContent) return alert("Slug এবং HTML কোড দিন!");

      var cleanSlug = slugInput.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
      var loader = document.getElementById('loaderModal');
      loader.style.display = 'flex';

      var expiresAt = Date.now() + (expiryDays * 24 * 60 * 60 * 1000);

      db.ref('pages/' + cleanSlug).set({
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
      }).then(function() {
        if (!myLocalSlugs.includes(cleanSlug)) {
          myLocalSlugs.push(cleanSlug);
          localStorage.setItem('sjemar_my_slugs', JSON.stringify(myLocalSlugs));
        }
        setTimeout(function() {
          loader.style.display = 'none';
          var fullUrl = window.location.origin + '/sjemar/' + cleanSlug;
          document.getElementById('resultBox').style.display = 'block';
          var linkElem = document.getElementById('resultUrl');
          linkElem.href = fullUrl;
          linkElem.innerText = fullUrl;
        }, 500);
      }).catch(function(err) {
        loader.style.display = 'none';
        alert('Error: ' + err.message);
      });
    }

    function renderMyLinks() {
      var container = document.getElementById('myLinksContainer');
      if (myLocalSlugs.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:25px; font-size:12px;">কোনো লিংক তৈরি করা হয়নি।</div>';
        return;
      }

      container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:15px; font-size:12px;">লোড হচ্ছে...</div>';
      var promises = myLocalSlugs.map(function(slug) { return db.ref('pages/' + slug).once('value'); });

      Promise.all(promises).then(function(snapshots) {
        var links = [];
        snapshots.forEach(function(s) { if (s.exists()) links.push(s.val()); });

        if (links.length === 0) {
          container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:25px; font-size:12px;">কোনো সক্রিয় লিংক নেই।</div>';
          return;
        }

        links.sort(function(a, b) { return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0); });

        var html = '';
        links.forEach(function(item) {
          var fullUrl = window.location.origin + '/sjemar/' + item.slug;
          var daysLeft = Math.max(0, Math.ceil((item.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));

          html += '<div class="oled-item ' + (item.isPinned ? 'pinned' : '') + '">' +
            (item.isPinned ? '<div style="font-size:9px; font-weight:800; color:#FBBF24; margin-bottom:4px;">★ PINNED</div>' : '') +
            (item.photo ? '<img src="' + item.photo + '" style="width:100%; height:100px; object-fit:cover; border-radius:12px; margin-bottom:8px;" onerror="this.style.display=\\'none\\'">' : '') +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
              '<b style="font-size:15px; color:#fff;">/' + item.slug + '</b>' +
              '<span class="badge" style="background:' + (item.isPublic ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') + '; color:' + (item.isPublic ? '#34D399' : '#F87171') + ';">' + (item.isPublic ? 'PUBLIC' : 'PRIVATE') + '</span>' +
            '</div>' +
            '<p style="font-size:11px; color:var(--text-sub); margin-bottom:10px;">' + (item.bio || '') + '</p>' +
            '<div style="display:flex; gap:8px; margin-bottom:10px; font-size:11px;">' +
              '<span style="background:rgba(255,255,255,0.04); border:1px solid var(--card-border); padding:3px 8px; border-radius:8px;">👁️ <b>' + (item.views || 0) + '</b> Views</span>' +
              '<span style="background:rgba(255,255,255,0.04); border:1px solid var(--card-border); padding:3px 8px; border-radius:8px;">⏳ <b>' + daysLeft + '</b> Days</span>' +
            '</div>' +
            '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:6px;">' +
              '<button onclick="togglePin(\\'' + item.slug + '\\', ' + (!item.isPinned) + ')" class="glass-btn btn-subtle" style="padding:8px; font-size:11px;">' + (item.isPinned ? 'Unpin' : 'Pin') + '</button>' +
              '<button onclick="togglePublic(\\'' + item.slug + '\\', ' + (!item.isPublic) + ')" class="glass-btn btn-subtle" style="padding:8px; font-size:11px;">' + (item.isPublic ? 'Private' : 'Public') + '</button>' +
            '</div>' +
            '<div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px;">' +
              '<a href="' + fullUrl + '" target="_blank" class="glass-btn btn-gradient" style="padding:8px; font-size:11px;">Visit ↗</a>' +
              '<button onclick="editMyLink(\\'' + item.slug + '\\')" class="glass-btn btn-subtle" style="padding:8px; font-size:11px;">Edit</button>' +
              '<button onclick="deleteMyLink(\\'' + item.slug + '\\')" class="glass-btn btn-subtle" style="padding:8px; font-size:11px; color:#EF4444;">Delete</button>' +
            '</div>' +
          '</div>';
        });
        container.innerHTML = html;
      });
    }

    function togglePin(slug, s) { db.ref('pages/' + slug + '/isPinned').set(s).then(renderMyLinks); }
    function togglePublic(slug, s) { db.ref('pages/' + slug + '/isPublic').set(s).then(renderMyLinks); }
    function deleteMyLink(slug) {
      if (!confirm("ডোমেনটি ডিলিট করতে চান?")) return;
      db.ref('pages/' + slug).remove().then(function() {
        myLocalSlugs = myLocalSlugs.filter(function(s) { return s !== slug; });
        localStorage.setItem('sjemar_my_slugs', JSON.stringify(myLocalSlugs));
        renderMyLinks();
      });
    }

    function editMyLink(slug) {
      db.ref('pages/' + slug).once('value').then(function(s) {
        var item = s.val();
        if (!item) return;
        var newBio = prompt("নতুন Bio দিন:", item.bio || "");
        var newHtml = prompt("নতুন HTML কোড পেস্ট করুন:", item.htmlContent || "");
        if (newHtml !== null) {
          db.ref('pages/' + slug).update({ bio: newBio !== null ? newBio : item.bio, htmlContent: newHtml }).then(function() {
            alert("লিংক আপডেট সম্পন্ন হয়েছে!");
            renderMyLinks();
          });
        }
      });
    }

    function loadCodes() {
      var container = document.getElementById('projectsListContainer');
      db.ref('projects').on('value', function(snap) {
        var data = snap.val();
        if (!data) {
          container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px; font-size:12px;">কোনো কোড পাওয়া যায়নি।</div>';
          return;
        }
        var html = '';
        Object.keys(data).forEach(function(k) {
          var p = data[k];
          html += '<div class="oled-item">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
              '<b style="font-size:14px; color:#fff;">' + (p.title || 'Code') + '</b>' +
              '<span class="badge" style="background:rgba(168,85,247,0.15); color:#C084FC;">' + (p.tag || 'HOT') + '</span>' +
            '</div>' +
            '<p style="font-size:11px; color:var(--text-sub); margin-bottom:12px;">' + (p.description || '') + '</p>' +
            '<button onclick="copyCode(\\'' + encodeURIComponent(p.htmlCode || '') + '\\')" class="glass-btn btn-subtle" style="padding:9px; font-size:12px;">Copy Code</button>' +
          '</div>';
        });
        container.innerHTML = html;
      });
    }

    function copyCode(encoded) {
      navigator.clipboard.writeText(decodeURIComponent(encoded));
      alert("সোর্স কোড সফলভাবে কপি করা হয়েছে!");
    }
  </script>
</body>
</html>`);
});

// ==========================================
// ২. সিক্রেট এডমিন প্যানেল (/roter)
// ==========================================
app.get('/roter', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>#roter# • Master Console</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
    body { background: #000000 !important; color: #FFFFFF; min-height: 100vh; padding: 20px 14px 80px; }
    .card { background: #050508; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; margin-bottom: 16px; max-width: 480px; margin-left: auto; margin-right: auto; }
    .card-title { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
    .card-desc { font-size: 11px; color: #71717A; margin-bottom: 14px; }
    label { font-size: 10px; font-weight: 700; color: #71717A; text-transform: uppercase; margin-bottom: 5px; display: block; }
    input, textarea, select { width: 100%; background: #000000; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px; color: #fff; font-size: 13px; outline: none; margin-bottom: 12px; }
    textarea { font-family: 'JetBrains Mono', monospace; }
    .btn { width: 100%; padding: 13px; border-radius: 14px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; background: linear-gradient(135deg, #2563EB, #7C3AED); color: #fff; }
    .lock-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000000; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .lock-card { background: #050508; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 28px 20px; width: 100%; max-width: 320px; text-align: center; }
  </style>
</head>
<body>
  <div id="lockGate" class="lock-screen">
    <div class="lock-card">
      <div style="font-size:17px; font-weight:800; margin-bottom:4px;">#roter# Access Gate</div>
      <div style="font-size:11px; color:#71717A; margin-bottom:16px;">সঠিক মাস্টার পাসওয়ার্ড দিন</div>
      <input type="password" id="passCode" placeholder="••••••••" style="text-align:center; font-size:16px; letter-spacing:3px;">
      <button class="btn" onclick="unlockAdmin()">Unlock Master Console</button>
      <a href="/" style="display:block; margin-top:14px; font-size:11px; color:#71717A; text-decoration:none;">ইউজার পেজে ফিরে যান ↗</a>
    </div>
  </div>

  <div id="adminPanel" style="display:none; max-width:480px; margin:auto;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h2 style="font-size:18px; font-weight:800; color:#FFFFFF;">#ROTER# MASTER ADMIN</h2>
      <a href="/" style="color:#60A5FA; font-size:11px; text-decoration:none; font-weight:700;">View App ↗</a>
    </div>

    <div class="card">
      <div class="card-title">App Service & Support Links</div>
      <div class="card-desc">যোগাযোগ লিংক ও পপআপ নোটিশ সেটিংস:</div>

      <label>Telegram Channel URL</label>
      <input type="url" id="cfgTgChannel" placeholder="https://t.me/yourchannel">

      <label>Telegram Support Bot URL</label>
      <input type="url" id="cfgTgSupport" placeholder="https://t.me/yourbot">

      <label>Popup Announcement Title</label>
      <input type="text" id="cfgPopupTitle" placeholder="যেমন: নতুন সিস্টেম আপডেট!">

      <label>Popup Description</label>
      <textarea id="cfgPopupDesc" rows="2" placeholder="নোটিশের বিস্তারিত লিখুন..."></textarea>

      <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
        <input type="checkbox" id="cfgPopupActive" style="width:auto; margin-bottom:0;">
        <label for="cfgPopupActive" style="margin-bottom:0; cursor:pointer;">Show Popup to All Users</label>
      </div>

      <button class="btn" onclick="saveAppConfig()">Save Settings</button>
    </div>

    <div class="card">
      <div class="card-title">Publish Official Task</div>
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

    <div class="card">
      <div class="card-title">Publish Code / Template</div>
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

    <div class="card">
      <div class="card-title">All User Hosted Domains</div>
      <div id="allDomainsList"><div style="text-align:center; color:#71717A; padding:15px;">লোড হচ্ছে...</div></div>
    </div>
  </div>

  <script>
    var firebaseConfig = {
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
    var db = firebase.database();

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
      db.ref('app_config').once('value', function(snap) {
        var c = snap.val();
        if (c) {
          document.getElementById('cfgTgChannel').value = c.tgChannel || '';
          document.getElementById('cfgTgSupport').value = c.tgSupport || '';
          document.getElementById('cfgPopupTitle').value = c.popupTitle || '';
          document.getElementById('cfgPopupDesc').value = c.popupDesc || '';
          document.getElementById('cfgPopupActive').checked = !!c.popupActive;
        }
      });

      db.ref('pages').on('value', function(snap) {
        var data = snap.val();
        var list = document.getElementById('allDomainsList');
        if (!data) { list.innerHTML = '<div style="text-align:center; color:#71717A; padding:15px;">কোনো ডোমেন নেই।</div>'; return; }
        var html = '';
        Object.keys(data).forEach(function(k) {
          var item = data[k];
          html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; margin-bottom:6px;">' +
            '<div>' +
              '<a href="/sjemar/' + item.slug + '" target="_blank" style="color:#fff; text-decoration:none; font-weight:700; font-size:12px;">/' + item.slug + '</a>' +
              '<div style="font-size:10px; color:#71717A;">👁️ ' + (item.views || 0) + ' views</div>' +
            '</div>' +
            '<button onclick="adminDeleteDomain(\\'' + item.slug + '\\')" style="background:#EF4444; color:#fff; border:none; padding:5px 10px; border-radius:8px; font-size:10px; font-weight:700; cursor:pointer;">Delete</button>' +
          '</div>';
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
      }).then(function() { alert("সেটিংস সংরক্ষিত হয়েছে!"); });
    }

    function publishTask() {
      var title = document.getElementById('taskTitle').value;
      var image = document.getElementById('taskImage').value;
      var badge = document.getElementById('taskBadge').value || 'HOT';
      var link = document.getElementById('taskLink').value;
      var description = document.getElementById('taskDesc').value;
      var rewardHtml = document.getElementById('taskRewardHtml').value;
      if (!title || !link) return alert("টাস্ক নাম ও লিংক দিন!");

      db.ref('tasks').push({ title: title, image: image, badge: badge, link: link, description: description, rewardHtml: rewardHtml, createdAt: Date.now() }).then(function() {
        alert("টাস্ক পাবলিশ হয়েছে!");
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskImage').value = '';
        document.getElementById('taskLink').value = '';
        document.getElementById('taskDesc').value = '';
        document.getElementById('taskRewardHtml').value = '';
      });
    }

    function publishProject() {
      var title = document.getElementById('projTitle').value;
      var tag = document.getElementById('projTag').value || 'PRO';
      var description = document.getElementById('projDesc').value;
      var htmlCode = document.getElementById('projHtml').value;
      if (!title || !htmlCode) return alert("টাইটেল ও কোড দিন!");

      db.ref('projects').push({ title: title, tag: tag, description: description, htmlCode: htmlCode, createdAt: Date.now() }).then(function() {
        alert("কোড পাবলিশ হয়েছে!");
        document.getElementById('projTitle').value = '';
        document.getElementById('projDesc').value = '';
        document.getElementById('projHtml').value = '';
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
// ৩. ডাইনামিক পেজ রেন্ডার ইঞ্জিন
// ==========================================
async function renderPage(req, res, rawSlug) {
  try {
    const slug = rawSlug.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
    if (['roter', 'admin', 'api'].includes(slug)) return;

    const pageData = await firebaseFetch(`${FIREBASE_DB_URL}/pages/${slug}.json`);

    if (!pageData || !pageData.htmlContent) {
      return res.status(404).send("<h1 style='background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:50px;'>404 - Domain Not Found</h1>");
    }

    if (pageData.expiresAt && Date.now() > pageData.expiresAt) {
      return res.status(410).send("<h1 style='background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:50px;'>Domain Has Expired</h1>");
    }

    if (pageData.isPublic === false) {
      return res.status(403).send("<h1 style='background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:50px;'>This Domain is Private</h1>");
    }

    // ভিউ বৃদ্ধি
    firebaseFetch(`${FIREBASE_DB_URL}/pages/${slug}/views.json`, 'PUT', (pageData.views || 0) + 1).catch(() => {});

    let finalHtml = pageData.htmlContent;

    if (pageData.showSource) {
      const codeStr = encodeURIComponent(pageData.htmlContent);
      finalHtml += `
        <div style="position:fixed; bottom:14px; left:50%; transform:translateX(-50%); z-index:99999; background:rgba(8,8,10,0.9); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,0.12); border-radius:24px; padding:6px 14px; display:flex; align-items:center; gap:10px; font-family:-apple-system, sans-serif;">
          <span style="font-size:10px; font-weight:800; color:#60A5FA;">SJEMAR</span>
          <button onclick="navigator.clipboard.writeText(decodeURIComponent('${codeStr}')); alert('HTML কপি হয়েছে!');" style="background:linear-gradient(135deg, #2563EB, #7C3AED); border:none; color:#fff; font-size:10px; font-weight:700; padding:5px 10px; border-radius:12px; cursor:pointer;">
            Copy HTML
          </button>
        </div>
      `;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(finalHtml);
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
}

app.get('/sjemar/:slug', (req, res) => renderPage(req, res, req.params.slug));
app.get('/:slug', (req, res) => renderPage(req, res, req.params.slug));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('SJEMAR Engine live on port ' + PORT));
