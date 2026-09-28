# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/package*.json ./
COPY --from=base /app/dist ./dist
COPY --from=base /app/db ./db
COPY --from=base /app/lib ./lib
COPY --from=base /app/middleware ./middleware
COPY --from=base /app/routes ./routes
COPY --from=base /app/public ./public
COPY --from=base /app/index.html ./index.html
COPY --from=base /app/server.ts ./server.ts
COPY --from=base /app/vite.config.ts ./vite.config.ts
COPY --from=base /app/tsconfig.json ./tsconfig.json
COPY --from=base /app/src ./src
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "start"]
