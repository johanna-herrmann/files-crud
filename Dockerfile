FROM node:22-alpine

USER node
WORKDIR /home/node

ADD --chown=node:node package.json .
ADD --chown=node:node package-lock.json .

RUN npm install

ADD --chown=node:node . .

RUN ln -s /home/node/built/lib/index.js /home/node/filescrud
RUN chmod a+x /home/node/filescrud
ENV PATH="$PATH:/home/node"

ENTRYPOINT ["filescrud"]
CMD ["start"]
