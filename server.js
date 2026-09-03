const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ডাটাবেস কানেকশন
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ডাটা সেভ করার নিয়ম
const pageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  htmlContent: { type: String, required: true }
});
const Page = mongoose.model('Page', pageSchema);

// হোমপেজ (ইউজার এখানে এসে ফর্ম পাবে)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HTML Link Creator</title>
      <style>
        body { font-family: Arial, sans-serif; background: #121826; color: #fff; padding: 20px; text-align: center; }
        .box { background: #212936; padding: 20px; border-radius: 10px; max-width: 400px; margin: auto; }
        input, textarea, button { width: 100%; box-sizing: border-box; margin: 10px 0; padding: 12px; border-radius: 6px; border: 1px solid #374151; }
        input, textarea { background: #111827; color: #fff; }
        button { background: #2563eb; color: #fff; font-weight: bold; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>🌐 Create HTML Page</h2>
        <form action="/create" method="POST">
          <input type="text" name="slug" placeholder="লিংকের নাম দিন (যেমন: domain বা username)" required>
          <textarea name="htmlContent" rows="8" placeholder="আপনার HTML কোড এখানে পেস্ট করুন..." required></textarea>
          <button type="submit">লিংক তৈরি করুন</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// ডাটাবেসে সেভ করার কোড
app.post('/create', async (req, res) => {
  try {
    const { slug, htmlContent } = req.body;
    const cleanSlug = slug.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
    
    const existing = await Page.findOne({ slug: cleanSlug });
    if (existing) {
      return res.send(`<h3>❌ এই নাম (${cleanSlug}) আগেই কেউ ব্যবহার করেছে! <a href="/">আবার চেষ্টা করুন</a></h3>`);
    }

    const newPage = new Page({ slug: cleanSlug, htmlContent });
    await newPage.save();

    const link = `${req.protocol}://${req.get('host')}/${cleanSlug}`;
    res.send(`
      <div style="font-family: Arial; text-align: center; padding: 20px;">
        <h2>🎉 সফলভাবে লিংক তৈরি হয়েছে!</h2>
        <p>আপনার লিংক: <br><br> <a href="${link}" target="_blank" style="color: #2563eb; font-size: 18px;">${link}</a></p>
        <br><a href="/">নতুন আরেকটি লিংক বানান</a>
      </div>
    `);
  } catch (err) {
    res.send("সমস্যা হয়েছে: " + err.message);
  }
});

// ডাইনামিক লিংক চালু করা (যেমন: /domain বা /username)
app.get('/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug.toLowerCase() });
    if (!page) return res.status(404).send("<h1>404 - পেজটি পাওয়া যায়নি!</h1>");
    res.set('Content-Type', 'text/html');
    res.send(page.htmlContent);
  } catch (err) {
    res.send("Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server is running'));
