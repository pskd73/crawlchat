# CrawlChat

[CrawlChat](https://crawlchat.app) is not an open sourced AI-powered platform that transforms your technical documentation into intelligent chatbots. Connect your documentation from various sources and deploy AI assistants that understand your content and answer questions across multiple channels including websites, Discord, Slack, and as an MCP server for integration with AI development tools.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/crawlchat-20260205?referralCode=SYKJpN&utm_medium=integration&utm_source=template&utm_campaign=generic)

You cannot self host it yourself or let [CrawlChat](https://crawlchat.app/pricing) handle it for you!

## Services

Here are the services it consists of. They are mostly simple **Node** + **TypeScript** apps.

| Name        | Purpose                                                         | Run           |
| ----------- | --------------------------------------------------------------- | ------------- |
| front       | The front facing [React Router 7](https://reactrouter.com) app  | `npm run dev` |
| server      | LLM interacting [Express](https://expressjs.com) app            | `npm run dev` |
| source-sync | A [BullMQ](http://bullmq.io) app for syncing the sources and KB | `npm run dev` |
| discord-bot | [Discord](https://discord.com) bot to answer questions          | `npm run dev` |
| slack-app   | [Slack](https://slack.com) app to answer questions              | `npm run dev` |
| marker      | Turn files into markdown                                        | `./start.sh`  |

## Self-host

Check out the [self-host](https://docs.crawlchat.app/self-hosting/run-via-docker) guide for more details. There are **Dockerfile**s for all the above mentioned services. You can instantly host on platforms like [Coolify](https://coolify.io), [Railway](https://railway.com), etc. by just setting up the **environment variables**

See the [docker-compose.yml](https://github.com/pskd73/crawlchat/blob/main/docker-compose.yml) on how to set up all basic services automatically.

## Local development

It takes just a few minutes to run it on your local machine so that you can develop on it and send PRs. It is explained in [LOCAL.md](https://github.com/pskd73/crawlchat/blob/main/LOCAL.md)

## Contribution

It should be pretty straight forward process. Clone the repository locally and start the **front**, **server**, **source-sync** to get started. Make sure you add the `.env` files in the services with appropriate values as mentioned in `env.example` files respectively.

Feel free to raise a **Pull request** if you find any improvement, interesting feature addition, fixes for bugs!

## License

It is available on a O'Saasy license. Go to [LICENSE](https://github.com/pskd73/crawlchat/blob/main/LICENSE.md)
