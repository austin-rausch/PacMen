import Debug from 'debug';
import tactic from 'tactic';

const {Defer} = tactic;

import {Peer} from './peer';
import PeerController from './peerController';
import Socket from './socket';
import Engine from './engine';
import Pacman from './pacman';
import Scoreboard from './scoreboard';

const debug = Debug('app:main');
localStorage.debug = 'app:*';

const {Phaser} = window;
const client = {id: null};
const peers = new PeerController();
const scoreboard = new Scoreboard('#scoreboard');
const randomNames = [
  'Billy Bob',
  'Mike Tyson',
  'John Paul Jones',
  'Simon Fan',
  '(>^.^)>',
  'p != np',
  'Sun Tzu'
];

let engine;
let pacman;

window.engine = () => engine;
/* const pinky = new Ghost();
pinky.subscribe(state => {
  engine.updatePlayer(state);
});

const clyde = new Ghost();
clyde.subscribe(state => {
  engine.updatePlayer(state);
});*/

const startWrap = document.getElementById('startWrap');
const startButton = document.getElementById('startButton');
const leaveButton = document.getElementById('leaveButton');
const displayNameInput = document.getElementById('displayNameInput');
let displayName;
startButton.addEventListener('click', function () {
  displayName = displayNameInput.value.trim();
  // did not provide a display name, lets give them something random.
  if (displayName === '') {
    displayName = randomNames[Math.floor(Math.random() * (randomNames.length + 1))];
  }
  startGame(displayName);
  addClass(startButton, 'hidden');
  addClass(startWrap, 'hidden');
});
leaveButton.addEventListener('click', function () {
  // stop game & leave game
  removeClass(startButton, 'hidden');
  removeClass(startWrap, 'hidden');
});

function hasClass(el, className) {
  if (el.classList) return el.classList.contains(className);
  else return !!el.className.match(new RegExp(`(\\s|^)${className}(\\s|$)`));
}

function addClass(el, className) {
  if (el.classList) el.classList.add(className);
  else if (!hasClass(el, className)) el.className += ` ${className}`;
}

function removeClass(el, className) {
  if (el.classList) el.classList.remove(className);
  else if (hasClass(el, className)) {
    const reg = new RegExp(`(\\s|^)${className}(\\s|$)`);
    el.className = el.className.replace(reg, ' ');
  }
}

client.socket = new Socket();

// join game
/* client.socket.send({
  type: 'join-random-game',
  displayName: 'Mike Tyson'
});*/

function dispatch (message) {
  if (peers.isMaster()) {
    handlePeerMessage(message);
    return;
  }

  peers.sendMaster(message);
}

function bindActions () {
  let lastMove = {x: 0, y: 0};
  pacman.subscribe(({id, direction}) => {
    const player = engine.players.find(player => player.id === id);
    if (!player) return;

    const {x, y} = player.pacman;
    if (lastMove.x === x && lastMove.y === y) return;
    lastMove = {x, y};

    const message = {
      type: 'pacman-move',
      sender: peers.id,
      id: peers.id,
      direction,
      x, y
    };
    dispatch(message);
  });

  engine.onPacmanEat(data => {
    // console.log('onPacmanEat');
    const message = {
      ...data,
      type: 'pacman-eat',
      sender: peers.id,
      id: peers.id
    };
    dispatch(message);
  });

  engine.onDotEat(data => {
    const message = {
      ...data,
      type: 'pacman-dot',
      sender: peers.id,
      id: peers.id
    };
    dispatch(message);
  });
}

const handlers = {
  'signal-data': handleSignalData,
  'new-player': handleNewPlayer,
  'room-joined': handleRoomJoined,
  'room-join-error': handleRoomJoinError,
  'client-id': handleClientId
};

client.socket.receive(message => {
  const handler = handlers[message.type];
  if (!handler) {
    // throw new Error(`Invalid message type "${message.type}"`);
    return;
  }
  handler(message);
});

function startGame (displayName) {
  client.socket.send({
    type: 'join-random-game',
    displayName: displayName
  });
}

function forgetPeer (peer) {
  const {id} = peer;
  engine.removePlayer(id);
  scoreboard.removePlayer(id);
}

const waitForId = new Defer();

function handleClientId (message) {
  const id = message.clientId;
  peers.id = id;
  pacman = new Pacman(id);
  engine = new Engine(id, displayName);

  engine.scoreboard = scoreboard; // I know this is messy but idc
  Pacman.bind(pacman, engine);
  bindActions();
  engine.startGame();
  waitForId.resolve(id);
}

function handleSignalData (message) {
  const {senderId, signalData} = message;
  peers.signalPeer(senderId, signalData);
}

function handleNewPlayer (message) {
  waitForId.then(selfId => {
    debug('handleNewPlayer', message);
    const {roomId, clientId, displayName} = message;
    if (clientId === selfId) return;
    const peer = new Peer(client, clientId, roomId, false, displayName);
    peers.addPeer(peer);
    peer.receive(handlePeerMessage);
    peer.on('disconnect', () => forgetPeer(peer));
  });
}

function handleRoomJoined (message) {
  waitForId.then(selfId => {
    debug('handleRoomJoined', message);
    const {roomId, roomMembers} = message;
    roomMembers.forEach(member => {
      const {id, displayName} = member;
      if (id === selfId) return;
      const peer = new Peer(client, id, roomId, true, displayName);
      peers.addPeer(peer);
      peer.receive(handlePeerMessage);
      peer.on('disconnect', () => forgetPeer(peer));
    });
    return peers.resolveMaster().then(() => {
      const result = peers.isMaster() ? 'Master' : 'Not master';
      debug(`election results: ${result}`);
    });
  });
}

function handlePeerMessage(message, peer) {
  // debug('handlePeerMessage', message, peer);

  // When a pacman reports its current position
  // or a direction change
  if (message.type === 'pacman-move') {
    const {sender, id, x, y, direction} = message;
    if (peers.id !== sender) {
      const update = {id, x, y, direction};
      engine.updatePlayer(update, peer);
    }
  }

  if (message.type === 'pacman-ate') {
    const {updates} = message;
    updates.forEach(update => {
      engine.updatePlayer(update, peer);
    });
  }

  if (message.type === 'pacman-dot') {
    const {id, score, x, y} = message;
    engine.killDotAtPoint(x, y);
    scoreboard.updatePlayer({id, score}, peer);
  }

  if (!peers.isMaster()) return;

  if (message.type === 'pacman-move') {
    peers.broadcast(message, peer);
  }

  if (message.type === 'pacman-dot') {
    peers.broadcast(message);
  }

  // When a pacman thinks it hit another pacman
  // We open a window of time for another pacman
  // to acknowledge the interaction
  if (message.type === 'pacman-eat') {
    // console.log('message.type = pacman-eat');
    const {id, target, score} = message;
    attemptEat({id, target, score})
      .then(result => {
        // console.log('pacman-eat.then', result);
        const {loser} = result;
        const {x, y} = spawnPosition();
        const loserUpdate = {
          id: loser,
          direction: Phaser.LEFT,
          x, y
        };
        const decision = {
          type: 'pacman-ate',
          updates: [loserUpdate]
        };
        peers.broadcast(decision);
        engine.updatePlayer(loserUpdate, peer);
      })
      .catch(reason => {
        // console.log('pacman-eat.catch', reason);
        // assume no other peer ack'd so we drop the eat
      });
  }
}

let spawnIndex = 0;
const spawnPoints = [
  {x: 16, y: 16},
  {x: 416, y: 16},
  {x: 16, y: 224},
  {x: 416, y: 224},
  {x: 16, y: 464},
  {x: 416, y: 464}
].map(point => ({x: point.x + 8, y: point.y + 8}));
function spawnPosition () {
  spawnIndex = (spawnIndex + 1) % spawnPoints.length;
  return spawnPoints[spawnIndex];
}
window.spawnPosition = spawnPosition;

let openEats = [];
function attemptEat ({id, target, score}) {
  const dupEat = openEats.find(eat => {
    return eat.target === target && eat.id === id;
  });
  if (dupEat) {
    const error = new Error('Dup open eat');
    return Promise.reject(error);
  }
  const existingEat = openEats.find(eat => {
    return eat.target === id && eat.id === target;
  });
  if (!existingEat) {
    const defer = new Defer();
    const newEat = {id, target, score, defer};
    openEats.push(newEat);
    setTimeout(() => {
      if (newEat.done) return;
      // reap unack'd eat
      openEats = openEats.filter(eat => eat !== newEat);
      newEat.defer.reject(new Error('No one acknowledged eat'));
    }, 500); // latency is typically 5-200 ms, 500 ms should allow for full RTT.
    return defer;
  }
  existingEat.done = true;
  openEats = openEats.filter(eat => eat !== existingEat);

  if (score === existingEat.score) {
    const reason = new Error('Score tied, no winner');
    existingEat.defer.reject(reason);
    return Promise.reject(reason);
  }

  let winner;
  let loser;
  if (score > existingEat.score) {
    winner = id;
    loser = target;
  } else {
    winner = target;
    loser = id;
  }
  const decision = {winner, loser};
  // console.log(decision);
  existingEat.defer.resolve(decision);
  return Promise.resolve(decision);
}

function handleRoomJoinError(message) {
  debug('handleRoomJoinError', message);
}
