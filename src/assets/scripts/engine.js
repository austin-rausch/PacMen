const {Phaser} = window;

export default class Pacman {
  constructor () {
    this.game = new Phaser.Game(448, 496, Phaser.AUTO);
    this.game.state.add('Game', this, true);

    this.map = null;
    this.layer = null;
    this.pacman = null;

    this.safetile = 14;
    this.gridsize = 16;

    this.speed = 150;
    this.threshold = 3;

    this.marker = new Phaser.Point();
    this.turnPoint = new Phaser.Point();

    this.directions = [null, null, null, null, null];
    this.opposites = [Phaser.NONE, Phaser.RIGHT, Phaser.LEFT, Phaser.DOWN, Phaser.UP];

    this.current = Phaser.NONE;
    this.turning = Phaser.NONE;
  }

  init () {
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;

    Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);

    this.physics.startSystem(Phaser.Physics.ARCADE);
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

        //  Position Pacman at grid location 14x17 (the +8 accounts for his anchor)
    this.pacman = this.add.sprite((14 * 16) + 8, (17 * 16) + 8, 'pacman', 0);
    this.pacman.anchor.set(0.5);
    this.pacman.animations.add('munch', [0, 1, 2, 1], 20, true);

    this.physics.arcade.enable(this.pacman);
    this.pacman.body.setSize(16, 16, 0, 0);

    this.cursors = this.input.keyboard.createCursorKeys();

    this.pacman.play('munch');
    this.move(Phaser.LEFT);
  }

  checkKeys() {
    const {LEFT, RIGHT, UP, DOWN} = Phaser;
    const {left, right, up, down} = this.cursors;
    if (left.isDown) return this.tryTurn(LEFT);
    if (right.isDown) return this.tryTurn(RIGHT);
    if (up.isDown) return this.tryTurn(UP);
    if (down.isDown) return this.tryTurn(DOWN);
  }

  tryTurn(direction) {
    if (this.current === direction) return;
    const nextTile = this.directions[direction];
    const isNextTileSafe = nextTile && nextTile.index === this.safetile;
    if (isNextTileSafe) {
      const reverse = this.current === this.opposites[direction];
      if (reverse) {
        // move immediately
        this.move(direction);
      } else {
        // promise to turn at tile center point
        this.turning = direction;
        this.turnPoint.x = (this.marker.x * this.gridsize) + (this.gridsize / 2);
        this.turnPoint.y = (this.marker.y * this.gridsize) + (this.gridsize / 2);
      }
    }
  }

  turn () {
    const cx = Math.floor(this.pacman.x);
    const cy = Math.floor(this.pacman.y);

    // This needs a threshold, because at high speeds you can't turn
    // because the coordinates skip past
    const xChange = this.math.fuzzyEqual(cx, this.turnPoint.x, this.threshold);
    const yChange = this.math.fuzzyEqual(cy, this.turnPoint.y, this.threshold);
    const canTurn = xChange && yChange;
    if (!canTurn) {
      return;
    }

        //  Grid align before turning
    this.pacman.x = this.turnPoint.x;
    this.pacman.y = this.turnPoint.y;

    this.pacman.body.reset(this.turnPoint.x, this.turnPoint.y);

    this.move(this.turning);

    this.turning = Phaser.NONE;

    return true;
  }

  move (direction) {
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

  eatDot (pacman, dot) {
    dot.kill();

    if (this.dots.total === 0) {
      this.dots.callAll('revive');
    }
  }

  update () {
    this.physics.arcade.collide(this.pacman, this.layer);
    this.physics.arcade.overlap(this.pacman, this.dots, this.eatDot, null, this);

    this.marker.x = this.math.snapToFloor(Math.floor(this.pacman.x), this.gridsize) / this.gridsize;
    this.marker.y = this.math.snapToFloor(Math.floor(this.pacman.y), this.gridsize) / this.gridsize;

    {
      //  Update our grid sensors
      const {x, y} = this.marker;
      const {index} = this.layer;
      this.directions[Phaser.LEFT] = this.map.getTileLeft(index, x, y);
      this.directions[Phaser.RIGHT] = this.map.getTileRight(index, x, y);
      this.directions[Phaser.UP] = this.map.getTileAbove(index, x, y);
      this.directions[Phaser.DOWN] = this.map.getTileBelow(index, x, y);
    }

    this.checkKeys();

    if (this.turning !== Phaser.NONE) {
      this.turn();
    }
  }
}
