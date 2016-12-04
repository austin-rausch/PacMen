const {Phaser} = window;
const {EventEmitter} = require('events');

export default class Pacman {
  constructor (players = []) {
    this.game = new Phaser.Game(448, 496, Phaser.AUTO);
    // this.game.state.add('Game', this, true);

    this.map = null;
    this.layer = null;
    this.players = players.map(p => this.createPlayer(p));

    this.safetile = 14;
    this.gridsize = 16;

    this.speed = 150;
    this.threshold = 3;

    this.opposites = [Phaser.NONE, Phaser.RIGHT, Phaser.LEFT, Phaser.DOWN, Phaser.UP];
    this.emitter = new EventEmitter();
  }

  init () {
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;

    Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);

    this.physics.startSystem(Phaser.Physics.ARCADE);
    this.keys = this.input.keyboard.createCursorKeys();
  }

  startGame () {
    this.game.state.add('Game', this, true);
  }

  createPlayer (player) {
    const {id, x, y, direction} = player;
    //  Position Pacman at grid location 14x17 (the +8 accounts for his anchor)
    const pacman = this.add.sprite((14 * 16) + 8, (17 * 16) + 8, 'pacman', 0);
    pacman.anchor.set(0.5);
    pacman.animations.add('munch', [0, 1, 2, 1], 20, true);

    this.physics.arcade.enable(pacman);
    pacman.body.setSize(16, 16, 0, 0);
    pacman.play('munch');

    const marker = new Phaser.Point();

    pacman.direction = direction;
    if (x && y) {
      pacman.body.reset(x, y);
    }
    return {id, marker, pacman, directions: {}, turn: null};
  }

  updatePlayer (player) {
    const existing = this.players.find(p => player.id === p.id);
    if (!existing) {
      this.players.push(this.createPlayer(player));
      return;
    }

    const {x, y, direction} = player;
    this.tryTurn(existing, direction);
    if (x && y) {
      const {pacman} = existing;
      pacman.body.reset(x, y);
    }
  }

  preload () {
    //  Needless to say, graphics (C)opyright Namco
    this.load.image('dot', '/sprites/dot.png');
    this.load.image('tiles', '/sprites/pacman-tiles.png');
    this.load.spritesheet('pacman', '/sprites/pacman.png', 32, 32);
    this.load.tilemap('map', '/sprites/pacman-map.json', null, Phaser.Tilemap.TILED_JSON);
  }

  create () {
    this.map = this.add.tilemap('map');
    this.map.addTilesetImage('pacman-tiles', 'tiles');

    this.layer = this.map.createLayer('Pacman');

    this.dots = this.add.physicsGroup();

    this.map.createFromTiles(7, this.safetile, 'dot', this.layer, this.dots);

        //  The dots will need to be offset by 6px to put them back in the middle of the grid
    this.dots.setAll('x', 6, false, false, 1);
    this.dots.setAll('y', 6, false, false, 1);

    //  Pacman should collide with everything except the safe tile
    this.map.setCollisionByExclusion([this.safetile], true, this.layer);
  }

  readDirection () {
    const {LEFT, RIGHT, UP, DOWN, NONE} = Phaser;
    const {left, right, up, down} = this.keys;
    if (left.isDown) return LEFT;
    if (right.isDown) return RIGHT;
    if (up.isDown) return UP;
    if (down.isDown) return DOWN;
    return NONE;
  }

  onPacmanEat (listener) {
    this.emitter.on('eat-pacman', listener);
    return this;
  }

  onDotEat (listener) {
    this.emitter.on('eat-dot', listener);
    return this;
  }

  onDirection (listener) {
    this.emitter.on('direction', listener);
    return this;
  }

  emitDirection () {
    const direction = this.readDirection();
    if (direction === Phaser.NONE) return;
    this.emitter.emit('direction', direction);
  }

  tryTurn (player, direction) {
    if (player.pacman.direction === direction) return;
    const nextTile = player.directions[direction];
    const isNextTileSafe = nextTile && nextTile.index === this.safetile;
    if (!isNextTileSafe) return;

    const reverse = player.pacman.direction === this.opposites[direction];
    if (reverse) {
      player.pacman.direction = direction;
      return this.move(player);
    }

    // promise to turn at tile center point
    const x = (player.marker.x * this.gridsize) + (this.gridsize / 2);
    const y = (player.marker.y * this.gridsize) + (this.gridsize / 2);
    const point = new Phaser.Point(x, y);
    player.turn = {direction, point};
  }

  turn (player) {
    if (!player.turn) return;
    const {direction, point} = player.turn;
    const cx = Math.floor(player.pacman.x);
    const cy = Math.floor(player.pacman.y);

    // This needs a threshold, because at high speeds you can't turn
    // because the coordinates skip past
    const xChange = this.math.fuzzyEqual(cx, point.x, this.threshold);
    const yChange = this.math.fuzzyEqual(cy, point.y, this.threshold);
    const canTurn = xChange && yChange;
    if (!canTurn) {
      return;
    }

    //  Grid align before turning
    player.pacman.x = point.x;
    player.pacman.y = point.y;
    player.pacman.direction = direction;

    player.pacman.body.reset(point.x, point.y);
    player.turn = null;

    this.move(player);
  }

  move (player) {
    const {pacman} = player;
    const {direction} = pacman;

    let speed = this.speed;
    const reverse = direction === Phaser.LEFT || direction === Phaser.UP;
    if (reverse) {
      speed = -speed;
    }

    const hozizontal = direction === Phaser.LEFT || direction === Phaser.RIGHT;
    if (hozizontal) {
      pacman.body.velocity.x = speed;
    } else {
      pacman.body.velocity.y = speed;
    }

    //  Reset the scale and angle (Pacman is facing to the right in the sprite sheet)
    pacman.scale.x = 1;
    pacman.angle = 0;

    if (direction === Phaser.LEFT) {
      pacman.scale.x = -1;
    } else if (direction === Phaser.UP) {
      pacman.angle = 270;
    } else if (direction === Phaser.DOWN) {
      pacman.angle = 90;
    }
  }

  killDotAtPoint (x, y) {
    const dot = this.dots.children.find(dot => dot.x === x && dot.y === y);
    if (dot) dot.kill();

    if (this.dots.total === 0) {
      this.dots.callAll('revive');
    }
  }

  eatDot (pacman, dot) {
    dot.kill();
    const player = this.players.find(player => player.pacman === pacman);
    player.score = (player.score || 0) + 1;

    const data = {
      x: dot.x,
      y: dot.y
    };
    this.emitter.emit('eat-dot', data);
  }

  eatMan (pacman1, pacman2) {
    // decide who eats who
    const player1 = this.players.find(player => player.pacman === pacman1);
    const player2 = this.players.find(player => player.pacman === pacman2);
    const shouldReport = player1.isSelf || player2.isSelf;
    if (!shouldReport) return;

    let id;
    let target;
    if (player1.isSelf) {
      id = player1.id;
      target = player2.id;
    } else {
      id = player2.id;
      target = player1.id;
    }

    const score = player1.isSelf ? player1.score : player2.score;
    const eatMessage = {id, target, score};
    this.emitter.emit('eat-pacman', eatMessage);
  }

  update () {
    this.emitDirection();

    for (const player of this.players) {
      const {pacman, marker, directions} = player;
      this.physics.arcade.collide(pacman, this.layer);
      this.physics.arcade.overlap(pacman, this.dots, this.eatDot, null, this);

      for (const opponent of this.players) {
        if (opponent === player) continue;
        this.physics.arcade.overlap(player.pacman, opponent.pacman, this.eatMan, null, this);
      }

      marker.x = this.math.snapToFloor(Math.floor(pacman.x), this.gridsize) / this.gridsize;
      marker.y = this.math.snapToFloor(Math.floor(pacman.y), this.gridsize) / this.gridsize;

      {
        //  Update our grid sensors
        const {x, y} = marker;
        const {index} = this.layer;
        directions[Phaser.LEFT] = this.map.getTileLeft(index, x, y);
        directions[Phaser.RIGHT] = this.map.getTileRight(index, x, y);
        directions[Phaser.UP] = this.map.getTileAbove(index, x, y);
        directions[Phaser.DOWN] = this.map.getTileBelow(index, x, y);
      }

      this.turn(player);
    }
  }
}
