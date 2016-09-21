import clients from '../models/client';

export default function (client, message) {
  const {receiverId, signalData} = message;
  const senderId = client.id;
  const receiver = clients.all.find(client => client.id === receiverId);
  receiver.send({
    type: 'signal-data',
    senderId,
    signalData
  });
}
