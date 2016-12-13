import rooms from '../models/room';

export default function joinRandomGame (client, displayName) {
  const room = rooms.getUnfilledRoom();
  room.addClient(client, displayName);
  room.broadcast({
    type: 'new-player',
    clientId: client.id,
    displayName
  });
  return Promise.resolve(room);
}
