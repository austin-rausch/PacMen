import Debug from 'debug';

import {Peer} from './peer';
import PeerController from './peerController';
import Socket from './socket';
import Engine from './engine';
import Pacman from './pacman';
import Ghost from './ghost';

const debug = Debug('app:main');
const client = {id: null};
const engine = new Engine();
const peers = new PeerController();

const pinky = new Ghost();
pinky.subscribe(state => {
  engine.updatePlayer(state);
});

const clyde = new Ghost();
clyde.subscribe(state => {
  engine.updatePlayer(state);
});

const pacman = new Pacman('me');
Pacman.bind(pacman, engine);

const handlers = {
  'signal-data': handleSignalData,
  'new-player': handleNewPlayer,
  'room-joined': handleRoomJoined,
  'room-join-error': handleRoomJoinError,
  'client-id': handleClientId
};

client.socket = new Socket();

// join game
client.socket.send({
  type: 'join-random-game',
  displayName: 'Mike Tyson'
});

client.socket.receive(message => {
  const handler = handlers[message.type];
  if (!handler) {
    // throw new Error(`Invalid message type "${message.type}"`);
    return;
  }
  handler(message);
});

function handleClientId (message) {
  client.id = message.clientId;
  peers.id = message.clientId;
}

function handleSignalData (message) {
  const {senderId, signalData} = message;
  peers.signalPeer(senderId, signalData);
}

function handleNewPlayer (message) {
  const {roomId, clientId} = message;
  if (clientId === client.id) return;
  const peer = new Peer(client, clientId, roomId);
  peers.addPeer(peer);
  peer.receive(handlePeerMessage);
}

function handleRoomJoined (message) {
  const {roomId, roomMembers} = message;
  roomMembers.forEach(peerId => {
    if (peerId === client.id) return;
    const peer = new Peer(client, peerId, roomId, true);
    peers.addPeer(peer);
    peer.receive(handlePeerMessage);
  });
  return peers.resolveMaster().then(() => {
    if (peers.master === true) {
      console.log('I am master');
    } else {
      console.log('master id is: ', peers.master.id);
    }
  });
}

function handlePeerMessage(message, peer) {
  debug('got peer message:', message);
}

function handleRoomJoinError(message) {
  debug('got room join error:', message);
}
