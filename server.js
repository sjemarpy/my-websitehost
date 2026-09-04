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
// ১. ইউজার ও অ্যাডমিন পেজ (OLED Pitch Black + Pure SVG)
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
    .card-head svg { width: 18px; height: 18px; stroke-width: 2.2; flex-shrink: 0; stroke: currentColor; fill: none; }
    .card-sub { font-size: 12px; color: var(--text-sub); margin-bottom: 16px; line-height: 1.4; }

    .form-group { margin-bottom: 13px; }
    .form-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; display: block; }
    .glass-input, .glass-textarea, .glass-select { width: 100%; background: #000000; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 13px 14px; color: #FFFFFF; font-size: 13px; outline: none; transition: 0.2s; }
    .glass-input:focus, .glass-textarea:focus, .glass-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .glass-textarea { font-family: 'JetBrains Mono', monospace; font-size: 12px; resize: vertical; min-height: 80px; }

    .toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(255,255,255,0.02); border-radius: 14px; border: 1px solid var(--border-subtle); margin-bottom: 10px; }
    .toggle-text-title { font-size: 12px; font-weight: 600; color: #FFFFFF; }
    .toggle-text-desc { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

    /* Custom OLED Toggle Switch */
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .3s; border-radius: 24px; border: 1px solid rgba(255,255,255,0.15); }
    .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: var(--accent); }
    input:checked + .slider:before { transform: translateX(20px); }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 13px 18px; border-radius: 14px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: 0.2s; gap: 8px; }
    .btn-primary { background: var(--accent); color: #fff; box-shadow: 0 4px 20px var(--accent-glow); }
    .btn-primary:active { transform: scale(0.98); }
    .btn-secondary { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--card-border); }

    /* Bottom Navigation Bar */
    .bottom-nav { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); max-width: 440px; background: rgba(12, 12, 16, 0.85); backdrop-filter: blur(35px); -webkit-backdrop-filter: blur(35px); border: 1px solid var(--card-border); border-radius: 24px; display: flex; padding: 6px; z-index: 50; box-shadow: 0 15px 35px rgba(0,0,0,0.9); }
    .nav-btn { flex: 1; padding: 10px 0; background: transparent; border: none; color: var(--text-muted); font-size: 10px; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; border-radius: 18px; transition: 0.2s; }
    .nav-btn svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2.2; }
    .nav-btn.active { color: #FFFFFF; background: rgba(255,255,255,0.08); }
  </style>
</head>
<body>

  <!-- Header with Live Pulse Badge -->
  <header class="header">
    <div class="brand-wrap">
      <div class="brand-logo">
        <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      </div>
      <div class="brand-title">SJEMAR Cloud</div>
    </div>
    <div class="status-badge">
      <div class="pulse-dot"></div>
      <span>CONNECTED</span>
    </div>
  </header>

  <div class="container">

    <!-- ট্যাব ১: ক্লাউড ইঞ্জিন / ইউজার ভিউ -->
    <div id="tab-engine" class="tab-view active">
      <div class="glass-card">
        <div class="card-head">
          <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          <span>Realtime Node Engine</span>
        </div>
        <div class="card-sub">ফায়ারবেস ডাটাবেজ নোড রিড ও রাইট কন্ট্রোল।</div>

        <div class="form-group">
          <label class="form-label">Node Path</label>
          <input type="text" id="node-path" class="glass-input" value="configs/app_status" placeholder="e.g. app/settings">
        </div>

        <div class="form-group">
          <label class="form-label">Data Payload</label>
          <textarea id="node-data" class="glass-textarea" placeholder='{"status": true, "version": "2.4.0"}'></textarea>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" onclick="readFirebaseData()">
            <svg style="width:16px; height:16px; stroke:currentColor; fill:none;" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Fetch
          </button>
          <button class="btn btn-primary" onclick="writeFirebaseData()">
            <svg style="width:16px; height:16px; stroke:currentColor; fill:none;" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save
          </button>
        </div>
      </div>

      <!-- Settings Switches -->
      <div class="glass-card">
        <div class="card-head">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Cloud Configuration</span>
        </div>
        <div class="card-sub">অটোমেটিক সিঙ্ক এবং ক্লাউড অপ্টিমাইজেশন।</div>

        <div class="toggle-row">
          <div>
            <div class="toggle-text-title">SSL HTTPS Bypass</div>
            <div class="toggle-text-desc">এনক্রিপ্টেড টানেলের মাধ্যমে হাই-স্পিড ডেটা রিড</div>
          </div>
          <label class="switch">
            <input type="checkbox" checked>
            <span class="slider"></span>
          </label>
        </div>

        <div class="toggle-row">
          <div>
            <div class="toggle-text-title">Auto JSON Parser</div>
            <div class="toggle-text-desc">ইনকামিং পে-লোড অটোমেটিক রূপান্তর</div>
          </div>
          <label class="switch">
            <input type="checkbox" checked>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- ট্যাব ২: কনসোল লগ ভিউ -->
    <div id="tab-logs" class="tab-view">
      <div class="glass-card">
        <div class="card-head">
          <svg viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          <span>Terminal Response</span>
        </div>
        <div class="card-sub">সার্ভার আউটপুট ও রেসপন্স ডাটা।</div>
        <pre id="output-box" style="font-family:'JetBrains Mono', monospace; font-size:11px; background:#000; border:1px solid var(--border-subtle); padding:14px; border-radius:14px; color:#A1A1AA; max-height:260px; overflow:auto; word-break:break-all;">System initialized and listening on port...</pre>
      </div>
    </div>

    <!-- ট্যাব ৩: অ্যাডমিন ও অথেন্টিকেশন -->
    <div id="tab-admin" class="tab-view">
      <div class="glass-card">
        <div class="card-head">
          <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Admin Security Gateway</span>
        </div>
        <div class="card-sub">মাস্টার পাসওয়ার্ড দিয়ে প্রটেক্টেড।</div>

        <div class="form-group">
          <label class="form-label">Master Password</label>
          <input type="password" id="admin-pass" class="glass-input" placeholder="Enter master pass">
        </div>

        <button class="btn btn-primary" onclick="verifyAdmin()">Authenticate</button>
      </div>
    </div>

  </div>

  <!-- Bottom Navigation Bar with Pure SVG -->
  <nav class="bottom-nav">
    <button class="nav-btn active" onclick="switchNav('tab-engine', this)">
      <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
      <span>Engine</span>
    </button>
    <button class="nav-btn" onclick="switchNav('tab-logs', this)">
      <svg viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
      <span>Logs</span>
    </button>
    <button class="nav-btn" onclick="switchNav('tab-admin', this)">
      <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span>Admin</span>
    </button>
  </nav>

  <script>
    function switchNav(tabId, el) {
      document.querySelectorAll('.tab-view').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      if (el) el.classList.add('active');
    }

    async function readFirebaseData() {
      const node = document.getElementById('node-path').value;
      const box = document.getElementById('output-box');
      box.innerText = 'Fetching node data...';
      try {
        const res = await fetch('/api/fetch?node=' + encodeURIComponent(node));
        const data = await res.json();
        box.innerText = JSON.stringify(data, null, 2);
      } catch (e) {
        box.innerText = 'Error: ' + e.message;
      }
    }

    async function writeFirebaseData() {
      const node = document.getElementById('node-path').value;
      const raw = document.getElementById('node-data').value;
      const box = document.getElementById('output-box');
      box.innerText = 'Writing to node...';
      try {
        let payload = raw;
        try { payload = JSON.parse(raw); } catch(err) {}
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node, payload })
        });
        const data = await res.json();
        box.innerText = JSON.stringify(data, null, 2);
      } catch (e) {
        box.innerText = 'Error: ' + e.message;
      }
    }

    function verifyAdmin() {
      const pass = document.getElementById('admin-pass').value;
      if (pass === "${ADMIN_PASS}") {
        alert('Admin Access Granted!');
      } else {
        alert('Invalid Password!');
      }
    }
  </script>
</body>
</html>`);
});

// REST Endpoints for frontend requests
app.get('/api/fetch', async (req, res) => {
  const node = req.query.node || '';
  const result = await firebaseFetch(`${FIREBASE_DB_URL}/${node}.json`, 'GET');
  res.json({ success: true, data: result });
});

app.post('/api/save', async (req, res) => {
  const { node, payload } = req.body;
  const result = await firebaseFetch(`${FIREBASE_DB_URL}/${node}.json`, 'PUT', payload);
  res.json({ success: true, data: result });
});

// Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SJEMAR Cloud Engine Live: http://localhost:${PORT}`);
});
