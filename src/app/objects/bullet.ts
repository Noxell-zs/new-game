import {
  BlendMode,
  Color,
  ComponentBase,
  MeshRenderer,
  Object3D,
  SphereGeometry,
  Transform,
  UnLitMaterial
} from "@orillusion/core";
import {planeHalfSize} from "../consts";


class BulletScript extends ComponentBase {
  public onUpdate() {
    const bullet = this.object3D as Bullet;
    const {forward} = this.transform;
    bullet.x += forward.x;
    bullet.y += forward.y;
    bullet.z += forward.z;

    if (
      bullet.x < -planeHalfSize ||
      bullet.x > planeHalfSize ||
      bullet.y < 0 ||
      bullet.y > planeHalfSize ||
      bullet.z < -planeHalfSize ||
      bullet.z > planeHalfSize
    ) {
      bullet.destroy();
    }
  }
}

export class Bullet extends Object3D {
  constructor(controllerTransform: Transform) {
    super();

    const meshRenderer = this.addComponent(MeshRenderer);
    const bulletGeometry = new SphereGeometry(0.75, 15, 15);
    const bulletMaterial = new UnLitMaterial();
    bulletMaterial.baseColor = new Color(1, 0.5, 0.2, 0.9);
    bulletMaterial.transparent = true;
    bulletMaterial.blendMode = BlendMode.ALPHA;
    meshRenderer.material =  bulletMaterial;
    meshRenderer.geometry = bulletGeometry;

    this.y = 2;
    this.transform.localPosition = controllerTransform.localPosition;
    this.transform.localRotation = controllerTransform.localRotation;
    this.addComponent(BulletScript);
  }
}
