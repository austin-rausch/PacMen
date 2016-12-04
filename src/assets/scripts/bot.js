const {Phaser} = window;

const uniqueId = (() => {
  let i = 0;
  return () => i++;
})();

// const directionNames = {
//   [Phaser.NONE]: 'none',
//   [Phaser.LEFT]: 'left',
//   [Phaser.RIGHT]: 'right',
//   [Phaser.UP]: 'up',
//   [Phaser.DOWN]: 'down'
// };

export default class Ghost {
  constructor () {
    this.id = uniqueId();
    this.direction = Phaser.LEFT;
    this._listeners = [];
    this.pulse();
  }

  subscribe (listener) {
    this._listeners.push(listener);
  }

  emit () {
    const {id, direction} = this;
    this._listeners.forEach(func => {
      func({id, direction});
    });
  }

  pulse () {
    this.direction = this.randomDirection();
    this.emit();
    setTimeout(() => this.pulse(), Math.random() * 3000);
  }

  randomDirection () {
    const directions = [Phaser.LEFT, Phaser.RIGHT, Phaser.UP, Phaser.DOWN];
    return directions[Math.floor(Math.random() * directions.length)];
  }
}
