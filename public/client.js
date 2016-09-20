/* global SimplePeer */
const MAX_RECONNECT_ATTEMPTS = 30;

const WEBSOCKET_MESSAGE_HANDLERS = {
  'signal-data': handleSignalData,
  'new-player': handleNewPlayer,
  'room-joined': handleRoomJoined,
  'room-join-error': handleRoomJoinError,
  'client-id': handleClientId
};

function handleClientId (clientId) {
  window.PacMen.clientId = clientId;
}

function handleSignalData (data) {
  const parsedData = JSON.parse(data);
  const {signalData, sourceClientId} = parsedData;
  const client = window.PacMen;
  const room = client.room;
  const peer = room[sourceClientId];
  if (!peer) {
    console.log(`Peer for ${sourceClientId} does not exist`);
    return;
  }
  peer.signal(signalData);
}

function handleNewPlayer (newPlayerId) {
  const client = window.PacMen;

  if (newPlayerId === client.clientId) {
    return;
  }

  const clientRoom = client.room;
  const ws = client.wsConnection;
  const peer = clientRoom[newPlayerId] = new SimplePeer({});

  peer.on('signal', (signalData) => {
    const payload = {
      destClientId: newPlayerId,
      signalData: signalData
    };
    ws.send(`signal-client:${JSON.stringify(payload)}`);
  });

  peer.on('connect', () => {
    console.log('Peer connected');
    peer.connected = true;
    peer.on('data', handlePeerMessage);
  });
}

function handleRoomJoined (data) {
  const room = JSON.parse(data);
  const members = room.members;
  const client = window.PacMen;
  const ws = client.wsConnection;

  if (!client.room) {
    client.room = {};
  }

  const clientRoom = client.room;

  members.forEach((memberId) => {
    if (memberId === client.clientId) {
      return;
    }
    const peer = clientRoom[memberId] = new SimplePeer({initiator: true});
    peer.on('signal', (signalData) => {
      const payload = {
        destClientId: memberId,
        signalData: signalData
      };
      ws.send(`signal-client:${JSON.stringify(payload)}`);
    });
    peer.on('connect', () => {
      console.log('Peer connected');
      peer.connected = true;
      peer.on('data', handlePeerMessage);
    })
  });
}

function handlePeerMessage (message) {
  console.log('got message from peer: ', message.toString());
}

function handleRoomJoinError (data) {
  //display error
}

function createWsClientConnection () {
  let client = window.PacMen;
  let ws = client.wsConnection = new WebSocket('ws://' + location.host);
  let connectionAttempts = window.PacMen.reconnectionAttempts;
  ws.addEventListener('open', addWebSocketListeners);

  ws.addEventListener('error', () => {
    // display error message *TODO*
    // attempt to reconnect.
    if (connectionAttempts > MAX_RECONNECT_ATTEMPTS) {
      return;
      // display cannot reconnect message *TODO*
    }
    connectionAttempts++;
    createWsClientConnection();
  });

  ws.addEventListener('close', () => {
    // display close message *TODO*
    // close means that the server intentionally ended the connection
    // do not retry connection.
  });

}

function addWebSocketListeners () {
  let client = window.PacMen;
  let ws = client.wsConnection;
  client.reconnectionAttempts = 0;
  ws.addEventListener('message', (messageEvent) => {
    handleWebSocketMessage(messageEvent.data);
  });
  const payload = {
    displayName: 'John Paul Jones'
  };
  ws.send(`join-random-game:${JSON.stringify(payload)}`);
}

function handleWebSocketMessage (message) {
  const splitIndex = message.indexOf(':');
  const messageType = message.substring(0, splitIndex);
  const messagePayload = message.substring(splitIndex + 1);
  const handler = WEBSOCKET_MESSAGE_HANDLERS[messageType];

  if (!handler) {
    console.log(`No handler for message type: ${messageType}`);
    return;
  }

  handler(messagePayload);
}

function broadCastToPeers (message) {
  const client = window.PacMen;
  const room = client.room;
  const roomKeys = Object.keys(room);
  let peer;
  roomKeys.forEach((key) => {
    peer = room[key];
    if (!peer.connected) {
      return;
    }
    peer.send(message);
  });
}

window.addEventListener('load', () => {
  let client = window.PacMen = window.PacMen || {};
  client.reconnectionAttempts = 0;
  createWsClientConnection();
});
