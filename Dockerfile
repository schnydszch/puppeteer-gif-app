FROM node:18

# Install necessary tools for Xvfb and video recording
RUN apt-get update && \
    apt-get install -y ffmpeg xvfb x11-utils && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV DISPLAY=:99

CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x720x24 & npm start"]
