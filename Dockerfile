FROM node:22-alpine

RUN mkdir -p /data/data
RUN chown -R node:node /data

USER node
WORKDIR /home/node

ADD --chown=node:node ./package.json /home/node/package.json
ADD --chown=node:node ./package-lock.json /home/node/package-lock.json

RUN npm install

ADD --chown=node:node . /home/node/

RUN ln -sn /home/node/built/lib/index.js /home/node/filescrud
RUN chmod a+x /home/node/built/lib/index.js

ENV PATH="$PATH:/home/node"

WORKDIR /data

EXPOSE 9000/tcp

ENTRYPOINT ["filescrud"]
CMD ["start"]
