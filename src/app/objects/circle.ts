import {
  BitmapTexture2D,
  Color, ComponentBase,
  Engine3D, makeAloneSprite,
  Object3D,
  TextAnchor,
  UIButton,
  UIButtonTransition, UIImage,
  UIInteractiveStyle,
  UITextField
} from "@orillusion/core";
import {Enemy} from "./enemy";

const circleLifetime = 1000;
const circleSize = 160;
const circleDiff = circleSize / circleLifetime;

class CircleScript extends ComponentBase {
  public onUpdate() {
    const object = this.object3D as Circle;

    const lifetime = Date.now() - object.startTime;
    if (lifetime > circleLifetime) {
      object.destroy();
    } else {
      object.circle.uiTransform.resize(
        circleSize - circleDiff * lifetime,
        circleSize - circleDiff * lifetime
      );
    }
  }
}

export class Circle extends Object3D {
  startTime: number;
  circle: UIImage;

  constructor(texture: BitmapTexture2D) {
    super();

    this.circle = this.addComponent(UIImage);
    this.circle.uiTransform.resize(circleSize, circleSize);
    this.circle.sprite = makeAloneSprite('circle', texture);

    this.addComponent(CircleScript);
    this.startTime = Date.now();
  }
}
