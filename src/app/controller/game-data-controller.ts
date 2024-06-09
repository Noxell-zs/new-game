export class GameDataController {
  health: number = 100;
  score: number = 0;

  damage(): number {
    this.health -= 5;

    if (this.health <= 0) {
      const bestScore = +(localStorage.getItem('bestScore') || 0);
      if (this.score > bestScore) {
        localStorage.setItem('bestScore', this.score.toString());
      }
      window.location.reload();
    }

    return this.health;
  }
}
