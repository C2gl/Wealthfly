# ---- Stage 1: build the React frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend runtime ----
FROM node:20-alpine AS runtime
# build tools needed to compile better-sqlite3's native bindings
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY backend/package.json ./
RUN npm install --omit=dev
COPY backend/ ./

# drop the built frontend into ./public, served as static files by Express
COPY --from=frontend-build /app/frontend/dist ./public

ENV NODE_ENV=production
ENV PORT=4400
EXPOSE 4400

CMD ["node", "src/index.js"]
