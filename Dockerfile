FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy everything first
COPY . .

# Create .env file with default values for Vite variables
RUN echo "VITE_APP_ID=intellimix" > .env && \
    echo "VITE_OAUTH_PORTAL_URL=https://oauth.example.com" >> .env

# Then install dependencies
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
