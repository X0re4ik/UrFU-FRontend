FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем кастомный конфиг nginx (если нужен)
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
