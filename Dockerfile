# ---- Stage 1: build the React frontend ----
FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
COPY frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend runtime ----
FROM node:24-alpine AS runtime
# build tools needed to compile better-sqlite3's native bindings
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY backend/package.json ./
COPY backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/ ./

# drop the built frontend into ./public, served as static files by Express
COPY --from=frontend-build /app/frontend/dist ./public

ENV NODE_ENV=production
ENV PORT=4400
EXPOSE 4400

CMD ["node", "src/index.js"]
