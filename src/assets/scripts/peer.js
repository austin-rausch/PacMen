import SimplePeer from 'simple-peer';
import Debug from 'debug';
import tactic from 'tactic';

const {Defer} = tactic;

export class Peer {
  constructor(client, id, room, initiate) {
    this.client = client;
    this.id = id;
    this.room = room;
    this.receiptNumber = 0;
    this.debug = Debug(`app:peer:${this.id}`);
    this._receivers = [];
    this.connect = new Defer();
    this.seed = null;
    this.master = false;
    this.controller = null;
    this.connection = new SimplePeer({initiator: initiate});
    this._connect().then(() => {
      this.debug('connected');
      this.connected = true;
      this.connect.resolve();
      this.connection.on('data', (data) => {
        this._receive(data);
      });
    });
    this.receive((data) => {
      if (data.type === 'seed-value') {
        this.seed = data.value;
      } else if (data.type === 'i-am-master') {
        if (this.controller) {
          this.controller.setMaster(this); // set the controller's master to this peer
        }
        this.master = true; // this peer is the master
        this.connection.on('close', () => { // if this peer's connection closes recalculate master
          this.controller.removePeer(this);
          return this.controller.resolveMaster().then(() => {
            if (this.controller.master === true) {
              console.log('I am master');
            } else {
              console.log('master id is: ', this.controller.master.id);
            }
          });
        });
      }
    });
  }

  _connect(initiate) {
    this.connection.on('signal', signalData => {
      this.client.socket.send({
        type: 'signal-client',
        senderId: this.client.id,
        receiverId: this.id,
        signalData: JSON.stringify(signalData)
      });
    });

    return new Promise((resolve, reject) => {
      this.connection.on('connect', () => {
        resolve();
      });
    });
  }

  signal(signalData) {
    this.connection.signal(JSON.parse(signalData));
  }

  _receive(message) {
    const data = JSON.parse(message);
    if ((data.receipt !== undefined) && (data.receipt !== null)) {
      // proof of receiving is requested.
      const reply = this.createReply(data);
      // the receiver should handle sending back the reply after adding data
      this._receivers.forEach(rc => rc(reply, this));
      return;
    }
    this._receivers.forEach(rc => rc(data, this));
  }

  send(data) {
    if (!this.connected) {
      return this.connect.then(() => this.send(data));
    }
    const message = JSON.stringify(data);
    this.connection.send(message);
  }

  sendPromise (data, timeout) {
    const receiptNumber = data.receipt = this.receiptNumber++;
    // this needs to be before the send
    const returnVal = this.receiveOnce(
      (incomingData) => {
        return incomingData.returnReceipt === receiptNumber;
      }, timeout).then((incomingData) => incomingData);
    this.send(data);
    return returnVal;
  }

  createReply (data) {
    const payload = {
      reply: true,
      returnReceipt: data.receipt
    };
    data = Object.assign(data, payload);
    return data;
  }

  receiveOnce (callback, timeout) {
    return new Promise((resolve, reject) => {
      const tmpFn = (data) => {
        if (callback(data)) {
          this._receivers.filter((r) => r !== tmpFn);
          resolve(data);
        }
      };
      this.receive(tmpFn);
      if (timeout) {
        setTimeout(() => {
          this._receivers.filter((r) => r !== tmpFn);
          reject(new Error('Receive once timeout'));
        }, timeout);
      }
    });
  }

  receive(callback) {
    this._receivers.push(callback);
  }

  getSeed () {
    const payload = {
      id: this.id,
      value: null
    };
    if ((this.seed !== undefined) && (this.seed !== null)) {
      // seed has already been received, resolve.
      payload.value = this.seed;
      return Promise.resolve(payload);
    }
    return this.receiveOnce((data) => {
      // wait for seed
      return data.type === 'seed-value';
    }).then((data) => {
      payload.value = data.value;
      return payload;
    });
  }
}
