---
sidebar_position: 2
---

# Create Ticket API

You can use this REST API to create a support ticket on CrawlChat. These support tickets are same as the one that are created from the chat widget. This API also triggers the email communications as expected.

### API Key

You need to pass an `API_KEY` to all the following requests. You can create an `API_KEY` from the [API Keys](https://crawlchat.app/api-key) page on your dashboard.

### URL

```
POST https://wings.crawlchat.app/ticket/{COLLECTION_ID}
```

You can find the `COLLECTION_ID` from the [Settings](https://crawlchat.app/settings) page on your dashboard. Paste it in the above URL

### Headers

You need to pass the following headers in the request

| Key            | Value              | Note                                                    |
| -------------- | ------------------ | ------------------------------------------------------- |
| `x-api-key`    | `{API_KEY}`        | Use the `API_KEY` that you generated from the dashboard |
| `content-type` | `application/json` | The request should send the body as `JSON`              |

### Body

Pass the following information in the body of the request

| Key                     | Type     | Note                                                                                                                                                      |
| ----------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userEmail` (required)  | `STRING` | The email of the user whose on behalf the ticket is being created                                                                                         |
| `title` (required)      | `STRING` | The title of the ticket                                                                                                                                   |
| `message` (required)    | `STRING` | The message about the ticket issue                                                                                                                        |
| `customTags` (optional) | `Json`   | Any custom information that will be set on the ticket and will be shown on the dashboard. The value should be on of `string`, `number` or `boolean` types |

### CURL Request

```bash
curl --location --request POST 'https://wings.crawlchat.app/ticket/YOUR_COLLECTION_ID' \
--header 'x-api-key: YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
    "userEmail": "user@email.com",
    "title": "Enquiry about pricing",
    "message": "Please explain about the pricing plans"
}'
```

### Response

You get the following details in the response.

| Key            | Type     | Note                                     |
| -------------- | -------- | ---------------------------------------- |
| `ticketNumber` | `INT`    | The unique ticket number                 |
| `privateUrl`   | `STRING` | The URL that you can share with the user |

```json
{
  "ticketNumber": 51,
  "privateUrl": "https://crawlchat.app/ticket/51?key=10994db3"
}
```
