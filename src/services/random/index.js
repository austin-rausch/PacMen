import * as cache from '../cache';
import uuid from 'uuid';

export {
  joinRandomGame
};

let currentTopRoom;

const MAX_ROOM_PARTICIPANTS = 10;

function joinRandomGame (client, displayName) {
  return new Promise((resolve, reject) => {
    if (!currentTopRoom ||
              currentTopRoom.count > MAX_ROOM_PARTICIPANTS) {
      currentTopRoom = cache.createRoom(uuid.v4());
    }
    cache.addClientToRoom(currentTopRoom.id, client.clientId);
    _broadcastToRoom(currentTopRoom, `new-player:${client.clientId}`);
    resolve(currentTopRoom);
  });
}

function _broadcastToRoom (room, message) {
  const members = room.members;
  members.forEach((memberId) => {
    const member = cache.getClientById(memberId);
    member.send(message);
  });
}
