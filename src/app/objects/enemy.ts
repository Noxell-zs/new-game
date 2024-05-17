import {
  MeshRenderer,
  Object3D,
  BoxGeometry, LitMaterial, Color, ComponentBase, Vector3
} from "@orillusion/core";
import {planeHalfSize} from "../consts";


class BulletScript extends ComponentBase {
  public onUpdate() {
    const enemy = this.object3D as Enemy;
    enemy.x = enemy.x * 0.98 + enemy.playerPosition.x * 0.02;
    enemy.z = enemy.z * 0.98 + enemy.playerPosition.z * 0.02;
  }
}

export class Enemy extends Object3D {
  constructor(
    public playerPosition: Vector3
  ) {
    super();

    this.x = Math.random() * planeHalfSize * 2 - planeHalfSize;
    this.y = 2.5;
    this.z = Math.random() * planeHalfSize * 2 - planeHalfSize;

    const meshRender = this.addComponent(MeshRenderer);
    meshRender.geometry = new BoxGeometry(0.75, 3, 0.75);

    const material = new LitMaterial();
    material.baseColor = new Color(0, 1, 1, 1);
    material.roughness = 0;
    material.metallic = 1;
    meshRender.material = material;
    this.addComponent(BulletScript);
  }
}
