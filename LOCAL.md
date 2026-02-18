# Run on local machine

## Requirements

1. `docker`
2. `node 20.18.0`

## Required external services envs

1. `OPENROUTER_API_KEY` in `server` from [OpenRouter](https://openrouter.ai) [Free plan]

## Steps

1. Clone the repo
2. Run `databases` using `docker compose -f docker/docker-compose-local.yml up`
3. `cp .env.example .env`
4. `npm i`
5. `npm run dev` or `npm run dev:core` for only core services
6. Navigate to [http://localhost:5173](http://localhost:5173)

Check out [documentation](https://docs.crawlchat.app/self-hosting/run-locally) for more details