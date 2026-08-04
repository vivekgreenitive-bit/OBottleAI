# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built static files to Nginx public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx config if custom routing is needed, or use default
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
