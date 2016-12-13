import joinRandomGame from '../services/random';

export default function (client, data) {
  const {displayName, receipt} = data;
  joinRandomGame(client, displayName).then(room => {
    const message = {
      type: 'room-joined',
      roomId: room.id,
      roomMembers: room.clients.map((c) => {
        return {id: c.id, displayName: c.displayName};
      }),

      displayName,
      receipt
    };
    client.send(message);
  });
}
