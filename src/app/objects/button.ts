import {
  Color,
  Engine3D,
  Object3D,
  TextAnchor,
  UIButton,
  UIButtonTransition,
  UIInteractiveStyle,
  UITextField
} from "@orillusion/core";

export class Button extends Object3D {
  guiButton: UIButton;
  buttonLabel: UITextField;
  selected = false;

  constructor(text: string) {
    super();

    this.guiButton = this.addComponent(UIButton);
    this.guiButton.normalSprite = Engine3D.res.getGUISprite('button-up');
    this.guiButton.downSprite = Engine3D.res.getGUISprite('button-down');
    this.guiButton.overSprite = Engine3D.res.getGUISprite('button-over');
    this.guiButton.disableSprite = Engine3D.res.getGUISprite('button-disable');
    this.guiButton.setStyleColor(UIInteractiveStyle.NORMAL, new Color(1, 1, 1, 1));
    this.guiButton.setStyleColor(UIInteractiveStyle.DOWN, new Color(0.5, 0.5, 1, 1));
    this.guiButton.setStyleColor(UIInteractiveStyle.OVER, new Color(0.5, 1, 0.5, 1));
    this.guiButton.setStyleColor(UIInteractiveStyle.DISABLE, new Color(0.5, 0.5, 0.5, 1));
    this.guiButton.transition = UIButtonTransition.COLOR;

    this.buttonLabel = this.addComponent(UITextField);
    this.buttonLabel.text = text;
    this.buttonLabel.fontSize = 24;
    this.buttonLabel.color = new Color(1, 0.8, 0.4);
    this.buttonLabel.alignment = TextAnchor.MiddleCenter;
  }

  select(value: boolean): void {
    this.selected = value;
    this.guiButton.setStyleColor(UIInteractiveStyle.NORMAL, value
      ? new Color(1, 0.1, 0.1, 1)
      : new Color(1, 1, 1, 1)
    );
  }

  toggle(): boolean {
    this.select(!this.selected);
    return this.selected;
  }
}
