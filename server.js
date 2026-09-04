"use strict";

/*
=========================================================
 SJEMAR HOSTING ENGINE
 Version: 2.0.0

 Features:
 - HTML Hosting
 - Custom Slug
 - Admin Dashboard
 - Create / Edit / Delete Sites
 - Publish / Unpublish
 - Preview
 - Search
 - Statistics
 - OLED Glass UI
 - Render Compatible
 - JSON Database
=========================================================
*/

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

/* =========================================================
   CONFIG
========================================================= */

const PORT = process.env.PORT || 3000;

const ADMIN_PASS =
  process.env.ADMIN_PASS || "py.py.php";

const DATA_DIR =
  process.env.DATA_DIR || path.join(__dirname, "data");

const DB_FILE =
  path.join(DATA_DIR, "sites.json");

const MAX_HTML_SIZE =
  5 * 1024 * 1024;

/* =========================================================
   APP CONFIG
========================================================= */

app.disable("x-powered-by");

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "6mb"
  })
);

app.use(
  bodyParser.json({
    limit: "6mb"
  })
);

/* =========================================================
   SECURITY HEADERS
========================================================= */

app.use((req, res, next) => {

  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  res.setHeader(
    "X-Frame-Options",
    "SAMEORIGIN"
  );

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  next();
});

/* =========================================================
   DATABASE
========================================================= */

function ensureDatabase() {

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true
    });
  }

  if (!fs.existsSync(DB_FILE)) {

    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(
        {
          sites: []
        },
        null,
        2
      )
    );
  }
}

ensureDatabase();

/* =========================================================
   DATABASE HELPERS
========================================================= */

function readDB() {

  try {

    const raw =
      fs.readFileSync(
        DB_FILE,
        "utf8"
      );

    const db =
      JSON.parse(raw);

    if (!db.sites) {
      db.sites = [];
    }

    return db;

  } catch (error) {

    console.error(
      "Database read error:",
      error
    );

    return {
      sites: []
    };
  }
}

function writeDB(db) {

  const tempFile =
    DB_FILE + ".tmp";

  fs.writeFileSync(
    tempFile,
    JSON.stringify(
      db,
      null,
      2
    ),
    "utf8"
  );

  fs.renameSync(
    tempFile,
    DB_FILE
  );
}

/* =========================================================
   ID
========================================================= */

function generateId() {

  return crypto
    .randomBytes(12)
    .toString("hex");
}

/* =========================================================
   SLUG
========================================================= */

function createSlug(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function validSlug(slug) {

  return /^[a-z0-9][a-z0-9-_]{1,79}$/.test(
    slug
  );
}

/* =========================================================
   HTML VALIDATION
========================================================= */

function validateHTML(html) {

  if (
    typeof html !== "string"
  ) {
    return false;
  }

  if (
    Buffer.byteLength(
      html,
      "utf8"
    ) > MAX_HTML_SIZE
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   ADMIN COOKIE
========================================================= */

const ADMIN_COOKIE =
  "sjemar_admin";

/*
 Simple signed token.
*/

function createAdminToken() {

  const timestamp =
    Date.now();

  const raw =
    timestamp + ":" + ADMIN_PASS;

  const signature =
    crypto
      .createHash("sha256")
      .update(raw)
      .digest("hex");

  return `${timestamp}.${signature}`;
}

function verifyAdminToken(token) {

  if (!token) {
    return false;
  }

  const parts =
    token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const timestamp =
    Number(parts[0]);

  const signature =
    parts[1];

  if (
    !Number.isFinite(timestamp)
  ) {
    return false;
  }

  /*
    Admin session expires after 24 hours.
  */

  if (
    Date.now() - timestamp >
    24 * 60 * 60 * 1000
  ) {
    return false;
  }

  const expected =
    crypto
      .createHash("sha256")
      .update(
        timestamp + ":" + ADMIN_PASS
      )
      .digest("hex");

  return (
    signature === expected
  );
}

function parseCookies(req) {

  const header =
    req.headers.cookie || "";

  const cookies = {};

  header
    .split(";")
    .forEach(part => {

      const index =
        part.indexOf("=");

      if (index === -1) {
        return;
      }

      const key =
        part
          .slice(0, index)
          .trim();

      const value =
        part
          .slice(index + 1)
          .trim();

      cookies[key] =
        decodeURIComponent(value);
    });

  return cookies;
}

function isAdmin(req) {

  const cookies =
    parseCookies(req);

  return verifyAdminToken(
    cookies[ADMIN_COOKIE]
  );
}

/* =========================================================
   ADMIN MIDDLEWARE
========================================================= */

function requireAdmin(req, res, next) {

  if (!isAdmin(req)) {

    return res
      .status(401)
      .json({
        success: false,
        error: "Unauthorized"
      });
  }

  next();
}

/* =========================================================
   RATE LIMIT
========================================================= */

const loginAttempts =
  new Map();

function loginRateLimit(req, res, next) {

  const ip =
    req.ip ||
    req.socket.remoteAddress ||
    "unknown";

  const now =
    Date.now();

  const record =
    loginAttempts.get(ip);

  if (!record) {

    loginAttempts.set(
      ip,
      {
        count: 1,
        reset: now + 10 * 60 * 1000
      }
    );

    return next();
  }

  if (
    now >
    record.reset
  ) {

    loginAttempts.set(
      ip,
      {
        count: 1,
        reset: now + 10 * 60 * 1000
      }
    );

    return next();
  }

  if (record.count >= 10) {

    return res
      .status(429)
      .json({
        success: false,
        error:
          "Too many login attempts. Try again later."
      });
  }

  record.count++;

  next();
}

/* =========================================================
   DEFAULT HTML
========================================================= */

const DEFAULT_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<title>SJEMAR Website</title>

<style>

*{
box-sizing:border-box;
}

html,body{
margin:0;
padding:0;
width:100%;
min-height:100%;
}

body{
font-family:
Inter,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif;

background:
radial-gradient(
circle at top,
#172033 0%,
#07090d 45%,
#020305 100%
);

color:#fff;

display:flex;
align-items:center;
justify-content:center;

padding:24px;
}

.card{

width:100%;
max-width:680px;

padding:42px;

border-radius:30px;

background:
rgba(255,255,255,.055);

border:
1px solid rgba(255,255,255,.09);

box-shadow:
0 30px 100px
rgba(0,0,0,.6),

inset 0 1px 0
rgba(255,255,255,.08);

backdrop-filter:
blur(30px);

-webkit-backdrop-filter:
blur(30px);

text-align:center;
}

h1{
margin:0 0 12px;
font-size:38px;
letter-spacing:-1.5px;
}

p{
color:#9da5b5;
line-height:1.7;
}

</style>
</head>

<body>

<div class="card">

<h1>SJEMAR Hosting</h1>

<p>
Your website is ready.
</p>

</div>

</body>
</html>
`;

/* =========================================================
   HOME PAGE
========================================================= */

app.get("/", (req, res) => {

  res.send(`

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0">

<title>SJEMAR Hosting</title>

<style>

*{
box-sizing:border-box;
}

html,body{
margin:0;
padding:0;
min-height:100%;
}

body{

font-family:
Inter,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif;

background:
#030507;

color:#f5f7fa;

min-height:100vh;

overflow-x:hidden;
}

body::before{

content:"";

position:fixed;

inset:-30%;

background:
radial-gradient(
circle at 20% 10%,
rgba(255,255,255,.07),
transparent 28%
),

radial-gradient(
circle at 80% 20%,
rgba(80,120,255,.08),
transparent 30%
);

pointer-events:none;
}

.nav{

position:sticky;

top:14px;

z-index:10;

width:
calc(100% - 28px);

max-width:1120px;

margin:14px auto;

padding:14px 18px;

display:flex;

align-items:center;

justify-content:space-between;

border:
1px solid rgba(255,255,255,.08);

background:
rgba(15,17,22,.65);

backdrop-filter:
blur(28px);

-webkit-backdrop-filter:
blur(28px);

border-radius:22px;

box-shadow:
0 20px 70px
rgba(0,0,0,.45);
}

.logo{

font-size:17px;

font-weight:700;

letter-spacing:-.4px;
}

.status{

font-size:12px;

color:#9ba3b2;

padding:
8px 12px;

border-radius:999px;

background:
rgba(255,255,255,.05);

border:
1px solid rgba(255,255,255,.07);
}

.hero{

max-width:1120px;

margin:
100px auto 50px;

padding:
0 22px;

text-align:center;
}

.hero h1{

font-size:
clamp(42px,8vw,78px);

line-height:.98;

letter-spacing:
-4px;

margin:0;

font-weight:750;
}

.hero p{

max-width:620px;

margin:
25px auto 0;

color:#8d96a7;

font-size:16px;

line-height:1.7;
}

.grid{

max-width:1120px;

margin:auto;

padding:0 22px 70px;

display:grid;

grid-template-columns:
repeat(3,1fr);

gap:16px;
}

.card{

padding:28px;

min-height:190px;

border-radius:28px;

background:
linear-gradient(
145deg,
rgba(255,255,255,.075),
rgba(255,255,255,.025)
);

border:
1px solid
rgba(255,255,255,.08);

box-shadow:
0 25px 80px
rgba(0,0,0,.35),

inset 0 1px 0
rgba(255,255,255,.06);

transition:
transform .25s ease,
border-color .25s ease;
}

.card:hover{

transform:
translateY(-4px);

border-color:
rgba(255,255,255,.15);
}

.card h2{

margin:
0 0 10px;

font-size:20px;
}

.card p{

color:#8992a2;

font-size:14px;

line-height:1.6;
}

footer{

text-align:center;

padding:
30px 20px 50px;

color:#5e6674;

font-size:12px;
}

@media(max-width:800px){

.grid{
grid-template-columns:1fr;
}

.hero{
margin-top:70px;
}

.hero h1{
letter-spacing:-2.5px;
}

}

</style>

</head>

<body>

<div class="nav">

<div class="logo">
SJEMAR
</div>

<div class="status">
Hosting Engine
</div>

</div>

<section class="hero">

<h1>
Simple Web Hosting
</h1>

<p>
Upload your HTML project and publish it
as a clean public link using SJEMAR Hosting.
</p>

</section>

<section class="grid">

<div class="card">

<h2>
HTML Hosting
</h2>

<p>
Publish a complete HTML, CSS and JavaScript
website from a single project.
</p>

</div>

<div class="card">

<h2>
Fast Links
</h2>

<p>
Every published project receives its own
unique public URL.
</p>

</div>

<div class="card">

<h2>
Admin Control
</h2>

<p>
Manage, edit, publish and remove projects
from the private administration panel.
</p>

</div>

</section>

<footer>
© 2026 SJEMAR Hosting Engine
</footer>

</body>

</html>

  `);
});

/* =========================================================
   ADMIN LOGIN PAGE
========================================================= */

app.get("/admin", (req, res) => {

  if (isAdmin(req)) {

    return res.redirect(
      "/admin/dashboard"
    );
  }

  res.send(`

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0">

<title>SJEMAR Admin</title>

<style>

*{
box-sizing:border-box;
}

body{

margin:0;

min-height:100vh;

display:flex;

align-items:center;

justify-content:center;

padding:20px;

font-family:
Inter,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif;

background:#020304;

color:#fff;
}

.box{

width:100%;

max-width:420px;

padding:30px;

border-radius:30px;

background:
rgba(255,255,255,.055);

border:
1px solid
rgba(255,255,255,.09);

box-shadow:
0 30px 100px
rgba(0,0,0,.6);

backdrop-filter:
blur(30px);
}

h1{

margin:0 0 8px;

font-size:28px;
}

p{

color:#858d9c;

font-size:14px;

line-height:1.6;
}

input{

width:100%;

height:52px;

border-radius:16px;

border:
1px solid
rgba(255,255,255,.1);

background:
rgba(255,255,255,.045);

color:#fff;

outline:none;

padding:
0 16px;

margin-top:12px;

font-size:15px;
}

button{

width:100%;

height:52px;

border:0;

border-radius:16px;

margin-top:14px;

background:#fff;

color:#050505;

font-weight:700;

cursor:pointer;
}

.error{

display:none;

margin-top:12px;

color:#ff7777;

font-size:13px;
}

</style>

</head>

<body>

<div class="box">

<h1>
Admin
</h1>

<p>
Private SJEMAR administration.
</p>

<form id="login">

<input
id="password"
type="password"
placeholder="Password"
autocomplete="current-password"
required>

<button type="submit">
Continue
</button>

<div
class="error"
id="error">
Invalid password.
</div>

</form>

</div>

<script>

const form =
document.getElementById("login");

form.addEventListener(
"submit",
async e => {

e.preventDefault();

const password =
document.getElementById(
"password"
).value;

const response =
await fetch(
"/api/admin/login",
{
method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:JSON.stringify({
password
})
}
);

const data =
await response.json();

if(data.success){

location.href =
"/admin/dashboard";

}else{

document.getElementById(
"error"
).style.display =
"block";

}

});

</script>

</body>

</html>

  `);
});

/* =========================================================
   ADMIN LOGIN API
========================================================= */

app.post(
  "/api/admin/login",
  loginRateLimit,
  (req, res) => {

    const password =
      String(
        req.body.password || ""
      );

    if (
      password !== ADMIN_PASS
    ) {

      return res
        .status(401)
        .json({
          success:false
        });
    }

    const token =
      createAdminToken();

    res.setHeader(
      "Set-Cookie",
      `${ADMIN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`
    );

    res.json({
      success:true
    });
  }
);

/* =========================================================
   ADMIN LOGOUT
========================================================= */

app.post(
  "/api/admin/logout",
  requireAdmin,
  (req, res) => {

    res.setHeader(
      "Set-Cookie",
      `${ADMIN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
    );

    res.json({
      success:true
    });
  }
);

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

app.get(
  "/admin/dashboard",
  requireAdmin,
  (req, res) => {

    res.send(`

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0">

<title>SJEMAR Admin</title>

<style>

*{
box-sizing:border-box;
}

html,body{
margin:0;
padding:0;
}

body{

font-family:
Inter,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif;

background:#030507;

color:#fff;
}

.wrap{

width:
min(1180px,calc(100% - 28px));

margin:auto;

padding:
24px 0 70px;
}

.top{

display:flex;

justify-content:space-between;

align-items:center;

gap:15px;

margin-bottom:24px;

padding:18px 20px;

border-radius:24px;

background:
rgba(255,255,255,.05);

border:
1px solid
rgba(255,255,255,.08);

backdrop-filter:
blur(28px);
}

.logo{

font-weight:800;

font-size:18px;
}

.logout{

border:0;

padding:
10px 15px;

border-radius:13px;

background:
rgba(255,255,255,.08);

color:#fff;

cursor:pointer;
}

.stats{

display:grid;

grid-template-columns:
repeat(3,1fr);

gap:14px;

margin-bottom:18px;
}

.stat{

padding:22px;

border-radius:22px;

background:
rgba(255,255,255,.045);

border:
1px solid
rgba(255,255,255,.07);
}

.stat small{

display:block;

color:#7d8695;

margin-bottom:8px;
}

.stat strong{

font-size:28px;
}

.panel{

padding:22px;

border-radius:25px;

background:
rgba(255,255,255,.045);

border:
1px solid
rgba(255,255,255,.07);

margin-bottom:18px;
}

.toolbar{

display:flex;

gap:10px;

flex-wrap:wrap;
}

input,textarea,select{

width:100%;

border-radius:14px;

border:
1px solid
rgba(255,255,255,.09);

background:
rgba(0,0,0,.3);

color:#fff;

padding:13px;

outline:none;
}

.search{

max-width:350px;
}

button{

border:0;

border-radius:13px;

padding:
12px 16px;

cursor:pointer;

font-weight:650;
}

.primary{

background:#fff;

color:#000;
}

.secondary{

background:
rgba(255,255,255,.08);

color:#fff;
}

.danger{

background:
rgba(255,60,60,.12);

color:#ff8a8a;
}

.editor{

display:none;

margin-top:18px;
}

.editor-grid{

display:grid;

grid-template-columns:
1fr 1fr;

gap:14px;
}

textarea{

min-height:420px;

font-family:
ui-monospace,
SFMono-Regular,
Menlo,
monospace;

font-size:13px;

line-height:1.5;
}

.sites{

display:grid;

gap:12px;

margin-top:18px;
}

.site{

padding:18px;

border-radius:20px;

background:
rgba(255,255,255,.035);

border:
1px solid
rgba(255,255,255,.065);
}

.site-head{

display:flex;

justify-content:space-between;

gap:12px;

align-items:flex-start;
}

.site h3{

margin:0 0 6px;

font-size:17px;
}

.site small{

color:#7e8796;
}

.actions{

display:flex;

gap:7px;

flex-wrap:wrap;

margin-top:15px;
}

.actions button{

font-size:12px;

padding:
9px 12px;
}

.badge{

font-size:11px;

padding:
6px 9px;

border-radius:999px;

background:
rgba(255,255,255,.06);

color:#aab2c0;
}

@media(max-width:800px){

.stats{

grid-template-columns:1fr;
}

.editor-grid{

grid-template-columns:1fr;
}

.top{

align-items:flex-start;
}

}

</style>

</head>

<body>

<div class="wrap">

<div class="top">

<div class="logo">
SJEMAR Admin
</div>

<button
class="logout"
onclick="logout()">
Logout
</button>

</div>

<div
class="stats"
id="stats">
</div>

<div class="panel">

<div class="toolbar">

<input
class="search"
id="search"
placeholder="Search websites">

<button
class="primary"
onclick="newSite()">
New Website
</button>

</div>

<div
class="editor"
id="editor">

<div class="editor-grid">

<div>

<input
id="siteTitle"
placeholder="Website title">

<br><br>

<input
id="siteSlug"
placeholder="Custom slug">

<br><br>

<input
id="siteDescription"
placeholder="Description">

<br><br>

<input
id="siteFavicon"
placeholder="Favicon URL">

<br><br>

<select id="siteStatus">

<option value="published">
Published
</option>

<option value="draft">
Draft
</option>

</select>

<br><br>

<button
class="primary"
onclick="saveSite()">
Save Website
</button>

<button
class="secondary"
onclick="cancelEditor()">
Cancel
</button>

</div>

<div>

<textarea
id="siteHTML"
placeholder="Paste your complete HTML here..."></textarea>

</div>

</div>

</div>

<div
class="sites"
id="sites">
</div>

</div>

</div>

<script>

let currentId = null;
let allSites = [];

const $ = id =>
document.getElementById(id);

async function api(
url,
options = {}
){

const response =
await fetch(
url,
options
);

const data =
await response.json();

if(
response.status === 401
){

location.href =
"/admin";

return null;
}

return data;
}

async function load(){

const data =
await api(
"/api/admin/sites"
);

if(!data) return;

allSites =
data.sites || [];

renderStats(
allSites
);

renderSites(
allSites
);
}

function renderStats(sites){

const published =
sites.filter(
s => s.status === "published"
).length;

const drafts =
sites.filter(
s => s.status !== "published"
).length;

$("stats").innerHTML = `

<div class="stat">

<small>Total Websites</small>

<strong>
${sites.length}
</strong>

</div>

<div class="stat">

<small>Published</small>

<strong>
${published}
</strong>

</div>

<div class="stat">

<small>Drafts</small>

<strong>
${drafts}
</strong>

</div>

`;

}

function renderSites(sites){

const query =
$("search").value
.toLowerCase()
.trim();

const filtered =
sites.filter(site => {

return (
site.title
.toLowerCase()
.includes(query)
||
site.slug
.toLowerCase()
.includes(query)
);

});

if(!filtered.length){

$("sites").innerHTML = `

<div class="site">

<small>
No websites found.
</small>

</div>

`;

return;
}

$("sites").innerHTML =
filtered.map(
site => {

const safeTitle =
escapeHTML(site.title);

const safeSlug =
escapeHTML(site.slug);

const safeDescription =
escapeHTML(
site.description || ""
);

return `

<div class="site">

<div class="site-head">

<div>

<h3>
${safeTitle}
</h3>

<small>
/site/${safeSlug}
</small>

<br>

<small>
${safeDescription}
</small>

</div>

<div class="badge">
${site.status}
</div>

</div>

<div class="actions">

<button
class="secondary"
onclick="preview('${site.id}')">
Preview
</button>

<button
class="secondary"
onclick="editSite('${site.id}')">
Edit
</button>

<button
class="secondary"
onclick="toggleSite('${site.id}')">
${site.status === "published"
? "Unpublish"
: "Publish"}
</button>

<button
class="danger"
onclick="deleteSite('${site.id}')">
Delete
</button>

</div>

</div>

`;

}).join("");

}

function escapeHTML(value){

return String(value || "")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;");

}

$("search").addEventListener(
"input",
() => renderSites(allSites)
);

function newSite(){

currentId = null;

$("editor").style.display =
"block";

$("siteTitle").value =
"";

$("siteSlug").value =
"";

$("siteDescription").value =
"";

$("siteFavicon").value =
"";

$("siteStatus").value =
"published";

$("siteHTML").value =
`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width,initial-scale=1">
<title>My Website</title>
</head>
<body>

<h1>Hello World</h1>

</body>
</html>`;
}

function editSite(id){

const site =
allSites.find(
s => s.id === id
);

if(!site) return;

currentId =
id;

$("editor").style.display =
"block";

$("siteTitle").value =
site.title || "";

$("siteSlug").value =
site.slug || "";

$("siteDescription").value =
site.description || "";

$("siteFavicon").value =
site.favicon || "";

$("siteStatus").value =
site.status || "published";

$("siteHTML").value =
site.html || "";

window.scrollTo({
top:0,
behavior:"smooth"
});

}

async function saveSite(){

const payload = {

title:
$("siteTitle").value.trim(),

slug:
$("siteSlug").value.trim(),

description:
$("siteDescription").value.trim(),

favicon:
$("siteFavicon").value.trim(),

status:
$("siteStatus").value,

html:
$("siteHTML").value

};

if(!payload.title){

alert("Website title is required.");

return;
}

if(!payload.slug){

alert("Website slug is required.");

return;
}

if(!payload.html){

alert("HTML is required.");

return;
}

let data;

if(currentId){

data =
await api(
"/api/admin/sites/" +
encodeURIComponent(currentId),
{
method:"PUT",

headers:{
"Content-Type":
"application/json"
},

body:
JSON.stringify(payload)
}
);

}else{

data =
await api(
"/api/admin/sites",
{
method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:
JSON.stringify(payload)
}
);

}

if(
data &&
data.success
){

$("editor").style.display =
"none";

await load();

}else{

alert(
data?.error ||
"Unable to save website."
);

}

}

function cancelEditor(){

$("editor").style.display =
"none";

currentId = null;
}

function preview(id){

const site =
allSites.find(
s => s.id === id
);

if(!site) return;

window.open(
"/site/" +
encodeURIComponent(site.slug),
"_blank"
);

}

async function toggleSite(id){

const site =
allSites.find(
s => s.id === id
);

if(!site) return;

const newStatus =
site.status === "published"
? "draft"
: "published";

const data =
await api(
"/api/admin/sites/" +
encodeURIComponent(id),
{
method:"PUT",

headers:{
"Content-Type":
"application/json"
},

body:JSON.stringify({
status:newStatus
})
}
);

if(
data &&
data.success
){

load();

}

}

async function deleteSite(id){

if(
!confirm(
"Delete this website permanently?"
)
){

return;
}

const data =
await api(
"/api/admin/sites/" +
encodeURIComponent(id),
{
method:"DELETE"
}
);

if(
data &&
data.success
){

load();

}

}

async function logout(){

await fetch(
"/api/admin/logout",
{
method:"POST"
}
);

location.href =
"/admin";

}

load();

</script>

</body>

</html>

    `);
  }
);

/* =========================================================
   ADMIN LIST SITES
========================================================= */

app.get(
  "/api/admin/sites",
  requireAdmin,
  (req, res) => {

    const db =
      readDB();

    /*
      Do not send unnecessary internal fields.
    */

    const sites =
      db.sites.map(site => ({
        id: site.id,
        title: site.title,
        slug: site.slug,
        description:
          site.description || "",
        favicon:
          site.favicon || "",
        status:
          site.status || "draft",
        html:
          site.html || "",
        createdAt:
          site.createdAt,
        updatedAt:
          site.updatedAt
      }));

    res.json({
      success:true,
      sites
    });
  }
);

/* =========================================================
   CREATE SITE
========================================================= */

app.post(
  "/api/admin/sites",
  requireAdmin,
  (req, res) => {

    const title =
      String(
        req.body.title || ""
      ).trim();

    let slug =
      createSlug(
        req.body.slug
      );

    const description =
      String(
        req.body.description || ""
      ).trim();

    const favicon =
      String(
        req.body.favicon || ""
      ).trim();

    const status =
      req.body.status ===
      "published"
        ? "published"
        : "draft";

    const html =
      String(
        req.body.html || ""
      );

    if (
      !title ||
      title.length > 120
    ) {

      return res
        .status(400)
        .json({
          success:false,
          error:
            "Invalid website title."
        });
    }

    if (!validSlug(slug)) {

      return res
        .status(400)
        .json({
          success:false,
          error:
            "Invalid slug."
        });
    }

    if (!validateHTML(html)) {

      return res
        .status(400)
        .json({
          success:false,
          error:
            "HTML is invalid or too large."
        });
    }

    const db =
      readDB();

    if (
      db.sites.some(
        site =>
          site.slug === slug
      )
    ) {

      return res
        .status(409)
        .json({
          success:false,
          error:
            "Slug already exists."
        });
    }

    const now =
      new Date().toISOString();

    const site = {

      id:
        generateId(),

      title,

      slug,

      description,

      favicon,

      status,

      html,

      createdAt: now,

      updatedAt: now

    };

    db.sites.push(site);

    writeDB(db);

    res.json({
      success:true,
      site
    });
  }
);

/* =========================================================
   UPDATE SITE
========================================================= */

app.put(
  "/api/admin/sites/:id",
  requireAdmin,
  (req, res) => {

    const db =
      readDB();

    const site =
      db.sites.find(
        item =>
          item.id ===
          req.params.id
      );

    if(!site){

      return res
        .status(404)
        .json({
          success:false,
          error:
            "Website not found."
        });
    }

    if(
      req.body.title !==
      undefined
    ){

      const title =
        String(
          req.body.title
        ).trim();

      if(
        !title ||
        title.length > 120
      ){

        return res
          .status(400)
          .json({
            success:false,
            error:
              "Invalid title."
          });
      }

      site.title =
        title;
    }

    if(
      req.body.slug !==
      undefined
    ){

      const slug =
        createSlug(
          req.body.slug
        );

      if(
        !validSlug(slug)
      ){

        return res
          .status(400)
          .json({
            success:false,
            error:
              "Invalid slug."
          });
      }

      const exists =
        db.sites.some(
          item =>
            item.id !== site.id &&
            item.slug === slug
        );

      if(exists){

        return res
          .status(409)
          .json({
            success:false,
            error:
              "Slug already exists."
          });
      }

      site.slug =
        slug;
    }

    if(
      req.body.description !==
      undefined
    ){

      site.description =
        String(
          req.body.description
        ).slice(0,500);
    }

    if(
      req.body.favicon !==
      undefined
    ){

      site.favicon =
        String(
          req.body.favicon
        ).slice(0,1000);
    }

    if(
      req.body.status !==
      undefined
    ){

      site.status =
        req.body.status ===
        "published"
          ? "published"
          : "draft";
    }

    if(
      req.body.html !==
      undefined
    ){

      const html =
        String(
          req.body.html
        );

      if(
        !validateHTML(html)
      ){

        return res
          .status(400)
          .json({
            success:false,
            error:
              "HTML is invalid or too large."
          });
      }

      site.html =
        html;
    }

    site.updatedAt =
      new Date().toISOString();

    writeDB(db);

    res.json({
      success:true,
      site
    });
  }
);

/* =========================================================
   DELETE SITE
========================================================= */

app.delete(
  "/api/admin/sites/:id",
  requireAdmin,
  (req, res) => {

    const db =
      readDB();

    const index =
      db.sites.findIndex(
        site =>
          site.id ===
          req.params.id
      );

    if(index === -1){

      return res
        .status(404)
        .json({
          success:false,
          error:
            "Website not found."
        });
    }

    db.sites.splice(
      index,
      1
    );

    writeDB(db);

    res.json({
      success:true
    });
  }
);

/* =========================================================
   PUBLIC SITE
========================================================= */

app.get(
  "/site/:slug",
  (req, res) => {

    const slug =
      String(
        req.params.slug || ""
      ).toLowerCase();

    const db =
      readDB();

    const site =
      db.sites.find(
        item =>
          item.slug === slug
      );

    if(!site){

      return res
        .status(404)
        .send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width,initial-scale=1">
<title>Not Found</title>
<style>
body{
margin:0;
background:#030507;
color:#fff;
font-family:system-ui;
display:flex;
align-items:center;
justify-content:center;
min-height:100vh;
text-align:center;
}
</style>
</head>
<body>
<div>
<h1>404</h1>
<p>Website not found.</p>
</div>
</body>
</html>
        `);
    }

    if(
      site.status !==
      "published"
    ){

      return res
        .status(404)
        .send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Unavailable</title>
</head>
<body>
<h1>Website unavailable</h1>
</body>
</html>
        `);
    }

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache"
    );

    /*
      HTML is intentionally returned as
      user-provided website content.
    */

    res.send(
      site.html ||
      DEFAULT_HTML
    );
  }
);

/* =========================================================
   DIRECT SLUG ROUTE
   Optional:
   /username
========================================================= */

app.get(
  "/:slug",
  (req, res, next) => {

    const reserved = [
      "admin",
      "api",
      "site",
      "favicon.ico",
      "robots.txt"
    ];

    if(
      reserved.includes(
        req.params.slug
      )
    ){

      return next();
    }

    const slug =
      String(
        req.params.slug || ""
      ).toLowerCase();

    const db =
      readDB();

    const site =
      db.sites.find(
        item =>
          item.slug === slug
      );

    if(
      !site ||
      site.status !==
      "published"
    ){

      return next();
    }

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    res.send(
      site.html ||
      DEFAULT_HTML
    );
  }
);

/* =========================================================
   ROBOTS
========================================================= */

app.get(
  "/robots.txt",
  (req, res) => {

    res.type("text/plain");

    res.send(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
`
    );
  }
);

/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {

    if(
      req.path.startsWith(
        "/api/"
      )
    ){

      return res
        .status(404)
        .json({
          success:false,
          error:
            "API endpoint not found."
        });
    }

    res
      .status(404)
      .send(`
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1">

<title>404</title>

<style>

body{

margin:0;

min-height:100vh;

display:flex;

align-items:center;

justify-content:center;

background:#030507;

color:#fff;

font-family:
system-ui,
sans-serif;

text-align:center;
}

h1{
font-size:70px;
margin:0;
}

p{
color:#777;
}

</style>

</head>

<body>

<div>

<h1>404</h1>

<p>
The requested page could not be found.
</p>

</div>

</body>

</html>
      `);
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {

    console.error(
      "Server error:",
      error
    );

    if(
      res.headersSent
    ){

      return next(error);
    }

    res
      .status(500)
      .json({
        success:false,
        error:
          "Internal server error."
      });
  }
);

/* =========================================================
   START
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "SJEMAR Hosting Engine running"
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      `Admin: /admin`
    );

  }
);
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
