import SimplePeer from 'simple-peer';
import Debug from 'debug';

const peerStore = [];

function signalPeer(peerId, signalData) {
  const peer = peerStore.find(peer => peer.id === peerId);
  if (!peer) {
    throw new Error(`Peer "${peerId}" not found`);
  }
  peer.signal(signalData);
}

class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  then() {
    return this.promise.then(...arguments);
  }

  catch() {
    return this.promise.catch(...arguments);
  }
}

export class Peer {
  constructor(client, id, room, initiate) {
    this.client = client;
    this.id = id;
    this.room = room;
    this.debug = Debug(`app:peer:${this.id}`);
    this._receivers = [];
    this.connect = new Deferred();
    this.connection = new SimplePeer({initiator: initiate});
    this._connect().then(() => {
      this.debug('connected');
      this.connected = true;
      this.connect.resolve();
    });

    peerStore.push(this);
  }

  _connect(initiate) {
    this.connection.on('signal', signalData => {
      this.client.socket.send({
        type: 'signal-client',
        senderId: this.client.id,
        receiverId: this.id,
        signalData
      });
    });

    return new Promise((resolve, reject) => {
      this.connection.on('connect', resolve());
    });
  }

  signal(signalData) {
    this.connection.signal(signalData);
  }

  _receive(message) {
    const data = JSON.parse(message);
    this._receivers.forEach(rc => rc(data));
  }

  send(data) {
    if (!this.connected) {
      return this.connect.then(() => this.send(data));
    }

    const message = JSON.stringify(data);
    this.connection.send(message);
  }

  receive(callback) {
    this._receivers.push(callback);
  }
}

export default {
  all: peerStore,
  signalPeer
};
