function _arrSort (a, b) {
  if (a.value < b.value) {
    return 1;
  } else if (a.value > b.value) {
    return -1;
  } else if (a.id < b.id) { // a.value must equal b.value, sort by id
    return 1;
  } else if (a.id > b.id) {
    return -1;
  } else { // this is statistically unlikely to happen.
    return 0;
  }
}

export default class PeerController {
  constructor () {
    this.store = [];
    this.id = null;
    this.master = null;
    this.localSeed = null;
    this.resolvingMaster = false;
  }

  addPeer (inPeer) {
    inPeer.controller = this;
    // add listener for master resolve step.
    inPeer.receive((data, outPeer) => {
      if (data.type === 'who-is-master') {
        if (this.master === true) {
          if (data.reply === true) {
            outPeer.send({
              type: 'i-am-master',
              returnReceipt: data.returnReceipt
            });
          } else {
            outPeer.send({
              type: 'i-am-master'
            });
          }
        } else if (this.resolvingMaster === true) {
          if (data.reply === true) { // receipt is requested.
            outPeer.send({
              type: 'shut-up',
              returnReceipt: data.returnReceipt
            });
          } else {
            outPeer.send({
              type: 'shut-up'
            });
          }
        }
      }
    });
    this.store.push(inPeer);
  }

  removePeer (peer) {
    this.store = this.store.filter((cPeer) => peer.id !== cPeer.id);
  }

  signalPeer (peerId, signalData) {
    const peer = this.store.find(peer => peer.id === peerId);
    if (!peer) {
      throw new Error(`Peer "${peerId}" not found`);
    }
    peer.signal(signalData);
  }

  broadcast (data) {
    this.store.forEach((peer) => { peer.send(data); });
  }

  broadcastPromiseRace (data, timeout) {
    const promises = [];
    this.store.forEach((peer) => {
      promises.push(peer.sendPromise(data, timeout));
    });
    // no peers, reject (aftet timeout if set).
    if (promises.length === 0) {
      return new Promise((resolve, reject) => {
        if (timeout) {
          setTimeout(() => { reject(); }, timeout);
        } else {
          reject();
        }
      });
    }
    return Promise.race(promises);
  }

  receiveAll (callback) {
    this.store.forEach((peer) => { peer.receive(callback); });
  }

  receiveOnceRace (callback) {
    const promises = [];
    this.store.forEach((peer) => {
      promises.push(peer.receiveOnce(callback));
    });
    return Promise.race(promises);
  }

  connectAll () {
    const promises = this.store.map((peer) => peer.connect.promise);
    return Promise.all(promises);
  }

  getSeeds() {
    const promises = this.store.map((peer) => peer.getSeed());
    return Promise.all(promises);
  }

  setMaster (peer) {
    this.master = peer;
  }

  resolveMaster (options) {
    const {timeout, attempts} = options;
    return new Promise((resolve, reject) => {
      if (timeout) {
        setTimeout(() => {
          if (attempts === 0) {
            reject(new Error('Reached maximum resolve attempts.'));
          } else {
            resolve(this.resolveMaster({
              timeout,
              attempts: attempts - 1
            }));
          }
        }, timeout);
      }
      if (this.master) {
        this.setMaster(null);
      }
      return this.broadcastPromiseRace({
        type: 'who-is-master'
      }, 5000).then((data, peer) => {
        if (data.type === 'shut-up') {
          return this.resolveMaster();
        }
      }).catch((e) => {
        // timeout, there is no master.
        const masterPromise = this.receiveOnceRace((data) => {
          return data.type === 'i-am-master';
        });
        this.resolvingMaster = true;
        if (this.store.length === 0) {
          // in this case, you are by default the master.
          this.receiveAll((data, peer) => {
            if (data.type === 'who-is-master') {
              // receipt is requested.
              if (data.reply === true) {
                peer.send({
                  type: 'i-am-master',
                  returnReceipt: data.returnReceipt
                });
                return;
              }
              peer.send({
                type: 'i-am-master'
              });
            }
          });
          this.master = true;
          this.resolvingMaster = false;
          return Promise.resolve();
        }
        return this.connectAll().then(() => {
          this.localSeed = Math.random();
          this.broadcast({
            type: 'seed-value',
            value: this.localSeed
          });
          return this.getSeeds();
        }).then((seeds) => {
          seeds.push({
            id: this.id,
            value: this.localSeed
          });
          const sortedSeeds = seeds.sort(_arrSort);
          const master = sortedSeeds[0];
          if ((master.id === this.id) && (master.value === this.localSeed)) {
            this.broadcast({
              type: 'i-am-master'
            });
            this.receiveAll((data, peer) => {
              if (data.type === 'who-is-master') {
                peer.send({
                  type: 'i-am-master'
                });
              }
            });
            this.master = true; // set as true if you are the master
            this.resolvingMaster = false;
            return;
          } else {
            return masterPromise.then((data) => {
              this.resolvingMaster = false;
              return data;
            });
          }
        });
      });
    });
  }
}
