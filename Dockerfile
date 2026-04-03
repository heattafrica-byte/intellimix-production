FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy everything
COPY . .

# Install dependencies (environment variables injected at runtime)
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm run build

EXPOSE 8080

# Cloud Run expects PORT env var, default to 8080
ENV PORT=8080

# Cloud Run injects environment variables at runtime
CMD ["pnpm", "start"]
