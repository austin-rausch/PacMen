import joinRandomGame from '../services/random';

export default function (client, data) {
  const {displayName} = data;
  joinRandomGame(client, displayName).then(room => {
    const message = {
      type: 'room-joined',
      roomId: room.id,
      roomMembers: room.clients.map((c) => c.id)
    };
    if (data.receipt) {
      message.reciept = data.receipt;
    }
    client.send(message);
  });
}
