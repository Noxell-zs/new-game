export class GameDataController {
  health: number = 100;
  score: number = 0;

  gameOver(): void {
    const bestScore = +(localStorage.getItem('bestScore') || 0);
    if (this.score > bestScore) {
      localStorage.setItem('bestScore', this.score.toString());
    }
    window.location.reload();
  }

  damage(): number {
    this.health -= 5;

    if (this.health <= 0) {
      this.gameOver();
    }

    return this.health;
  }
}
