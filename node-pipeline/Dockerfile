FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN corepack enable && echo "nodeLinker: node-modules" > .yarnrc.yml && yarn install
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY benchmark ./benchmark
COPY prisma.config.ts prisma.worker.config.ts ./
RUN yarn build
