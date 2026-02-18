FROM node:20-slim

RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

# Install Claude CLI
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY dist/ ./dist/
COPY src/db/migrations/ ./src/db/migrations/
COPY drizzle.config.ts ./

RUN mkdir -p workspaces

EXPOSE 4000

CMD ["sh", "-c", "npx drizzle-kit migrate && node dist/index.js"]
