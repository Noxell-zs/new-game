import {
  MeshRenderer,
  Object3D,
  BoxGeometry,
  LitMaterial,
  UnLitMaterial,
  Color,
} from '@orillusion/core';

export class Wall extends Object3D {
  material: LitMaterial | UnLitMaterial;

  constructor(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
  ) {
    super();

    this.x = x;
    this.y = y;
    this.z = z;

    const meshRender = this.addComponent(MeshRenderer);
    meshRender.geometry = new BoxGeometry(width, height, depth);

    this.material = new LitMaterial();
    this.material.roughness = 0;
    this.material.metallic = 1;
    this.material.clearcoatColor = new Color(1, 0, 0, 1);
    this.material.clearcoatWeight = 0.1;
    this.material.clearcoatRoughnessFactor = 0.1;

    meshRender.material = this.material;
  }
}
