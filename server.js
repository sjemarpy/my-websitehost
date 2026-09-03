const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// এখানে বড় কোড নেওয়ার জন্য লিমিট 50mb করা হলো
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

// ডাটাবেস কানেকশন
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ডাটা সেভ করার স্কিমা
const pageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  htmlContent: { type: String, required: true }
});
const Page = mongoose.model('Page', pageSchema);

// হোমপেজ
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HTML Link Creator</title>
      <style>
        body { font-family: Arial, sans-serif; background: #121826; color: #fff; padding: 20px; text-align: center; }
        .box { background: #212936; padding: 20px; border-radius: 10px; max-width: 450px; margin: auto; }
        input, textarea, button { width: 100%; box-sizing: border-box; margin: 10px 0; padding: 12px; border-radius: 6px; border: 1px solid #374151; font-size: 15px; }
        input, textarea { background: #111827; color: #fff; }
        button { background: #2563eb; color: #fff; font-weight: bold; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>🌐 Create HTML Page</h2>
        <form action="/create" method="POST">
          <input type="text" name="slug" placeholder="লিংকের নাম (যেমন: domain)" required>
          <textarea name="htmlContent" rows="8" placeholder="আপনার HTML কোড পেস্ট করুন..." required></textarea>
          <button type="submit">লিংক তৈরি করুন</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// ডাটা সেভ করা
app.post('/create', async (req, res) => {
  try {
    const { slug, htmlContent } = req.body;
    const cleanSlug = slug.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
    
    // আগের পেজ থাকলে আপডেট করবে, না থাকলে নতুন বানাবে
    await Page.findOneAndUpdate(
      { slug: cleanSlug },
      { htmlContent: htmlContent },
      { upsert: true, new: true }
    );

    const link = `${req.protocol}://${req.get('host')}/${cleanSlug}`;
    res.send(`
      <div style="font-family: Arial; text-align: center; padding: 20px; color: #111;">
        <h2>🎉 আপনার পেজ তৈরি সফল হয়েছে!</h2>
        <p style="font-size: 18px;">আপনার তৈরি করা লিংক: <br><br> 
          <a href="${link}" target="_blank" style="color: #2563eb; font-weight: bold;">${link}</a>
        </p>
        <br><br>
        <a href="/" style="background: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">নতুন আরেকটি বানান</a>
      </div>
    `);
  } catch (err) {
    res.send("সমস্যা হয়েছে: " + err.message);
  }
});

// ইউজারের পেজ শো করা
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
