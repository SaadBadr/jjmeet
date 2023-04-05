FROM node:18.14.1

EXPOSE 3000
EXPOSE 3001

RUN npm i -g peer

WORKDIR /home/node/app

RUN chown -R node:node .

USER node

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm ci && npm cache clean --force

COPY ./ .


COPY runner.sh /scripts/runner.sh

ENTRYPOINT ["/scripts/runner.sh"]