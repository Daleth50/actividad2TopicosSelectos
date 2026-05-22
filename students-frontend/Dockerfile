# Stage 1: build
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Sin VITE_API_URL: las peticiones van a /students en el mismo origen
# y Nginx las redirige al servicio backend via proxy_pass
RUN npm run build

# Stage 2: servir con Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Redirige rutas SPA a index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
