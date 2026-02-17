---
sidebar_position: 5
---

# MCP API

You can use this REST API to search your collection and get relevant results. This is the same endpoint used by the [MCP Server](/docs/connect/mcp-server) integration. Unlike other APIs, this is a **public endpoint** and does not require an API key. It only works with **public collections** (non-private).

:::warning Rate Limited
This is a public endpoint and is rate limited. Excessive requests will be throttled.
:::

### URL

```
GET https://wings.crawlchat.app/mcp/{COLLECTION_ID}?query={QUERY}
```

You can find the `COLLECTION_ID` from the [Settings](https://crawlchat.app/settings) page on your dashboard.

### Query Parameters

| Key                | Type     | Note                                      |
| ------------------ | -------- | ----------------------------------------- |
| `query` (required) | `STRING` | The search query to find relevant results |

### CURL Request

```bash
curl 'https://wings.crawlchat.app/mcp/YOUR_COLLECTION_ID?query=How%20to%20setup%20the%20Discord%20bot'
```

### Response

You get the search results from the collection's knowledge base. Following is a sample response

```json
[
  {
    "content": "Content of the page",
    "url": "https://crawlchat.app/pricing",
    "score": 0.9889705,
    "fetchUniqueId": "74200",
    "id": "6970788f245830fd5bbca33b/db046818-aad3-4ffb-a95b-01d383ed8f51",
    "query": "crawlchat pricing"
  }
]
```

### Error Responses

| Status | Body                                | Reason                                           |
| ------ | ----------------------------------- | ------------------------------------------------ |
| `400`  | `{"message": "Private collection"}` | The collection is private and cannot be accessed |
| `400`  | `{"message": "Not enough credits"}` | The collection owner has run out of credits      |
| `429`  |                                     | Rate limit exceeded                              |
