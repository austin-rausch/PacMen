export default class Scoreboard {
  constructor (selector) {
    this.container = document.querySelector(selector);
    this.players = [];
  }

  updatePlayer (player) {
    const {id, displayName, score} = player;
    const existing = this.players.find(player => player.id === id);
    if (!existing) {
      this.players.push({id, displayName, score});
    } else {
      existing.score = score;
    }
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
      const {id, displayName, score} = player;
      return `<div class='score'>
        <b>${score}</b>
        <span>${displayName || id.slice(-5)}</span>
      </div>`;
    }).join('');
    this.container.innerHTML = html;
  }
}
