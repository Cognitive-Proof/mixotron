FROM node:20-alpine AS deps
WORKDIR /app
# node:20-alpine bundles npm 10, which hard-errors on an optional peer
# conflict (better-call wants zod ^4, the project pins zod ^3) that npm 11
# resolves without complaint. Match the npm version this project's lockfile
# was generated with (see "packageManager" in package.json) instead of
# masking the error with --legacy-peer-deps.
RUN npm install -g npm@11.12.1
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV SKIP_ENV_VALIDATION=1
# `next build` statically evaluates every route module (including the
# better-auth catch-all), which constructs the Mongo client at import time —
# so a syntactically valid connection string has to be present even though
# nothing actually connects during the build. The real URI is injected at
# runtime by Cloud Run.
ENV MIX_O_TRON_MONGODB_URI="mongodb://build-placeholder:27017/build"
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
