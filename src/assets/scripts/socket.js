const maxRetries = 30;

export default class Socket {
  constructor() {
    this.retries = 0;
    this._receivers = [];
  }

  _establishConnection() {
    return new Promise((resolve, reject) => {
      const connection = new WebSocket(`ws://${location.host}`);
      connection.on('open', () => {
        this.retries++;
        this._listen();
        resolve();
      });
      connection.on('error', error => {
        error = error || new Error('Connect could not be established.');
        if (this.retries < maxRetries) {
          this.retries++;
          return this._establishConnection.then(resolve, reject);
        }
        this.connectionError = error;
        reject(error);
      });
    });
  }

  _listen() {
    this.connection.on('message', message => {
      const data = JSON.parse(message);
      this._receivers.forEach(rc => rc(data));
    });

    this.connection.on('close', () => {
      this.connection = null;
    });
  }

  send(data) {
    if (this.connectionError) {
      return Promise.reject(this.connectionError);
    }

    if (!this.connection) {
      return this._establishConnection()
        .then(() => this.send(data));
    }

    return new Promise((resolve, reject) => {
      this.connection.send(JSON.stringify(data), error => {
        error ? reject(error) : resolve();
      });
    });
  }

  receive(callback) {
    this._receivers.push(callback);
  }
}
