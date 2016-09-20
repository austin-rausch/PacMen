import * as cache from '../services/cache';
module.exports = function (client, data) {
  const parsedData = JSON.parse(data);
  const {destClientId, signalData} = parsedData;
  const sourceClientId = client.clientId;
  const destPayload = {
    sourceClientId: sourceClientId,
    signalData: signalData
  };
  const destClient = cache.getClientById(destClientId);
  destClient.send(`signal-data:${JSON.stringify(destPayload)}`);
};
