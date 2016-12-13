export default class Scoreboard {
  constructor (selector) {
    this.container = document.querySelector(selector);
    this.players = [];
  }

  addPlayer (player, peer) {
    player.score = 0;
    player.displayName = peer.displayName;
    this.players.push(player);
  }

  updatePlayer (player) {
    const {id, score} = player;
    const existing = this.players.find(player => player.id === id);
    /* if (!existing) {
      this.players.push({id, displayName, score});
    } else {
      existing.score = score;
    } */
    if (!existing) {
      console.log('Update scoreboard player, DNE.');
      return;
    }
    existing.score = score;
    this.render();
  }

  removePlayer (id) {
    this.players = this.players.filter(player => {
      return player.id !== id;
    });
    this.render();
  }

  render () {
    const html = this.players.map(player => {
      const {id, displayName, score, index} = player;
      return `<div class='score player${index % 6}'>
        <b>${score}</b>
        <span>${displayName || id.slice(-5)}</span>
      </div>`;
    }).join('');
    this.container.innerHTML = html;
  }
}
