// The base framework for this game was written for Phaser v2.2.2 by Richard Davey (@photonstorm)
// The game logic fails with the most recent rendition of Phaser(v2.6.2)
// Modifications are made to allow for the use of the most recent version.
const {Phaser} = window;

const debugOn = true;

function debug (s) {
  if (debugOn) {
    console.log(s);
  }
}

export default class PacMan {
  constructor() {
    this.game = new Phaser.Game(448, 496, Phaser.AUTO);
    this.game.state.add('Game', this, true);

    this.map = null;
    this.layer = null;
    this.pacman = null;

    this.safetile = 14;
    this.gridsize = 16;

    this.speed = 150;
    this.threshold = 8;

    this.marker = new Phaser.Point();
    this.turnPoint = new Phaser.Point();

    this.directions = [null, null, null, null, null];
    this.opposites = [Phaser.NONE, Phaser.RIGHT, Phaser.LEFT, Phaser.DOWN, Phaser.UP];

    this.current = Phaser.NONE;
    this.turning = Phaser.NONE;
  }

  init() {
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;

    Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);

    this.physics.startSystem(Phaser.Physics.ARCADE);
  }

  preload() {
        // Graphics: (C)opyright Namco
    this.load.image('dot', '/sprites/dot.png');
    this.load.image('tiles', '/sprites/pacman-tiles.png');
    this.load.spritesheet('pacman', '/sprites/pacman.png', 32, 32);
    this.load.tilemap('map', '/sprites/pacman-map.json', null, Phaser.Tilemap.TILED_JSON);
  }

  create() {
    this.map = this.add.tilemap('map');
    this.map.addTilesetImage('pacman-tiles', 'tiles');

    this.layer = this.map.createLayer('Pacman');

    this.dots = this.add.physicsGroup();

    this.map.createFromTiles(7, this.safetile, 'dot', this.layer, this.dots);

        //  The dots will need to be offset by 6px to put them back in the middle of the grid
    this.dots.setAll('x', 6, false, false, 1);
    this.dots.setAll('y', 6, false, false, 1);

        //  Pacman should collide with everything except the safe tile
    this.map.setCollisionByExclusion([], true, this.layer);
    this.map.setCollision(this.safetile, false, this.layer);

        //  Position Pacman at grid location 14x17 (the +8 accounts for his anchor)
    this.pacman = this.add.sprite((14 * 16) + 8, (17 * 16) + 8, 'pacman', 0);
    this.pacman.x = (14 * 16) + 8;
    this.pacman.y = (17 * 16) + 8;
    this.pacman.anchor.set(0.5);
    this.pacman.animations.add('munch', [0, 1, 2, 1], 20, true);

    this.physics.arcade.enable(this.pacman);
    this.pacman.body.setSize(16, 16, 0, 0);

    this.cursors = this.input.keyboard.createCursorKeys();

    this.pacman.play('munch');
    this.move(Phaser.LEFT);
  }

  checkKeys() {
    if (this.cursors.left.isDown && this.current !== Phaser.LEFT) {
      debug('Sending Phaser.LEFT to checkDirection()');
      this.checkDirection(Phaser.LEFT);
    } else if (this.cursors.right.isDown && this.current !== Phaser.RIGHT) {
      debug('Sending Phaser.RIGHT to checkDirection()');
      this.checkDirection(Phaser.RIGHT);
    } else if (this.cursors.up.isDown && this.current !== Phaser.UP) {
      debug('Sending Phaser.UP to checkDirection()');
      this.checkDirection(Phaser.UP);
    } else if (this.cursors.down.isDown && this.current !== Phaser.DOWN) {
      debug('Sending Phaser.DOWN to checkDirection()');
      this.checkDirection(Phaser.DOWN);
    } else {
      //  This forces them to hold the key down to turn the corner
      debug('#set this.turning to Phaser.NONE');
      this.turning = Phaser.NONE;
    }
  }

  // Checks the corresponding direction (up down left or right) to see if it is
  // a valid tile to move to
  checkDirection(turnTo) {
    // Sprite is already set to turn in the provided direction
    if (this.turning === turnTo) {
      debug('this.turning === turnTo');
      return;
    } else if (this.directions[turnTo] === null) {
      // No tile to move to in direction turnTo
      debug('this.directions[turnTo] === null');
      return;
    } else if (this.directions[turnTo].index !== this.safetile) {
      // The target tile to move to is not a safe tile (cant move to that tile)
      debug('this.directions[turnTo].index !== this.safetile');
      return;
    }

    //  Check if they want to turn around and can
    if (this.current === this.opposites[turnTo]) {
      debug(`Calling this.move(turnTo) with value of ${  turnTo}`);
      this.move(turnTo);
    } else {
      debug(`Set this.turning in checkDirection() = ${  turnTo}`);
      this.turning = turnTo;

      this.turnPoint.x = (this.marker.x * this.gridsize) + (this.gridsize / 2);
      this.turnPoint.y = (this.marker.y * this.gridsize) + (this.gridsize / 2);
      debug(`this.turnPoint.x set to: ${  this.turnPoint.x}`);
      debug(`this.turnPoint.y set to: ${  this.turnPoint.y}`);
    }
  }

  turn() {
    const cx = Math.floor(this.pacman.x);
    const cy = Math.floor(this.pacman.y);

    debug('IN TURNING FUNCTION');
    debug(`Math.floor(this.pacman.x) = ${  cx}`);
    debug(`Math.floor(this.pacman.x) = ${  cy}`);

    debug(`this.turnPoint.x = ${  this.turnPoint.x}`);
    debug(`this.turnPoint.y = ${  this.turnPoint.y}`);

    debug(`Difference must be less than: ${  this.threshold}`);

    // This needs a threshold, because at high speeds you can't turn
    // because the coordinates skip past
    const xChange = this.math.fuzzyEqual(cx, this.turnPoint.x, this.threshold);
    const yChange = this.math.fuzzyEqual(cy, this.turnPoint.y, this.threshold);
    if (!(xChange && yChange)) {
      debug('Returning false');
      return false;
    }

    this.pacman.body.reset(this.turnPoint.x, this.turnPoint.y);

    this.move(this.turning);

    this.turning = Phaser.NONE;

    return true;
  }

  move(direction) {
    let speed = this.speed;

    if (direction === Phaser.LEFT || direction === Phaser.UP) {
      speed = -speed;
    }

    if (direction === Phaser.LEFT || direction === Phaser.RIGHT) {
      this.pacman.body.velocity.x = speed;
    } else {
      this.pacman.body.velocity.y = speed;
    }

    //  Reset the scale and angle (Pacman is facing to the right in the sprite sheet)
    this.pacman.scale.x = 1;
    this.pacman.angle = 0;

    if (direction === Phaser.LEFT) {
      this.pacman.scale.x = -1;
    } else if (direction === Phaser.UP) {
      this.pacman.angle = 270;
    } else if (direction === Phaser.DOWN) {
      this.pacman.angle = 90;
    }

    this.current = direction;
  }

  eatDot(pacman, dot) {
    dot.kill();

    if (this.dots.total === 0) {
      this.dots.callAll('revive');
    }
  }

  update() {
    this.physics.arcade.collide(this.pacman, this.layer);
    this.physics.arcade.overlap(this.pacman, this.dots, this.eatDot, null, this);

    // const x = this.math.snapToFloor(Math.floor(this.pacman.x), this.gridsize) / this.gridsize;
    // const y = this.math.snapToFloor(Math.floor(this.pacman.y), this.gridsize) / this.gridsize;
    this.marker.x = this.math.snapToFloor(Math.floor(this.pacman.x), this.gridsize) / this.gridsize;
    this.marker.y = this.math.snapToFloor(Math.floor(this.pacman.y), this.gridsize) / this.gridsize;

    //  Update our grid sensors
    this.directions[1] = this.map.getTileLeft(this.layer.index, this.marker.x, this.marker.y);
    this.directions[2] = this.map.getTileRight(this.layer.index, this.marker.x, this.marker.y);
    this.directions[3] = this.map.getTileAbove(this.layer.index, this.marker.x, this.marker.y);
    this.directions[4] = this.map.getTileBelow(this.layer.index, this.marker.x, this.marker.y);

    this.checkKeys();

    if (this.turning !== Phaser.NONE) {
      this.turn();
    }
  }
}
