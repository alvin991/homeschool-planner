# Install dependencies only when needed
FROM node:20 AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
  else npm install; fi

# Build the app
FROM node:20 AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
# NEXT_PUBLIC_* vars bake into the client bundle at build time, not at container
# start — .env is excluded from the build context (.dockerignore), so this must be
# passed explicitly as a build arg (see docs/public-deploy.md Phase 2 step 6 /
# cloudbuild.yaml, which does this for the Cloud Run path). Default below matches
# the current real student ID (keeps docker-compose.prod.yaml's self-hosted build —
# which has no build-arg plumbing of its own, see TASKS.md #20 — working unchanged).
ARG NEXT_PUBLIC_DEFAULT_STUDENT_ID=6a09362f9289b2cc08b29c47
ENV NEXT_PUBLIC_DEFAULT_STUDENT_ID=$NEXT_PUBLIC_DEFAULT_STUDENT_ID
ENV NODE_ENV=production
RUN npm run build

# Production image
FROM node:20 AS runner
WORKDIR /app

# If you use Prisma, uncomment the next line
# RUN npm install --omit=dev

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]