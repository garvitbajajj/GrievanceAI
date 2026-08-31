# Stage 1: Build the React App
FROM node:20-alpine AS builder
WORKDIR /app

# Catch the variables from docker-compose
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_BACKEND_URL

# Expose them to the Vite build process
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]