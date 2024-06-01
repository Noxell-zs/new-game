import {
  Object3D,
  ComponentBase,
  Vector3,
} from '@orillusion/core';
import {planeHalfSize} from '../consts';

const rad2Deg = (theta: number): number =>
  (theta * 180) / Math.PI;

export interface Enemy extends Object3D {
  playerPosition?: Vector3;
  clone(): Enemy;
}

class BulletScript extends ComponentBase {
  public onUpdate() {
    const enemy = this.object3D as Enemy;
    const playerPosition = enemy.playerPosition!;

    enemy.x = enemy.x * 0.98 + playerPosition.x * 0.02;
    enemy.z = enemy.z * 0.98 + playerPosition.z * 0.02;

    const x = playerPosition.x - enemy.x,
      z = playerPosition.z - enemy.z;
    const dist = (x**2 + z**2) ** 0.5 || 1;

    let angle = Math.acos(z / dist);
    if (Math.asin(x / dist) < 0) {
      angle *= -1;
    }

    enemy.rotationY = rad2Deg(angle);
  }
}

export const getEnemy = (rootEnemy: Enemy): Enemy => {
  const enemy = rootEnemy.clone();
  enemy.playerPosition = rootEnemy.playerPosition;

  enemy.x = Math.random() * planeHalfSize * 2 - planeHalfSize;
  enemy.z = Math.random() * planeHalfSize * 2 - planeHalfSize;

  enemy.addComponent(BulletScript);

  return enemy;
};
