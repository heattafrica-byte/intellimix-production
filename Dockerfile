FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy everything first
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build application - environment variables are injected at runtime by Railway
RUN pnpm run build

EXPOSE 3000

# Runtime environment variables should be set by Railway or deployment platform
CMD ["pnpm", "start"]
