const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

const pageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  htmlContent: {
    type: String,
    required: true
  }
});

const Page = mongoose.model('Page', pageSchema);


// =====================================================
// HOME PAGE
// =====================================================

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="bn">
<head>

<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1.0,
      maximum-scale=1.0,user-scalable=no">

<meta name="theme-color" content="#000000">

<title>Instant HTML Host</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet">

<style>

*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    -webkit-tap-highlight-color:transparent;
}

:root{
    --bg:#000000;
    --card:rgba(18,18,20,.72);
    --border:rgba(255,255,255,.10);
    --text:#f5f5f7;
    --muted:#8e8e93;
    --blue:#0a84ff;
    --purple:#bf5af2;
}

html{
    background:#000;
}

body{
    min-height:100vh;
    background:
        radial-gradient(
            circle at 50% -15%,
            rgba(10,132,255,.18),
            transparent 38%
        ),
        radial-gradient(
            circle at 100% 100%,
            rgba(191,90,242,.10),
            transparent 35%
        ),
        #000;

    color:var(--text);
    font-family:Inter,-apple-system,BlinkMacSystemFont,
                 "SF Pro Display","SF Pro Text",sans-serif;

    display:flex;
    justify-content:center;
    align-items:center;

    padding:20px;

    overflow-x:hidden;
}

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
