FROM node:22.12.0-alpine3.21

WORKDIR /app

RUN npm install -g pnpm

# Copy everything
COPY . .

# Install dependencies (environment variables injected at runtime)
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm run build

EXPOSE 3000

# Cloud Run injects environment variables at runtime
CMD ["pnpm", "start"]
