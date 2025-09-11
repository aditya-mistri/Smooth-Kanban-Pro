# =========================
# Stage 1: Build React client
# =========================
FROM node:20-alpine AS client-builder

# Set working directory
WORKDIR /app/client

# Copy package files and install dependencies
COPY client/package*.json ./
RUN npm install

# Copy client source code
COPY client/ ./

# Set default build-time env for Vite
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=/
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}


# Build React frontend
RUN npm run build

# =========================
# Stage 2: Build server
# =========================
FROM node:20-alpine

WORKDIR /app

# Copy server package files and install production dependencies
COPY server/package*.json ./
RUN npm install --only=production

# Copy server source code
COPY server/ ./

# Copy React build to server's public folder
COPY --from=client-builder /app/client/dist ./public

# Set production env
ENV NODE_ENV=production
ENV PORT=5000

# Expose port 
EXPOSE 5000

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start server
CMD ["node", "index.js"]
