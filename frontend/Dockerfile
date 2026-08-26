# ==========================================
# 1. Build Stage: Node.js Vite Build
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit

COPY . .

# Compile optimized static bundle into /app/dist
RUN npm run build

# ==========================================
# 2. Production Stage: Nginx Alpine
# ==========================================
FROM nginx:alpine AS production

# Copy compiled static assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
