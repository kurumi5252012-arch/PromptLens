FROM node:24.15.0-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24.15.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
COPY package*.json ./
RUN npm ci --omit=dev && mkdir data && chown node:node data
COPY --from=build /app/dist ./dist
COPY server ./server
USER node
EXPOSE 3001
CMD ["node", "server/index.js"]
