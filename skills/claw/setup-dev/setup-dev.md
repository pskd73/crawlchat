# CrawlChat Dev Server Setup Guide

## Prerequisites

- MongoDB running on port 27017 (with replicaSet rs0)
- Redis running on port 6379
- Node.js 22+

## Steps to Start Dev Server

### 1. Kill any existing processes on port 3000

```bash
lsof -ti:3000 | xargs -r kill -9
```

### 2. Start the dev server

```bash
cd /root/.openclaw/workspace/crawlchat
npm run dev:core
```

This runs:
- Frontend on `http://localhost:5173/`
- Server on `http://localhost:3000/`
- Source-sync on `http://localhost:3007/`

**Note:** If you get `EADDRINUSE: address already in use :::3000`, kill the process first using step 1.

### 3. Create the .env file (if missing)

```bash
cp .env.example .env
```

### 4. Configure default indexer and signup plan

Edit `.env`:

```env
DEFAULT_INDEXER=earth
DEFAULT_SIGNUP_PLAN_ID=accelerate-yearly
```

### 5. Restart the dev server to apply .env changes

```bash
# Kill the running dev server (Ctrl+C or pkill)
pkill -9 -f "node.*crawlchat"
pkill -9 -f "turbo"

# Restart
npm run dev:core
```

---

## Login Flow (Magic Link)

### 1. Navigate to login page

Open: http://localhost:5173/login

### 2. Enter email and click Login

Enter `test@test.com` (or any email) in the email field.

### 3. Find the magic link in server logs

The magic link will be logged to the terminal where `npm run dev:core` is running:

```
Send email {
  to: 'test@test.com',
  subject: 'Login to CrawlChat',
  text: '...http://localhost:5173/login/verify?token=U2FsdGVkX...'
}
```

### 4. Visit the magic link

Open the URL from the logs in your browser to complete login.

---

## Useful Commands

### Check if MongoDB is running

```bash
pgrep -la mongod
# Should show: mongod --replSet rs0 --bind_ip_all --noauth
```

### Kill all dev processes

```bash
pkill -9 -f "node.*crawlchat"
pkill -9 -f "turbo"
```

### Set browser to desktop 16:9 size (1920x1080)

```bash
# Using OpenClaw browser control
browser act --profile openclaw --request '{"kind": "resize", "width": 1920, "height": 1080}'
```

---

## Troubleshooting

- **Login page crashes with "RESEND_KEY must be set"**: Ensure `SELF_HOSTED=true` is in `.env` (copied from `.env.example`)
- **Port 3000 already in use**: Kill the existing process first
- **Redis connection error**: Ensure Redis is running on `redis://localhost:6379`

---

## Best Practices

### Browser Resolution
- Always use browser in desktop 16:9 resolution (1920x1080) for consistent UI testing:

```bash
browser act --profile openclaw --request '{"kind": "resize", "width": 1920, "height": 1080}'
```

### UI Changes & Screenshots
- When making UI-related changes, always include browser screenshots in:
  - Pull requests
  - Chat discussions for review

### Git Branching
- Always create new branches from `main` unless a specific feature branch is required:

```bash
git checkout main
git pull main
git checkout -b feature/your-feature-name
```
