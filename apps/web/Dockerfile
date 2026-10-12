FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.11.7 prune @arrosticini/web --docker

FROM base AS build
COPY --from=prune /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
RUN pnpm turbo run build --filter=@arrosticini/web

FROM node:24-alpine
ARG APP_VERSION=dev
ENV NODE_ENV=production APP_VERSION=$APP_VERSION
COPY --from=build /repo /repo
WORKDIR /repo/apps/web
USER node
EXPOSE 3100
CMD ["node", "--import", "tsx", "server.ts"]
