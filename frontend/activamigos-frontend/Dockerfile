# Stage 1: Build the Angular application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application for production
# This creates the dist/activamigos-frontend folder
RUN npm run build -- --configuration production

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build artifacts from the previous stage
# Note: Ensure the source path matches the angular.json output path
COPY --from=build /app/dist/activamigos-frontend/browser /usr/share/nginx/html

# Copy custom Nginx configuration (we will create this next)
# The default.conf is usually mapped via docker-compose, but checking it in is safer
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
