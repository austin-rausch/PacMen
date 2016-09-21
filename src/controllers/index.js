import joinRandomGame from './join-random-game';
import signalClient from './signal-client';

const handlers = {
  'join-random-game': joinRandomGame,
  'signal-client': signalClient
};

export default handlers;
