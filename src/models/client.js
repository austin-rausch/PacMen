import uuid from 'node-uuid';
import Debug from 'debug';

let clientStore = [];

export default class Client {
  constructor(socket) {
    this.id = uuid.v4();
    this.socket = socket;
    this.room = null;
    this._receivers = [];
    this.debug = Debug(`app:client:${this.id}`);

    this.socket.on('message', (...args) => this._receive(...args));
    this.socket.on('close', () => this._close());
    this.socket.on('disconnect', () => this._close());
    clientStore.push(this);
  }

  static all() {
    return clientStore;
  }

  _receive(message) {
    const data = JSON.parse(message);
    this._receivers.forEach(rc => rc(data));
  }

  _close() {
    this.debug('socket connection closed');
    if (this.room) {
      this.room.removeClient(this);
    }
    clientStore = clientStore.filter(client => client.id !== this.id);
  }

  send(data) {
    const message = JSON.stringify(data);
    this.debug(`sent ${message}`);
    this.socket.send(message);
  }

  receive(callback) {
    this._receivers.push(callback);
  }
}
