FROM node:18.14.1

EXPOSE 3000
EXPOSE 3001

RUN npm i -g peer && npm i -g concurrently

WORKDIR /home/node/app

RUN chown -R node:node .

USER node

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm ci && npm cache clean --force

COPY ./ .


ENTRYPOINT ["npx","concurrently","peerjs -p 3001","node server.js"]