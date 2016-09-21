import Debug from 'debug';

import peers, {Peer} from './peer';
import Socket from './socket';

const debug = Debug('app:main');
const client = {id: null};

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
    throw new Error(`Invalid message type "${message.type}"`);
  }
  handler(message);
});

function handleClientId (message) {
  client.id = message.clientId;
}

function handleSignalData (message) {
  const {senderId, signalData} = message;
  peers.signalPeer(senderId, signalData);
}

function handleNewPlayer (message) {
  const {roomId, clientId} = message;
  if (clientId === client.id) return;
  const peer = new Peer(client, clientId, roomId);
  peer.receive(handlePeerMessage);
}

function handleRoomJoined (message) {
  const {roomId, roomMembers} = message;
  roomMembers.forEach(peerId => {
    const peer = new Peer(client, peerId, roomId, true);
    peer.receive(handlePeerMessage);
  });
}

function handlePeerMessage(message) {
  debug('got peer message:', message);
}

function handleRoomJoinError(message) {
  debug('got room join error:', message);
}