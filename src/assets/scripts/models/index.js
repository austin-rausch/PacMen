import {EventEmitter} from 'events';

// Game state
// player state

class ModelState extends EventEmitter {
  constructor (game, players) {
    super();
    this.game = game;
    this.players = players;
  }
}

// game map cells per millisecond
// 1 cell per second, for now
const speed = 1 / 1000;
const directions = {
  north: 1,
  east: 2,
  south: 3,
  west: 4
};

class Player {
  constructor (game, player) {
    this.game = game;

    const {x, y, d} = player;
    const t = Date.now();
    this.history = [{x, y, d, t}];
  }

  getX() {return this.history[0].x;}
  getY() {return this.history[0].y;}
  getDirection() {return this.history[0].d;}

  // update the player to a new position
  // given what we know locally
  increment (time) {
    const lastTime = this.history[0].t;
    const timeDelta = time - lastTime;
    const deltaX = timeDelta * speed;
    const deltaY = timeDelta * speed;

    const d = this.getDirection();
    let x = this.getX();
    let y = this.getY();
    switch (d) {
      case directions.north:
        const nextCell = game.getCell(x, y - 1);
        if (nextCell && nextCell.accessible) {
          y -= deltaY;
        } else {
          y = Math.floor(y) + 0.5;
        }
        break;
      case directions.east:
        const nextCell = game.getCell(x + 1, y);
        if (nextCell && nextCell.accessible) {
          x += deltaX;
        } else {
          x = Math.floor(x) + 0.5;
        }
        break;
      case directions.south:
        const nextCell = game.getCell(x, y + 1);
        if (nextCell && nextCell.accessible) {
          y += deltaY;
        } else {
          y = Math.floor(y) + 0.5;
        }
        break;
      case directions.west:
        x = this.getX() - deltaX;
        y = this.getY();
        break;
    }

    return {x, y, d, t: time};
  }

  // update the player to a new position
  // given where we had placed it recently
  // plus what is gven to us remotely
  update ({time, position, direction}) {
    // unwind to the time where position matches history
    let forkPosition;
    let index = 0;
    const len = this.history.length;
    while (++index < len) {
      const {x: nextX, y: nextY} = this.history[index - 1];
      const {x: currX, y: currY} = this.history[index];
      const withinX = nextX > position.x >= currX || nextX < position.x <= currX;
      const withinY = nextY > position.y >= currY || nextY < position.y <= currY;
      if (withinX && withinY) {
        forkPosition = index;
        break;
      }
    }

    // apply the given remote position
    const fork = this.history[forkPosition];
    this.direction = direction;
    this.position = {
      x: fork.x,
      y: 0
    }

    // apply increments to write a new history

  }
}

function updatePlayer(game, player, {position, direction}) {

}

function validatePlayer(game, player) {

}
