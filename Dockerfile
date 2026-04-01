FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy everything first
COPY . .

# Then install dependencies
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
