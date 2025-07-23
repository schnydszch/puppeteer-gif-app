FROM node:18

# Install ffmpeg and xvfb
RUN apt-get update && apt-get install -y ffmpeg xvfb

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV DISPLAY=:99

CMD ["xvfb-run", "--server-args=-screen 0 1280x720x24", "npm", "start"]
