import Debug from 'debug';
import clients from '../models/client';

const debug = Debug('app:signal-client');

export default function (client, data) {
  const {receiverId, signalData} = data;
  const senderId = client.id;
  const receiver = clients.all.find(socket => socket.id === receiverId);
  if (!receiver) {
    debug(`"${receiverId}" not found`);
    return;
  }

  receiver.send({
    type: 'signal-data',
    senderId,
    signalData
  });
}
