# frontend/Dockerfile

# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with npm (more reliable in Docker than pnpm)
COPY package.json ./

# Convert pnpm lockfile isn't used — do a fresh npm install
RUN npm install

# Copy source and build
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
