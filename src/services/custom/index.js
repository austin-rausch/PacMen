import * as cache from '../cache';

export {
  joinCustomGame,
  createCustomGame,
  leaveCustomGame
};

function _gameExists (gameName) {
  return cache.roomExists(gameName);
}

function joinCustomGame (gameName, client, displayName) {
  if (!_gameExists(gameName)) {
    return;
  }
  cache.addClientToRoom(gameName, client.clientId);
}

function createCustomGame (gameName, client, displayName) {
  if (_gameExists(gameName)) {
    return;
  }
  cache.createRoom(gameName);
  cache.addClientToRoom(gameName, client.clientId);
}

function leaveCustomGame (gameName, client) {

}
