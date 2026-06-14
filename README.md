# RLB Designs — Review & Feedback Platform

**Live Form:** https://reviews.rlbdesigns.com  
**Live Reviews Display:** https://reviews.rlbdesigns.com/reviews.html  
**GitHub Pages URL:** https://rlbaldwin9-hub.github.io/rlb-review-form/  
**Owner:** Rachel Baldwin — [rlbdesigns.com](https://www.rlbdesigns.com)

---

## What This Is

A fully branded, self-contained review and feedback platform for RLB Designs. Readers and users can leave reviews for Books, Creator Apps, Tutorials, and the Website/Blog. All submissions are logged automatically to a private Google Sheet, email notifications are sent to the owner, and approved reviews display publicly on the reviews page — all for free, with no backend server required.

---

## Files in This Repo

| File | Purpose |
|------|---------|
| `index.html` | The review submission form — the entire app in one file |
| `reviews.html` | The public-facing reviews display page |
| `Code.gs` | Google Apps Script — paste into Apps Script editor (not served by GitHub) |
| `README.md` | This file |
| `CNAME` | Auto-created by GitHub when custom domain is set |

---

## How the System Works

```
Reader fills out form (index.html)
        ↓
Native HTML POST fires to Google Apps Script
        ↓
Apps Script logs review to Google Sheet
Auto-approves 4–5 star Book reviews
Auto-approves all App / Tutorial / Website reviews
Sends email notification to owner
        ↓
reviews.html fetches approved reviews via Apps Script doGet()
Displays them filtered by type and sub-category
```

---

## Review Types Supported

| Type | Icon | Fields Collected |
|------|------|-----------------|
| Book | 📚 | Category, Title, Where Purchased |
| Creator App | 📱 | App Name (with description preview) |
| Tutorial | 🎓 | Tutorial Topic, Specific Tutorial Name |
| Website / Blog | 🌐 | Site Area |

---

## Auto-Approval Logic

| Review Type | Star Rating | Status |
|-------------|-------------|--------|
| Book | 4–5 stars | ✅ Approved automatically |
| Book | 1–3 stars | ⏳ Pending — manual approval required |
| Creator App | 4–5 stars | ✅ Approved automatically |
| Creator App | 1–3 stars | ⏳ Pending — manual approval required |
| Tutorial | Any / None | ✅ Approved automatically |
| Website / Blog | Any / None | ✅ Approved automatically |

To manually approve a Pending review: open the **RLB Reader Reviews** Google Sheet and change column B from `Pending` to `Approved`.

---

## Google Apps Script Setup

1. Open your **RLB Reader Reviews** Google Sheet
2. Click **Extensions → Apps Script**
3. Delete all existing code
4. Paste the contents of `Code.gs`
5. Click **Save**, name the project `RLB Reviews`
6. Click **Deploy → New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copy the **Web App URL** — paste it into both `index.html` and `reviews.html` where indicated

> ⚠️ Every time you edit `Code.gs` you must redeploy as a **New Version** for changes to take effect. Your URL stays the same.

---

## Updating After Changes

### Updating a file on GitHub:
1. Click the filename in the repo
2. Click the ✏️ pencil icon
3. Select all, delete, paste new content
4. Click **Commit changes**
5. Wait ~60 seconds, then hard refresh: **Ctrl + Shift + R**

### Updating the Google Sites embed after a file change:
Add or increment `?v=N` to the embed URL to bust the cache:
```
https://reviews.rlbdesigns.com/?v=2
https://reviews.rlbdesigns.com/reviews.html?v=2
```

---

## Creator Apps Referenced in This Form

| App Name | Description |
|----------|-------------|
| Alpha-Gal Safe Recipe Finder | Free recipe search for Alpha-Gal Syndrome — mammal-free, dairy-free meals |
| Story Forge | AI-powered children's storybook builder from concept to finished draft |
| Reading Journal | Track RLB books read, reading, and wish list |
| My Cookbook Builder | Add recipes, name your book, download a formatted cookbook file |
| Cookbook Creator Toolkit | Full concept planner for cookbook design and organization |
| Coloring Book Studio Pro | Cover-to-cover coloring book builder with 300dpi AI prompts for KDP/IngramSpark |
| Coloring Book Planner | Theme brainstorm, prompt strategy, and quality-check tool |
| Coloring Book Page Prompt Creator | Single-page prompt builder with creative starting points |

---

## Brand Reference

| Element | Value |
|---------|-------|
| Sage | `#7a9e7e` |
| Sage Dark | `#3d5c40` |
| Gold | `#c8a96e` |
| Cream | `#f5f0e8` |
| Blush | `#f2e4e1` |
| Heading font | Playfair Display (Google Fonts) |
| Body font | Lato (Google Fonts) |

---

## DNS Configuration (Cloudflare)

| Record Type | Name | Target | Proxy |
|-------------|------|--------|-------|
| CNAME | `reviews` | `rlbaldwin9-hub.github.io` | DNS Only (grey) ☁️ |

> ⚠️ Proxy must be set to **DNS Only (grey cloud)** — never orange. Orange proxy breaks GitHub Pages HTTPS.

---

## Key Lessons Learned

- **fetch() is blocked** inside Google Sites iframes — use native HTML form POST instead
- **Cache busting** — always increment `?v=N` in Google Sites embed URLs after updating files
- **Apps Script redeploy** — always set to New Version after any code change
- **Google Sites "unsafe" warning** — safe to click through on your own script; it's standard for self-authored scripts
- **Apostrophes in JS strings** — always escape as `\'` or use double quotes to avoid silent crashes

---

## Contact & Support

**Owner:** Rachel Baldwin  
**Email:** ogrlbdesigns@gmail.com  
**Website:** https://www.rlbdesigns.com  
**Amazon:** https://www.amazon.com/stores/Rachel-Baldwin/author/B0FGJZ6FRF  
**GitHub:** https://github.com/rlbaldwin9-hub

---

*Built with Claude · Hosted on GitHub Pages · DNS via Cloudflare · Backend via Google Apps Script*  
*© 2025 RLB Designs · All Rights Reserved*
