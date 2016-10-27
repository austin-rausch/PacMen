import joinRandomGame from '../services/random';

export default function (client, data) {
  const {displayName} = data;
  joinRandomGame(client, displayName).then(room => {
    client.send(`room-joined:${JSON.stringify(room)}`);
  });
}
