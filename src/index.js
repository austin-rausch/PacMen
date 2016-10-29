import uws from 'uws';
import http from 'http';
import Debug from 'debug';
import express from 'express';

import handlers from './controllers';
import {Client} from './models/client';

const debug = Debug('app:main');
const port = 8080;
const server = http.createServer();
const app = express();
const wss = new uws.Server({server});

wss.on('connection', socket => {
  const client = new Client(socket);

  // make client self-aware
  client.send({clientId: client.id});

  client.receive(data => {
    const handler = handlers[data.type];
    if (!handler) {
      throw new Error(`Invalid message type "${data.type}"`);
    }
    handler(client, data);
  });
});

app.use('/', express.static('public'));

server.on('request', app);

server.listen(port, () => {
  debug(`server listening on :${port}`);
});
