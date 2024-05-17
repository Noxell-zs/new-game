import '../style.css';
import {
  Color,
  Engine3D,
  Scene3D,
  Object3D,
  Camera3D,
  View3D,
  LitMaterial,
  MeshRenderer,
  DirectLight,
  PlaneGeometry,
  Vector4,
  SkyRenderer,
  BitmapTextureCube,
  ViewPanel,
  UITextField,
  TextAnchor,
  UIImage,
  makeAloneSprite,
  BitmapTexture2D,
  Texture,
} from '@orillusion/core';
import {ActionController} from './controller/action-controller';
import {planeHalfSize} from "./consts";
import {Bullet} from "./objects/bullet";
import {Wall} from "./objects/wall";
import {Enemy} from "./objects/enemy";
import {GameDataController} from "./controller/game-data-controller";
import {Player} from "@magenta/music";


export class App {
  private setHealth: (value: string | number) => string;
  private setScore: (value: string | number) => string;
  private player: Object3D;
  private scene3D: Scene3D;
  private bitmapTexture2D: BitmapTexture2D;
  private groundTexture: Texture;
  private enemies = new Set<Enemy>();
  private bullets = new Set<Bullet>();
  private walls = new Set<Wall>();
  private gameDataController = new GameDataController();
  private canvas = document.querySelector('#gfx-main') as HTMLCanvasElement;
  private started = false;

  private sequences: any[] = [];
  private tempo = 180;
  private worker: Worker;

  private spawnEnemies(number: number = 3): void {
    for (let i = 0; i < number; ++i) {
      const enemy = new Enemy(this.player.transform.localPosition);
      this.enemies.add(enemy);
      this.scene3D.addChild(enemy);
    }
  }

  async init() {
    await Engine3D.init({
      canvasConfig: {canvas: this.canvas},
      renderLoop: ()=> {
        if (!this.started) return;

        enemiesLoop: for (const enemy of this.enemies) {
          const enemyPosition = enemy.localPosition;

          for (const bullet of this.bullets) {
            const bulletPosition =  bullet.localPosition;
            if (!bulletPosition) {
              continue;
            }

            if (
              (enemyPosition.x - bulletPosition.x) ** 2 +
              (enemyPosition.z - bulletPosition.z) ** 2 <= 1
              && (enemyPosition.y - bulletPosition.y) ** 2 <= 4
            ) {
              this.enemies.delete(enemy);
              this.bullets.delete(bullet);
              enemy.destroy();
              bullet.destroy();
              this.setScore(++this.gameDataController.score);
              continue enemiesLoop;
            }
          }

          if (
            (enemyPosition.x - this.player.x) ** 2 +
            (enemyPosition.z - this.player.z) ** 2 <= 1
          ) {
            this.enemies.delete(enemy);
            enemy.destroy();
            this.setHealth(this.gameDataController.damage());
          }
        }

        if (!this.enemies.size) {
          this.spawnEnemies(3);
        }

      },
    });
    this.scene3D = new Scene3D();

    const evnMap = new BitmapTextureCube();
    await evnMap.load([
      'static/img/floor.png',
      'static/img/floor.png',
      'static/img/floor.png',
      'static/img/floor.png',
      'static/img/floor.png',
      'static/img/floor.png',
    ]);

    const sky = this.scene3D.addComponent(SkyRenderer);
    this.scene3D.envMap = evnMap;
    sky.map = evnMap;

    const cameraObj = new Object3D();
    const camera = cameraObj.addComponent(Camera3D);
    camera.perspective(60, window.innerWidth / window.innerHeight, 1, 5000);
    this.scene3D.addChild(cameraObj);


    const light = new Object3D();
    light.rotationX = 45;
    light.rotationY = 0;
    light.rotationZ = 0;
    const lightComponent = light.addComponent(DirectLight);
    lightComponent.intensity = 4;
    lightComponent.castShadow = true;
    this.scene3D.addChild(light);

    const view = new View3D();
    view.scene = this.scene3D;
    view.camera = camera;

    await Engine3D.res.loadFont('static/fonts/font.fnt');

    this.groundTexture = await Engine3D.res.loadTexture('static/img/floor.png');
    this.groundTexture.useMipmap = true;

    this.bitmapTexture2D = new BitmapTexture2D();
    await this.bitmapTexture2D.load('static/img/plus.png');

    const plane = new Object3D();
    plane.transform.localPosition.set(0, 0, 0);
    const planeMaterial = new LitMaterial();
    planeMaterial.baseMap = this.groundTexture;
    planeMaterial.setUniformVector4(
      'transformUV1',
      new Vector4(0, 0, planeHalfSize * 2, planeHalfSize * 2)
    );
    planeMaterial.roughness = 1;
    planeMaterial.metallic = 0;
    const planeMr = plane.addComponent(MeshRenderer);
    planeMr.geometry = new PlaneGeometry(100, 100, 1, 1);
    planeMr.material = planeMaterial;
    this.scene3D.addChild(plane);

    this.worker = new Worker(
      // @ts-ignore
      new URL('./workers/vae-worker', import.meta.url),
    );


    let first = true;
    this.worker.onmessage = (e) => {
      if (first) {
        this.start(view, cameraObj)
      }
      first = false;
      this.sequences.push(e.data);
    }
    this.worker.postMessage(5);

    return Engine3D.startRenderView(view);
  }

  async start(
    view: View3D,
    cameraObj: Object3D,
  ): Promise<void> {
    this.walls.add(new Wall(10, 2, -10, 1, 4, 20));
    this.walls.add(new Wall(10, 2, 10, 20, 4, 1));
    for (const wall of this.walls) {
      wall.material.baseMap = this.groundTexture;
      this.scene3D.addChild(wall);
    }

    const gui = view.enableUICanvas();
    const viewPanel: Object3D = new Object3D();
    const guiPanel = viewPanel.addComponent(ViewPanel);
    gui.addChild(viewPanel);

    const imageQuad = new Object3D();
    viewPanel.addChild(imageQuad);
    const image = imageQuad.addComponent(UIImage);
    image.uiTransform.resize(32, 32);
    image.sprite = makeAloneSprite('center', this.bitmapTexture2D);
    viewPanel.addChild(imageQuad);

    const scoreQuad = new Object3D();
    viewPanel.addChild(scoreQuad);
    const score = scoreQuad.addComponent(UITextField);
    score.text = `${this.gameDataController.score}`;
    score.color = new Color(0, 1, 0, 1);
    score.fontSize = 64;
    score.alignment = TextAnchor.LowerLeft;
    score.uiTransform.resize(256, 256);
    score.uiTransform.x = this.canvas.width / 2;
    score.uiTransform.y = this.canvas.height / 2;
    this.setScore = (value: number | string) => score.text = `${value}`;

    const healthQuad = new Object3D();
    viewPanel.addChild(healthQuad);
    const health = healthQuad.addComponent(UITextField);
    health.text = `${this.gameDataController.health}`;
    health.color = new Color(1, 0, 0, 1);
    health.fontSize = 64;
    health.alignment = TextAnchor.LowerRight;
    health.uiTransform.resize(256, 256);
    health.uiTransform.x = this.canvas.width / -2;
    health.uiTransform.y = this.canvas.height / 2;
    this.setHealth = (value: number | string) => health.text = `${value}`;

    addEventListener('resize', () => setTimeout(() => {
      guiPanel.uiTransform.resize(this.canvas.width, this.canvas.height);
      score.uiTransform.x = this.canvas.width / 2;
      health.uiTransform.x = this.canvas.width / -2;
      score.uiTransform.y = health.uiTransform.y = this.canvas.height / 2;
    }));


    this.player = new Object3D();
    this.player.transform.localPosition.set(0, 2, 0);
    this.scene3D.addChild(this.player);


    const controller = cameraObj.addComponent(ActionController);
    controller.moveSpeed = 10;
    controller.distance = 10;
    controller.target = this.player;
    controller.canvas = this.canvas;
    controller.clickTarget = (value?: any) => {
      const bullet = new Bullet(controller.transform);
      this.bullets.add(bullet);
      this.scene3D.addChild(bullet);
    };

    this.spawnEnemies(3);

    this.playMusic();
    this.started = true;
  }

  playMusic(): void {
    Player.tone.context.resume();

    const action = () => {
      const seq = this.sequences.pop();
      if (!seq) {
        setTimeout(() => action(), 2000);
        return;
      }

      if (this.sequences.length < 3) {
        this.worker.postMessage(5);
      }

      const coef =
        60 / this.tempo / seq.quantizationInfo.stepsPerQuarter;
      const arr = [
        ...new Set(seq.notes.map((note: any) => note.quantizedStartStep!)),
      ].sort();

      player.start(seq, this.tempo);
    };

    const player = new Player(false, {
      run: (note) => null,
      stop: action,
    });
    player.stop();

    action();
  }

}
