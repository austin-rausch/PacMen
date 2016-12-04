const maxRetries = 30;

export default class Socket {
  constructor() {
    this.retries = 0;
    this._receivers = [];
  }

  _establishConnection() {
    return new Promise((resolve, reject) => {
      const connection = new WebSocket(`ws://${location.host}`);
      connection.onopen = () => {
        this.retries++;
        this._listen();
        resolve();
      };
      connection.onerror = error => {
        error = error || new Error('Connect could not be established.');
        if (this.retries < maxRetries) {
          this.retries++;
          return this._establishConnection.then(resolve, reject);
        }
        this.connectionError = error;
        reject(error);
      };
      this.connection = connection;
    });
  }

  _listen() {
    this.connection.onmessage = event => {
      const data = JSON.parse(event.data);
      this.emit(data);
    };

    this.connection.onclose = () => {
      this.connection = null;
    };
  }

  emit (data) {
    this._receivers.forEach(rc => rc(data));
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
      const message = JSON.stringify(data);
      this.connection.send(message, error => {
        error ? reject(error) : resolve();
      });
    });
  }

  receive(callback) {
    this._receivers.push(callback);
  }
}
