import uuid from 'node-uuid';
import Debug from 'debug';

const roomStore = [];
const maxParticipants = 10;

function getUnfilledRoom() {
  const room = roomStore.find(room => {
    return room.clients.length < maxParticipants;
  });
  if (room) return room;
  return new Room();
}

export class Room {
  constructor() {
    this.id = uuid.v4();
    this.clients = [];
    this.debug = Debug(`app:room:${this.id}`);

    roomStore.push(this);
  }

  addClient(client) {
    this.clients.push(client);
  }

  broadcast(data) {
    this.clients.forEach(client => client.send(data));
  }
}

export default {
  all: roomStore,
  getUnfilledRoom
};
