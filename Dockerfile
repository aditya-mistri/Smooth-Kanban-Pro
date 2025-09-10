# Build stage for the React frontend
FROM node:18-alpine AS client-builder

# Set working directory for client
WORKDIR /app/client

# Copy client package files and install dependencies
COPY client/package*.json ./
RUN npm install

# Copy client source code
COPY client/ ./

# 👇 Accept build-time ARG (for Render, maps from environment variable)
ARG VITE_API_URL
# 👇 Export it so vite sees it at build time
ENV VITE_API_URL=${VITE_API_URL}

# Build the React frontend
RUN npm run build

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy server package files and install production dependencies
COPY server/package*.json ./
RUN npm install --only=production

# Copy server source code
COPY server/ ./

# Copy built client files to server's public directory
COPY --from=client-builder /app/client/dist/ ./public/

# Set production environment
ENV NODE_ENV=production

# Expose port (Render.com will override this with their own port)
EXPOSE 5000

# Create non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start command
CMD ["npm", "start"]
