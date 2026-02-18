---
name: crawlchat-setup-collection
description: |
  CrawlChat knowledge collection creation and syncing.
  Use when:
  - Creating knowledge collections (web sources)
  - Debugging MongoDB/pgvector/embedding issues
  - Troubleshooting source-sync OOM or connection pool errors
---

# CrawlChat Knowledge Collection Setup Guide

This guide covers creating and syncing a knowledge collection (web source) in CrawlChat.

## Prerequisites

Follow setup-dev skill first to have the dev server running.

## Create a Knowledge Group

### 1. Navigate to Knowledge page

Open: http://localhost:5173/knowledge

### 2. Create a new group

Click **"Add group"** and fill in:

- **Name:** Docs (or your preferred name)
- **URL:** https://docs.crawlchat.app (or your target website)
- **Source Type:** Web

Click **"Create"** to add the group.

### 3. Start fetching

On the knowledge page, find your group and click **"Refetch it"** to start crawling.

---

## Common Issues & Fixes

### Issue 1: MongoDB Unique Constraint Error

**Error:**
```
PrismaClientKnownRequestError: Unique constraint failed on the constraint: `ScrapeItem_knowledgeGroupId_sourcePageId_key`
```

**Fix:** Drop the unique index from MongoDB:

```bash
docker exec crawlchat-local-database-1 mongosh --eval 'db.getSiblingDB("crawlchat").getCollection("ScrapeItem").dropIndex("ScrapeItem_knowledgeGroupId_sourcePageId_key")'
```

### Issue 2: Source-sync OOM / Connection Pool Exhausted

**Symptoms:**
- `sorry, too many clients already` (pgvector)
- Process killed by OOM killer

**Fix:** Reduce worker concurrency in `source-sync/src/worker.ts`:

```typescript
// Change from:
concurrency: 4,

// To:
concurrency: 1,
```

### Issue 3: OpenRouter API Key Missing

**Error:** Embedding API calls fail

**Fix:** Add your OpenRouter API key to `.env`:

```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

Get a free key from: https://openrouter.ai

### Issue 4: Embedding API Response Error

**Error:**
```
Cannot read properties of undefined (reading '0')
```

**Cause:** The embedding API response validation is missing in `packages/indexer/src/earth-indexer.ts`.

**Fix:** Add null-safe check in `makeEmbedding()`:

```typescript
const data = await response.json();
if (!data?.data?.[0]?.embedding) {
  throw new Error(`Embedding API error: ${JSON.stringify(data)}`);
}
return data.data[0].embedding;
```

---

## Useful Commands

### Check embeddings in pgvector

```bash
docker exec crawlchat-local-pgvector-1 psql -U postgres -d crawlchat -c "SELECT COUNT(*) FROM earth_embeddings;"
```

### Restart dev server

```bash
cd /root/.openclaw/workspace/crawlchat
pkill -9 -f "tsx"
npm run dev:core
```

### Restart only front (if server crashes)

```bash
cd /root/.openclaw/workspace/crawlchat/front
npm run dev
```

---

## Troubleshooting

| Symptom | Solution |
|---------|----------|
| "too many clients already" pgvector | Restart pgvector: `docker restart crawlchat-local-pgvector-1` |
| OOM kills processes | Reduce concurrency to 1, or run only needed services |
| Frontend not loading | Check port 5173, try `fuser -k 5173/tcp` to free port |
| Login page crashes | Ensure `SELF_HOSTED=true` in `.env` |
| Magic link not working | Check server logs for the link URL |
