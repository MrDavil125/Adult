# Vercel Deployment Guide

## Steps to Deploy on Vercel

### Method 1: Vercel CLI (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Build the project first
npm install
npm run build

# 3. Deploy
vercel

# 4. For production deployment
vercel --prod
```

### Method 2: GitHub + Vercel Dashboard

1. Push this project to GitHub
2. Go to [vercel.com](https://vercel.com) and login
3. Click "New Project" → Import your GitHub repo
4. Configure:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`
5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `VERCEL` = `1`
6. Click Deploy!

## ⚠️ Important Notes

### Puppeteer / MissAV Routes
- MissAV endpoints use Puppeteer with `@sparticuz/chromium`
- These work on Vercel but may be **slow** (10-30 seconds)
- Vercel free plan has **10 second** timeout — upgrade to Pro for 60s timeout
- If MissAV is not needed, you can remove those routes

### Vercel Limitations
- **No persistent storage** — in-memory cache resets on each request
- **Cold starts** — first request may be slow
- **Function timeout**: Free = 10s, Pro = 60s, Enterprise = 900s

### Environment Variables (Optional)
```
PORT=3000          # Not needed on Vercel (auto-assigned)
USER_AGENT=...     # Custom user agent string
NODE_ENV=production
VERCEL=1
```

## Local Development

```bash
npm install
npm run start:dev   # Hot reload with tsx
# OR
npm run start:prod  # Build + run
```
