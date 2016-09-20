import fs from 'fs';

const handlers = _generateHandlers();

export {
  getHandler
};

function getHandler(messageType) {
  return handlers[messageType];
}

function _generateHandlers () {
  const messageHandlers = {};
  const jsFilePattern = /^[a-z\-]+\.js$/;
  const files = fs.readdirSync(__dirname);

  files.forEach((file) => {
    if (file === 'index.js' || !jsFilePattern.test(file)) {
      return;
    }
    messageHandlers[file.replace('.js', '')] = require(`${__dirname}/${file}`);
  });
  return messageHandlers;
}
