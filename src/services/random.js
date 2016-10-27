import rooms from '../models/room';

export default function joinRandomGame (client, message) {
  const room = rooms.getUnfilledRoom();
  room.addClient(client);
  room.broadcast({
    type: 'new-player',
    clientId: client.id
  });
  return Promise.resolve();
}
