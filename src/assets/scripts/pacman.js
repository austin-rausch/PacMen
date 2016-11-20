const {Phaser} = window;

export default class Pacman {
  constructor (id) {
    this.id = id;
    this.direction = Phaser.LEFT;
    this._listeners = [];
  }

  update (direction) {
    this.direction = direction;
    this.emit();
  }

  subscribe (listener) {
    this._listeners.push(listener);
  }

  emit () {
    const {id, direction} = this;
    const data = {id, direction};
    this._listeners.forEach(func => func(data));
  }

  static bind (pacman, engine) {
    engine.onDirection(direction => {
      pacman.update(direction);
    });
    pacman.subscribe(state => {
      engine.updatePlayer(state);
    });
  }
}
