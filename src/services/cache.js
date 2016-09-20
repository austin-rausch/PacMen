const rooms = {};
const clients = {};

export {
  getClientById,
  addClientById,
  removeClientById,
  roomExists,
  createRoom,
  deleteRoom,
  addClientToRoom,
  getRoom,
  removeClientFromRoom
};

function getClientById (clientId) {
  return clients[clientId];
}

function addClientById (clientId, client) {
  clients[clientId] = client;
  return true;
}

function removeClientById (clientId) {
  delete clients[clientId];
}

function roomExists (roomId) {
  return rooms[roomId] !== undefined;
}

function createRoom (roomId) {
  rooms[roomId] = {
    id: roomId,
    count: 0,
    members: []
  };
  return rooms[roomId];
}

function deleteRoom (roomId) {
  return delete rooms[roomId];
}

function addClientToRoom (roomId, clientId) {
  const room = rooms[roomId];

  if (!room) {
    return null;
  }

  room.members.push(clientId);
  room.count++;
  return room;
}

function removeClientFromRoom (roomId, clientId) {
  const room = rooms[roomId];

  if(!room) {
    return;
  }

  const clientIndex = room.indexOf(clientId);
  room.members.splice(clientIndex, 1);
  room.count--;
  return room;
}

function getRoom (roomId) {
  return rooms[roomId];
}
