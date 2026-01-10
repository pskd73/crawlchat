# CrawlChat

[CrawlChat](https://crawlchat.app) is an open sourced AI-powered platform that transforms your technical documentation into intelligent chatbots. Connect your documentation from various sources and deploy AI assistants that understand your content and answer questions across multiple channels including websites, Discord, Slack, and as an MCP server for integration with AI development tools.

You can self host it yourself or let [CrawlChat](https://crawlchat.app/pricing) handle it for you!

## Services

Here are the services it consists of. They are mostly simple **Node** + **TypeScript** apps.

| Name        | Purpose                                                         | Run           |
| ----------- | --------------------------------------------------------------- | ------------- |
| front       | The front facing [React Router 7](https://reactrouter.com) app  | `npm run dev` |
| server      | LLM interacting [Express](https://expressjs.com) app            | `npm run dev` |
| source-sync | A [BullMQ](http://bullmq.io) app for syncing the sources and KB | `npm run dev` |
| discord-bot | [Discord](https://discord.com) bot to answer questions          | `npm run dev` |
| slack-app   | [Slack](https://slack.com) app to answer questions              | `npm run dev` |

## Self-host

There are **Dockerfile**s for all the above mentioned services. You can instantly host on platforms like [Coolify](https://coolify.io), [Railway](https://railway.com), etc. by just setting up the **environment variables**

See the [docker-compose.yml](https://github.com/pskd73/crawlchat/blob/main/docker-compose.yml) on how to set up all basic services automatically.

## Environment variables

| Service     | Key                           | Required | Note                                          |
| ----------- | ----------------------------- | -------- | --------------------------------------------- |
| all         | `SELF_HOSTED`                 | No       | "true"                                        |
| all         | `DATABASE_URL`                | Yes      | Mongo URL                                     |
| all         | `JWT_SECRET`                  | Yes      | A random secret string. Same for all services |
| front       | `VITE_APP_URL`                | Yes      | `front` hosted URL                            |
| front       | `VITE_SERVER_WS_URL`          | Yes      | WebSocket URL for server                      |
| front       | `VITE_SERVER_URL`             | Yes      | HTTP URL for server                           |
| front       | `VITE_SOURCE_SYNC_URL`        | Yes      | URL for source-sync service                   |
| front       | `DEFAULT_SIGNUP_PLAN_ID`      | Yes      | Default plan ID for signups                   |
| front       | `RESEND_FROM_EMAIL`           | No       | Email address for Resend                      |
| front       | `RESEND_KEY`                  | No       | Resend API key                                |
| front       | `GOOGLE_CLIENT_ID`            | No       | Google OAuth client ID                        |
| front       | `GOOGLE_CLIENT_SECRET`        | No       | Google OAuth client secret                    |
| front       | `GOOGLE_REDIRECT_URI`         | No       | Google OAuth redirect URI                     |
| front       | `ADMIN_EMAILS`                | No       | Comma-separated admin email addresses         |
| server      | `SOURCE_SYNC_URL`             | Yes      | URL for source-sync service                   |
| server      | `PINECONE_API_KEY`            | Yes      | Pinecone API key                              |
| server      | `OPENROUTER_API_KEY`          | Yes      | OpenRouter API key                            |
| server      | `ADMIN_EMAILS`                | No       | Comma-separated admin email addresses         |
| server      | `OPENAI_API_KEY`              | No       | OpenAI API key                                |
| source-sync | `PINECONE_API_KEY`            | Yes      | Pinecone API key                              |
| source-sync | `REDIS_URL`                   | Yes      | Redis connection URL                          |
| source-sync | `GROUP_QUEUE_NAME`            | Yes      | Queue name for groups                         |
| source-sync | `ITEM_QUEUE_NAME`             | Yes      | Queue name for items                          |
| source-sync | `SCRAPECREATORS_API_KEY`      | No       | ScrapeCreators API key                        |
| discord-bot | `APP_ID`                      | Yes      | Discord application ID                        |
| discord-bot | `DISCORD_TOKEN`               | Yes      | Discord bot token                             |
| discord-bot | `PUBLIC_KEY`                  | Yes      | Discord public key                            |
| discord-bot | `BOT_USER_ID`                 | Yes      | Discord bot user ID                           |
| discord-bot | `ALL_BOT_USER_IDS`            | Yes      | All bot user IDs                              |
| discord-bot | `SERVER_HOST`                 | Yes      | Server host URL                               |
| slack-app   | `SERVER_HOST`                 | Yes      | Server host URL                               |
| slack-app   | `SLACK_SIGNING_SECRET`        | Yes      | Slack signing secret                          |
| slack-app   | `SLACK_CLIENT_ID`             | Yes      | Slack client ID                               |
| slack-app   | `SLACK_CLIENT_SECRET`         | Yes      | Slack client secret                           |
| slack-app   | `SLACK_STATE_SECRET`          | Yes      | Slack state secret                            |
| slack-app   | `HOST`                        | Yes      | Host URL                                      |

## Contribution

It should be pretty straight forward process. Clone the repository locally and start the **front**, **server**, **source-sync** to get started. Make sure you add the `.env` files in the services with appropriate values as mentioned in `env.example` files respectively.

Feel free to raise a **Pull request** if you find any improvement, interesting feature addition, fixes for bugs!

## License

It is available on a O'Saasy license. Go to [LICENSE](https://github.com/pskd73/crawlchat/blob/main/LICENSE.md)
