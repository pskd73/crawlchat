# Run on local machine

## Requirements

1. `docker`
2. `node 20.10.0`

## Required external services envs

1. `PINECONE_API_KEY` in `server`, `source-sync` from [Pinecone](https://www.pinecone.io) [Free plan]
2. `OPENROUTER_API_KEY` in `server` from [OpenRouter](https://openrouter.ai) [Free plan]

## Steps

1. Clone the repo
2. Copy `.env.example` -> `.env` and set above `envs`
3. Run `databases` on Docker: `docker compose -f docker-compose-local.yml up`
4. Run `front` app [NEW TERMINAL]: `cd front`, `npm i`, `npm run dev`
5. Run `server` app [NEW TERMINAL]: `cd server`, `npm i`, `npm run dev`
6. Run `source-sync` app [NEW TERMINAL]: `cd source-sync`, `npm i`, `npm run dev`
7. Navigate to [http://localhost:5173](http://localhost:5173)
