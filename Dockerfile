FROM node:22-alpine

RUN mkdir -p /data/data
RUN mkdir -p /data/files
RUN chown -R node:node /data

USER node
WORKDIR /home/node

ADD --chown=node:node package.json .
ADD --chown=node:node package-lock.json .

RUN npm install

ADD --chown=node:node . .

RUN ln -s /home/node/built/lib/index.js /home/node/filescrud
RUN chmod a+x /home/node/filescrud
ENV PATH="$PATH:/home/node"

RUN ln -sf /data/config.json /home/node/config.json
RUN ln -sf /data/config.yml /home/node/config.yml
RUN ln -sf /data/config.yaml /home/node/config.yaml
RUN ln -sf /data/files /home/node/files
RUN ln -sf /data/data /home/node/data

ENTRYPOINT ["filescrud"]
CMD ["start"]
