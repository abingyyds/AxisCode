FROM node:20-slim

RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

COPY package.json tsconfig.json drizzle.config.ts ./
COPY src/ ./src/

RUN npm install
RUN npx tsc

RUN mkdir -p workspaces

EXPOSE 4000

CMD ["sh", "-c", "npx drizzle-kit migrate && node dist/index.js"]
