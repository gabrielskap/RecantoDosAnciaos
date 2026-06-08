# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package management files
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Declare build arguments for Vite.
# Vite embeds environment variables prefixed with VITE_ during build.
# We also include GEMINI_API_KEY as defined in vite.config.ts.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG GEMINI_API_KEY

# Assign them as environment variables so Vite's build process detects them
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Build the project to output static assets into /app/dist
RUN npm run build

# Stage 2: Serve stage using Nginx
FROM nginx:alpine

# Copy custom Nginx configuration for client-side routing fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
