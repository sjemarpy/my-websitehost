const express = require('express');
const https = require('https');
const os = require('os');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.json({ limit: '100mb' }));

// কনফিগারেশন
const FIREBASE_DB_URL = "https://sifatby-38886-default-rtdb.firebaseio.com";
const ADMIN_PASS = "py.py.php";

// ইন-মেমোরি স্টোরেজ (Logs, API Keys, Rate Limiter)
const auditLogs = [];
const apiKeys = new Set(['sjemar_live_key_9921a']);
const rateLimitMap = new Map();

// ------------------------------------------
// ১. সিকিউরিটি ও হেল্পার মিডলওয়্যার (Rate Limiter)
// ------------------------------------------
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // ১ মিনিট
  const maxRequests = 200;

  let requestRecord = rateLimitMap.get(ip) || { count: 0, startTime: now };
  if (now - requestRecord.startTime > windowMs) {
    requestRecord = { count: 1, startTime: now };
  } else {
    requestRecord.count++;
  }
  rateLimitMap.set(ip, requestRecord);

  if (requestRecord.count > maxRequests) {
    return res.status(429).json({ success: false, message: 'Too many requests. Please cool down.' });
  }
  next();
});

// অ্যাক্টিভিটি লগ হেল্পার
function logActivity(action, details, status = 'SUCCESS') {
  const logItem = {
    id: crypto.randomBytes(4).toString('hex'),
    timestamp: new Date().toLocaleTimeString(),
    date: new Date().toISOString().split('T')[0],
    action,
    details,
    status
  };
  auditLogs.unshift(logItem);
  if (auditLogs.length > 50) auditLogs.pop(); // শেষ ৫০টি লগ রাখা হবে
  return logItem;
}

// ------------------------------------------
// ২. ফায়ারবেস REST API হেল্পার
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
// ৩. ব্যাকএন্ড API এন্ডপয়েন্টসমূহ
// ------------------------------------------

// সিস্টেম হেলথ ও RAM/CPU লাইভ স্ট্যাটাস
app.get('/api/system/health', (req, res) => {
  const memory = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  res.json({
    uptime: Math.floor(process.uptime()),
    ramHeapUsed: (memory.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    systemRamUsage: ((usedMem / totalMem) * 100).toFixed(1),
    cpuCores: os.cpus().length,
    nodeVersion: process.version,
    platform: os.platform() + ' ' + os.arch()
  });
});

// অ্যাক্টিভিটি লগ API
app.get('/api/logs', (req, res) => {
  res.json({ success: true, logs: auditLogs });
});

// ফায়ারবেস ডেটা রিড
app.get('/api/db/read', async (req, res) => {
  try {
    const node = req.query.node || '';
    const result = await firebaseFetch(node, 'GET');
    logActivity('DB_READ', `Read node: /${node}`);
    res.json({ success: true, data: result.data });
  } catch (error) {
    logActivity('DB_READ_ERR', error.message, 'FAILED');
    res.status(500).json({ success: false, message: error.message });
  }
});

// ফায়ারবেস ডেটা রাইট
app.post('/api/db/write', async (req, res) => {
  try {
    const { node, payload } = req.body;
    if (!node) return res.status(400).json({ success: false, message: 'Node path is required' });

    let parsedData = payload;
    if (typeof payload === 'string') {
      try { parsedData = JSON.parse(payload); } catch (e) {}
    }

    const result = await firebaseFetch(node, 'PUT', parsedData);
    logActivity('DB_WRITE', `Updated node: /${node}`);
    res.json({ success: true, data: result.data });
  } catch (error) {
    logActivity('DB_WRITE_ERR', error.message, 'FAILED');
    res.status(500).json({ success: false, message: error.message });
  }
});

// ফায়ারবেস ব্যাকআপ (JSON Export)
app.get('/api/db/export', async (req, res) => {
  try {
    const result = await firebaseFetch('/', 'GET');
    logActivity('BACKUP_EXPORT', 'Full Database Exported');
    res.setHeader('Content-disposition', 'attachment; filename=sjemar_backup_' + Date.now() + '.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(result.data, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ফায়ারবেস রিস্টোর (JSON Import)
app.post('/api/db/import', async (req, res) => {
  try {
    const { jsonData } = req.body;
    if (!jsonData) return res.status(400).json({ success: false, message: 'JSON data missing' });
    
    await firebaseFetch('/', 'PUT', jsonData);
    logActivity('BACKUP_RESTORE', 'Full Database Restored from JSON');
    res.json({ success: true, message: 'Database Restored Successfully!' });
  } catch (error) {
    logActivity('RESTORE_ERR', error.message, 'FAILED');
    res.status(500).json({ success: false, message: error.message });
  }
});

// API Key জেনারেটর
app.post('/api/keys/generate', (req, res) => {
  const newKey = 'sjemar_live_' + crypto.randomBytes(8).toString('hex');
  apiKeys.add(newKey);
  logActivity('API_KEY_GEN', `New key: ${newKey.substring(0, 15)}...`);
  res.json({ success: true, key: newKey });
});

// ------------------------------------------
// ৪. ফ্রন্টএন্ড UI (OLED UI + 15 Features)
// ------------------------------------------
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SJEMAR Cloud Engine Pro</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --card-bg: rgba(12, 12, 16, 0.9);
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
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: #000000; color: var(--text); min-height: 100vh; padding-bottom: 90px; overflow-x: hidden; }

    /* Sticky Header */
    .header { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); background: rgba(0, 0, 0, 0.85); border-bottom: 1px solid var(--card-border); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; }
    .brand-wrap { display: flex; align-items: center; gap: 10px; }
    .brand-logo { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, #2563EB, #7C3AED); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px var(--accent-glow); font-size: 16px; font-weight: 800; }
    .brand-title { font-size: 16px; font-weight: 800; letter-spacing: -0.3px; }
    .cmd-badge { background: #111; border: 1px solid var(--card-border); padding: 4px 8px; border-radius: 8px; font-size: 11px; color: var(--text-sub); cursor: pointer; display: flex; align-items: center; gap: 5px; }

    .container { max-width: 500px; margin: 0 auto; padding: 16px 14px; }
    
    /* Metrics Grid */
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .stat-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 14px; position: relative; overflow: hidden; }
    .stat-title { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
    .stat-val { font-size: 18px; font-weight: 800; margin-top: 4px; color: #fff; font-family: 'JetBrains Mono', monospace; }
    .stat-glow { position: absolute; top: -10px; right: -10px; width: 40px; height: 40px; background: var(--accent); filter: blur(20px); opacity: 0.15; }

    /* Glass Cards */
    .glass-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; padding: 18px; margin-bottom: 16px; }
    .card-head { font-size: 15px; font-weight: 700; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }

    /* Inputs & Buttons */
    .form-group { margin-bottom: 12px; }
    .form-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; display: block; }
    .glass-input, .glass-textarea { width: 100%; background: #070709; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px 14px; color: #FFFFFF; font-size: 13px; outline: none; transition: 0.2s; }
    .glass-input:focus, .glass-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .glass-textarea { font-family: 'JetBrains Mono', monospace; font-size: 12px; min-height: 90px; resize: vertical; }

    .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: 0.2s; gap: 8px; }
    .btn-primary { background: var(--accent); color: #fff; box-shadow: 0 4px 15px var(--accent-glow); }
    .btn-primary:active { transform: scale(0.98); }
    .btn-secondary { background: rgba(255,255,255,0.06); color: #fff; border: 1px solid var(--card-border); }
    .btn-danger { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }

    /* Drag Drop Area */
    .dropzone { border: 2px dashed rgba(255,255,255,0.15); border-radius: 14px; padding: 20px; text-align: center; cursor: pointer; transition: 0.2s; background: #050505; }
    .dropzone.dragover { border-color: var(--accent); background: rgba(37,99,235,0.05); }

    /* Activity Log List */
    .log-list { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .log-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(255,255,255,0.02); border-radius: 10px; font-size: 12px; border: 1px solid var(--border-subtle); }
    .log-action { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #60A5FA; }

    /* Bottom Floating Nav */
    .bottom-nav { position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); width: calc(100% - 28px); max-width: 460px; background: rgba(15, 15, 20, 0.85); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); border: 1px solid var(--card-border); border-radius: 20px; display: flex; padding: 6px; z-index: 40; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
    .nav-btn { flex: 1; padding: 10px 0; background: transparent; border: none; color: var(--text-muted); font-size: 11px; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; border-radius: 14px; transition: 0.2s; }
    .nav-btn.active { color: #FFFFFF; background: rgba(255,255,255,0.08); }

    /* Tab Panes */
    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: slideIn 0.2s ease-out; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    /* Toast Notification */
    #toast-container { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 100; pointer-events: none; }
    .toast { background: rgba(20, 20, 25, 0.95); backdrop-filter: blur(20px); border: 1px solid var(--card-border); color: #fff; padding: 10px 18px; border-radius: 30px; font-size: 12px; font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.8); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes toastIn { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }

    /* Command Palette Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); z-index: 90; display: none; align-items: flex-start; justify-content: center; padding-top: 80px; }
    .modal-backdrop.show { display: flex; }
    .cmd-box { width: 90%; max-width: 440px; background: #0E0E12; border: 1px solid var(--card-border); border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.9); }
  </style>
</head>
<body>

  <!-- Toast Notification Container -->
  <div id="toast-container"></div>

  <!-- Header -->
  <header class="header">
    <div class="brand-wrap">
      <div class="brand-logo">⚡</div>
      <div>
        <div class="brand-title">SJEMAR Cloud</div>
      </div>
    </div>
    <div class="cmd-badge" onclick="toggleCmdPalette()">
      <span>Cmd + K</span>
    </div>
  </header>

  <div class="container">
    
    <!-- 1. ড্যাশবোর্ড ট্যাব -->
    <div id="tab-overview" class="tab-pane active">
      <!-- Live Server Metrics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-glow"></div>
          <div class="stat-title">Heap RAM</div>
          <div class="stat-val" id="stat-ram">0.00 MB</div>
        </div>
        <div class="stat-card">
          <div class="stat-glow"></div>
          <div class="stat-title">System Load</div>
          <div class="stat-val" id="stat-sys-ram">0%</div>
        </div>
        <div class="stat-card">
          <div class="stat-glow"></div>
          <div class="stat-title">Server Uptime</div>
          <div class="stat-val" id="stat-uptime">0s</div>
        </div>
        <div class="stat-card">
          <div class="stat-glow"></div>
          <div class="stat-title">Ping Latency</div>
          <div class="stat-val" id="stat-ping">-- ms</div>
        </div>
      </div>

      <!-- Quick Database Explorer -->
      <div class="glass-card">
        <div class="card-head">
          <span>⚡ Firebase Realtime Engine</span>
          <button class="btn btn-secondary" style="width:auto; padding:4px 10px; font-size:10px;" onclick="formatJsonInput()">Format JSON</button>
        </div>
        <div class="form-group">
          <label class="form-label">Path Node</label>
          <input type="text" id="db-node" class="glass-input" value="users" placeholder="e.g. users, config/app">
        </div>
        <div class="form-group">
          <label class="form-label">Payload (JSON / String)</label>
          <textarea id="db-payload" class="glass-textarea" placeholder='{"status": "active", "tier": "ultra"}'></textarea>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary" onclick="executeDbRead()">Read Node</button>
          <button class="btn btn-primary" onclick="executeDbWrite()">Save / Update</button>
        </div>
      </div>

      <!-- Response Viewer -->
      <div class="glass-card">
        <div class="card-head">
          <span>Console Output</span>
          <button class="btn btn-secondary" style="width:auto; padding:4px 8px; font-size:10px;" onclick="copyOutput()">Copy</button>
        </div>
        <pre id="output-box" style="font-family:'JetBrains Mono', monospace; font-size:11px; color:#A1A1AA; background:#050505; padding:12px; border-radius:12px; max-height:160px; overflow:auto;">Ready for operations...</pre>
      </div>
    </div>

    <!-- 2. ব্যাকআপ ও রিস্টোর ট্যাব -->
    <div id="tab-backup" class="tab-pane">
      <div class="glass-card">
        <div class="card-head">📦 Database Export</div>
        <p style="font-size:12px; color:var(--text-sub); margin-bottom:12px;">এক ক্লিকে সম্পূর্ণ ফায়ারবেস ডেটাবেজ JSON ফরম্যাটে ডাউনলোড করুন।</p>
        <button class="btn btn-primary" onclick="window.location.href='/api/db/export'">Download Full Backup (.json)</button>
      </div>

      <div class="glass-card">
        <div class="card-head">📥 1-Click Restore (JSON Dropzone)</div>
        <div class="dropzone" id="dropzone" onclick="document.getElementById('file-input').click()">
          <p style="font-size:12px; color:var(--text-sub);">JSON ফাইল টেনে এনে ছাড়ুন বা ক্লিক করুন</p>
          <input type="file" id="file-input" accept=".json" style="display:none;" onchange="handleFileRestore(event)">
        </div>
      </div>
    </div>

    <!-- 3. অ্যাক্টিভিটি লগ ও API কী ট্যাব -->
    <div id="tab-logs" class="tab-pane">
      <div class="glass-card">
        <div class="card-head">
          <span>🔑 API Key Generator</span>
          <button class="btn btn-primary" style="width:auto; padding:6px 12px; font-size:11px;" onclick="generateApiKey()">+ Generate</button>
        </div>
        <div id="api-key-display" style="font-family:'JetBrains Mono', monospace; font-size:11px; padding:10px; background:#070709; border-radius:10px; border:1px dashed rgba(255,255,255,0.15); word-break:break-all;">Click generate to create secret key</div>
      </div>

      <div class="glass-card">
        <div class="card-head">
          <span>📜 Live Activity Log</span>
          <button class="btn btn-secondary" style="width:auto; padding:4px 8px; font-size:10px;" onclick="fetchLogs()">Refresh</button>
        </div>
        <div class="log-list" id="log-container">
          <div style="font-size:11px; color:var(--text-muted); text-align:center;">No logs yet</div>
        </div>
      </div>
    </div>

  </div>

  <!-- Command Palette Modal -->
  <div class="modal-backdrop" id="cmd-modal" onclick="if(event.target===this) toggleCmdPalette()">
    <div class="cmd-box">
      <input type="text" id="cmd-input" class="glass-input" style="border:none; border-bottom:1px solid var(--card-border); border-radius:0; padding:16px;" placeholder="Type a command (e.g. read, backup, logs)..." onkeyup="handleCmdInput(event)">
      <div style="padding:10px; display:flex; flex-direction:column; gap:4px; font-size:12px;">
        <div style="padding:8px 10px; cursor:pointer;" onclick="switchTab('tab-overview'); toggleCmdPalette();">📊 Open Dashboard</div>
        <div style="padding:8px 10px; cursor:pointer;" onclick="switchTab('tab-backup'); toggleCmdPalette();">📦 Export / Import Backup</div>
        <div style="padding:8px 10px; cursor:pointer;" onclick="switchTab('tab-logs'); toggleCmdPalette();">📜 View Audit Trail</div>
      </div>
    </div>
  </div>

  <!-- Bottom Navigation -->
  <nav class="bottom-nav">
    <button class="nav-btn active" onclick="switchTab('tab-overview', this)">
      <span>⚡</span>
      <span>Engine</span>
    </button>
    <button class="nav-btn" onclick="switchTab('tab-backup', this)">
      <span>📦</span>
      <span>Backup</span>
    </button>
    <button class="nav-btn" onclick="switchTab('tab-logs', this)">
      <span>📜</span>
      <span>Audit & API</span>
    </button>
  </nav>

  <script>
    // ১. টোস্ট নোটিফিকেশন এবং হ্যাপটিক ভাইব্রেশন
    function showToast(text, isError = false) {
      if (navigator.vibrate) navigator.vibrate([25]);
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.style.borderColor = isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(37, 99, 235, 0.4)';
      toast.innerHTML = (isError ? '⚠️ ' : '✅ ') + text;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    }

    // ২. ট্যাব সুইচিং
    function switchTab(tabId, el) {
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      if (el) el.classList.add('active');
    }

    // ৩. লাইভ সার্ভার হেলথ পোকার
    async function updateSystemMetrics() {
      const start = Date.now();
      try {
        const res = await fetch('/api/system/health');
        const data = await res.json();
        const latency = Date.now() - start;

        document.getElementById('stat-ram').innerText = data.ramHeapUsed;
        document.getElementById('stat-sys-ram').innerText = data.systemRamUsage + '%';
        document.getElementById('stat-uptime').innerText = data.uptime + 's';
        document.getElementById('stat-ping').innerText = latency + ' ms';
      } catch (e) {}
    }
    setInterval(updateSystemMetrics, 2500);
    updateSystemMetrics();

    // ৪. ডেটাবেজ রিড/রাইট
    async function executeDbRead() {
      const node = document.getElementById('db-node').value;
      try {
        const res = await fetch('/api/db/read?node=' + encodeURIComponent(node));
        const json = await res.json();
        document.getElementById('output-box').innerText = JSON.stringify(json.data, null, 2);
        showToast('Node read successfully');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    async function executeDbWrite() {
      const node = document.getElementById('db-node').value;
      const payload = document.getElementById('db-payload').value;
      try {
        const res = await fetch('/api/db/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node, payload })
        });
        const json = await res.json();
        document.getElementById('output-box').innerText = JSON.stringify(json.data, null, 2);
        showToast('Node updated successfully');
      } catch (err) {
        showToast(err.message, true);
      }
    }

    // ৫. JSON ফরম্যাটিং হেল্পার
    function formatJsonInput() {
      const field = document.getElementById('db-payload');
      try {
        const parsed = JSON.parse(field.value);
        field.value = JSON.stringify(parsed, null, 2);
        showToast('JSON Formatted');
      } catch (e) {
        showToast('Invalid JSON structure', true);
      }
    }

    function copyOutput() {
      navigator.clipboard.writeText(document.getElementById('output-box').innerText);
      showToast('Copied to clipboard');
    }

    // ৬. ড্র্যাগ অ্যান্ড ড্রপ রিস্টোর
    async function handleFileRestore(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function(e) {
        try {
          const jsonData = JSON.parse(e.target.result);
          const res = await fetch('/api/db/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonData })
          });
          const result = await res.json();
          if (result.success) showToast('Database Restored!');
        } catch (err) {
          showToast('Corrupted JSON File', true);
        }
      };
      reader.readAsText(file);
    }

    // ৭. API কী জেনারেশন ও লগ ফেচিং
    async function generateApiKey() {
      const res = await fetch('/api/keys/generate', { method: 'POST' });
      const data = await res.json();
      document.getElementById('api-key-display').innerText = data.key;
      showToast('New Key Generated');
    }

    async function fetchLogs() {
      const res = await fetch('/api/logs');
      const data = await res.json();
      const container = document.getElementById('log-container');
      if (data.logs.length === 0) return;

      container.innerHTML = data.logs.map(log => \`
        <div class="log-item">
          <div>
            <span class="log-action">\${log.action}</span>
            <div style="color:var(--text-muted); font-size:10px;">\${log.details}</div>
          </div>
          <span style="font-size:10px; color:var(--text-sub);">\${log.timestamp}</span>
        </div>
      \`).join('');
    }

    // ৮. Command Palette (Cmd + K)
    function toggleCmdPalette() {
      const modal = document.getElementById('cmd-modal');
      modal.classList.toggle('show');
      if (modal.classList.contains('show')) {
        document.getElementById('cmd-input').focus();
      }
    }

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleCmdPalette();
      }
    });
  </script>
</body>
</html>`);
});

// সার্ভার স্টার্ট
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`⚡ SJEMAR Cloud Engine Pro Live!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔑 Admin Pass: ${ADMIN_PASS}`);
  console.log(`=========================================`);
});
