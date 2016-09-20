import express from 'express';
import uws from 'uws';
import http from 'http';
import uuid from 'uuid';
import {getHandler} from './clients/index';
import * as cache from './services/cache';

const HTTP_SERVER_PORT = 8080;
const server = http.createServer();
const app = express();

const wss = new uws.Server({
  server: server
});

function _handleMessage (ws, message) {
  const splitIndex = message.indexOf(':');
  const messageType = message.substring(0, splitIndex);
  const messagePayload = message.substring(splitIndex + 1);
  const handler = getHandler(messageType);

  if (!handler) {
    console.log('Invalid message type: ', messageType);
    return;
  }

  handler(ws, messagePayload);
}

wss.on('connection', (ws) => {
  const clientId = uuid.v4();

  ws.clientId = clientId;
  cache.addClientById(clientId, ws);
  ws.send(`client-id:${clientId}`, (err) => {
    // TODO handle this error, remove client?
  });

  ws.on('message', (message) => {
    _handleMessage(ws, message);
  });

  ws.on('close', () => {
    // TODO remove client
  });
});

app.use('/', express.static('public'));

server.on('request', app);

server.listen(HTTP_SERVER_PORT, () => {
  console.log('server listening on: ', HTTP_SERVER_PORT);
});
