# Use official Node.js LTS image
FROM node:18

# Set working directory
WORKDIR /app

# Install necessary system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    xvfb \
    x11-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Expose port
EXPOSE 10000

# Start with virtual framebuffer for Puppeteer and stream recording
CMD ["xvfb-run", "--auto-servernum", "--server-args=-screen 0 1024x768x24", "node", "index.js"]
