FROM node:18-alpine

WORKDIR /app

# Copy dependency manifests first for Docker layer caching
COPY package*.json ./
RUN npm install --omit=dev 2>/dev/null; npm install

# Copy full application source
COPY . .

# Create uploads directory structure
RUN mkdir -p uploads/avatars uploads/certificates uploads/vault uploads/notes

# Keep NODE_ENV=development so debug/verbose error output is preserved
# (intentional — this is a vulnerable-by-design training app)
ENV NODE_ENV=development

EXPOSE 3000

CMD ["npm", "start"]
