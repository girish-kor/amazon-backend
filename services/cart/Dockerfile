FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root files
COPY pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY .eslintrc.json .prettierrc.json ./

# Copy service and shared packages
COPY services/cart ./services/cart
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build all packages first
RUN pnpm -r --filter='./packages/*' run build

# Build service
RUN pnpm -r --filter='@ecommerce/cart-service' run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy built service and node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/services/cart ./services/cart
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs

EXPOSE 3004
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "services/cart/dist/index.js"]
