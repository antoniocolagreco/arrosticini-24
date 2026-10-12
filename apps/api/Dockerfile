FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.11.7 prune @arrosticini/api --docker

FROM base AS build
COPY --from=prune /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
RUN pnpm turbo run build --filter=@arrosticini/api \
  && rm -rf node_modules */*/node_modules \
  && pnpm install --frozen-lockfile --offline --prod

FROM node:24-alpine
ARG APP_VERSION=dev
ENV NODE_ENV=production APP_VERSION=$APP_VERSION
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
