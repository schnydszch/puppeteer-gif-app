FROM node:18

# Install Xvfb and fonts for Puppeteer
RUN apt-get update && apt-get install -y \
  xvfb \
  fonts-liberation \
  libnss3 \
  libxss1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  && rm -rf /var/lib/apt/lists/*

# Set app directory
WORKDIR /app

# Copy only the package files first
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Now copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["xvfb-run", "node", "index.js"]
