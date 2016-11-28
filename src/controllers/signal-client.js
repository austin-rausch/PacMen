import clients from '../models/client';

export default function (client, data) {
  const {receiverId, signalData} = data;
  const senderId = client.id;
  const receiver = clients.all.find(socket => socket.id === receiverId);
  receiver.send({
    type: 'signal-data',
    senderId,
    signalData
  });
}
