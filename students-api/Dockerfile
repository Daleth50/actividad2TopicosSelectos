FROM docker.io/library/node:24-slim

USER node

RUN mkdir -p /home/node/app
WORKDIR /home/node/app

COPY --chown=node package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY --chown=node . .

RUN npm run build

# Bind to all network interfaces so that it can be mapped to the host OS
ENV HOST=0.0.0.0 PORT=3000

EXPOSE ${PORT}
CMD [ "node", "." ]
