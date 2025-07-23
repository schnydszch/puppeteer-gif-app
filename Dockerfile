FROM node:20

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg xvfb

WORKDIR /app
COPY . .

RUN npm install

EXPOSE 10000
CMD ["npm", "start"]
