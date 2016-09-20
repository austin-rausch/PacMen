import {joinRandomGame} from '../services/random';

module.exports = function (client, data) {
  const parsedData = JSON.parse(data);
  const {displayName} = parsedData;
  // const clientId = client.clientId;
  joinRandomGame(client, displayName).then((room) => {
    client.send(`room-joined:${JSON.stringify(room)}`);
  });
};
