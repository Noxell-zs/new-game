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
  Texture, PointerEvent3D, GUICanvas, Vector3,
} from '@orillusion/core';
import {ActionController} from './controller/action-controller';
import {planeHalfSize} from './consts';
import {Bullet} from './objects/bullet';
import {Wall} from './objects/wall';
import {Enemy, getEnemy} from './objects/enemy';
import {GameDataController} from './controller/game-data-controller';
import {INoteSequence, Player} from '@magenta/music';
import {Button} from "./objects/button";
import {getFile} from "./controller/load-file";
import {
  ParticleSystem,
  ParticleMaterial,
  ParticleStandardSimulator,
  ParticleEmitterModule,
  ShapeType,
  EmitLocation,
  ParticleGravityModifierModule,
  ParticleOverLifeColorModule,
} from '@orillusion/particle';
import {sortNumbers} from "./utils";
import {Circle, circleLifetime} from "./objects/circle";
import {Kick} from "./controller/audio-kick";
import {getBuffer, getPeaks} from "./controller/custom-music";


const modes = ['default', 'vae', 'rnn', 'custom'] as const;
type Modes = typeof modes[number];
const tempoValues = [30, 60, 120, 180] as const;
const windowsValues = [50, 100, 500, 1000] as const;

export class App {
  private setHealth: (value: string | number) => string;
  private setScore: (value: string | number) => string;
  private player: Object3D;
  private scene3D: Scene3D;
  private bitmapTexture2D: BitmapTexture2D;
  private groundTexture: Texture;
  private readonly enemies = new Set<Enemy>();
  private readonly bullets = new Set<Bullet>();
  private readonly walls = new Set<Wall>();
  private readonly gameDataController = new GameDataController();
  private readonly canvas = document.querySelector('#gfx-main') as HTMLCanvasElement;
  private started = false;
  private view: View3D;
  private cameraObj: Object3D;
  private gui: GUICanvas;
  private startTime: number = 0;
  private circleTexture2D: BitmapTexture2D;
  private viewPanel: Object3D;
  private actionController: ActionController;
  private readonly audioContext = new AudioContext();
  private readonly kick = new Kick(this.audioContext);

  private readonly sequences: INoteSequence[] = [];
  private tempo: number = tempoValues[1];
  private timeWindow: number = windowsValues[1];
  private worker?: Worker;
  private rootEnemy: Enemy;
  private file?: File;
  private mode: Modes = 'default';
  private simpleMode = false;

  private beatSequence?: Array<number>;
  private beatTarget: number = 0;
  private canAttack = true;
  private readyBullets: Set<number>;

  private spawnEnemies(number: number = 3): void {
    for (let i = 0; i < number; ++i) {
      const enemy = getEnemy(this.rootEnemy);
      this.enemies.add(enemy);
      this.scene3D.addChild(enemy);
    }
  }

  private stepOnSequence(): void {
    const targetMoment = this.beatSequence?.[this.beatTarget];
    if (targetMoment != undefined) {
      const now = Date.now() - this.startTime;

      for (const bulletMoment of this.readyBullets) {
        if (now < bulletMoment - circleLifetime) {
          break;
        } else if (now <= bulletMoment) {
          this.readyBullets.delete(bulletMoment);
          this.viewPanel.addChild(new Circle(this.circleTexture2D));
        } else {
          this.readyBullets.delete(bulletMoment);
        }
      }

      if (now < targetMoment - 50) {
        this.canAttack = false;
      } else if (now <= targetMoment + this.timeWindow) {
        this.canAttack = true;
      } else {
        ++this.beatTarget;
        this.canAttack = false;
      }

    } else {
      this.canAttack = true;
    }
  }

  private stepDefault(): void {
    const now = Date.now();

    this.canAttack = now <= this.startTime + this.timeWindow;

    if (now >= this.startTime + circleLifetime) {
      this.kick.trigger();
      this.startTime = now;
      this.viewPanel.addChild(new Circle(this.circleTexture2D));
    }
  }

  async init() {
    await Engine3D.init({
      canvasConfig: {canvas: this.canvas},
      renderLoop: () => {
        if (!this.started) return;

        enemiesLoop: for (const enemy of this.enemies) {
          const enemyPosition = enemy.localPosition;

          for (const bullet of this.bullets) {
            const bulletPosition = bullet.localPosition;
            if (!bulletPosition) {
              continue;
            }

            if (
              (enemyPosition.x - bulletPosition.x) ** 2 +
                (enemyPosition.z - bulletPosition.z) ** 2 <=
                1 &&
              (enemyPosition.y + 2 - bulletPosition.y) ** 2 <= 4
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
        if (!this.enemies.size && this.rootEnemy.playerPosition) {
          this.spawnEnemies(3);
        }

        if (this.mode === 'default') {
          this.stepDefault();
        } else {
          this.stepOnSequence();
        }

      },
    });
    this.scene3D = new Scene3D();

    this.rootEnemy = await Engine3D.res.loadGltf(
      'static/models/CesiumMan_compress.gltf'
    ) as Enemy;
    this.rootEnemy.scaleX = 2;
    this.rootEnemy.scaleY = 2;
    this.rootEnemy.scaleZ = 2;
    this.rootEnemy.y = 0;

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

    this.cameraObj = new Object3D();
    const camera = this.cameraObj.addComponent(Camera3D);
    camera.perspective(60, window.innerWidth / window.innerHeight, 1, 5000);
    this.scene3D.addChild(this.cameraObj);

    const light = new Object3D();
    light.rotationX = 45;
    light.rotationY = 0;
    light.rotationZ = 0;
    const lightComponent = light.addComponent(DirectLight);
    lightComponent.intensity = 4;
    lightComponent.castShadow = true;
    this.scene3D.addChild(light);

    this.view = new View3D();
    this.view.scene = this.scene3D;
    this.view.camera = camera;

    await Engine3D.res.loadFont('static/fonts/font.fnt');
    await Engine3D.res.loadAtlas('static/atlas/UI_atlas.json');

    this.groundTexture = await Engine3D.res.loadTexture('static/img/floor.png');
    this.groundTexture.useMipmap = true;

    this.bitmapTexture2D = new BitmapTexture2D();
    await this.bitmapTexture2D.load('static/img/plus.png');

    this.circleTexture2D = new BitmapTexture2D();
    this.circleTexture2D.flipY = true;
    await this.circleTexture2D.load('static/img/circle.png');

    const plane = new Object3D();
    plane.transform.localPosition.set(0, 0, 0);
    const planeMaterial = new LitMaterial();
    planeMaterial.baseMap = this.groundTexture;
    planeMaterial.setUniformVector4(
      'transformUV1',
      new Vector4(0, 0, planeHalfSize * 2, planeHalfSize * 2),
    );
    planeMaterial.roughness = 1;
    planeMaterial.metallic = 0;
    const planeMr = plane.addComponent(MeshRenderer);
    planeMr.geometry = new PlaneGeometry(100, 100, 1, 1);
    planeMr.material = planeMaterial;
    this.scene3D.addChild(plane);

    this.gui = this.view.enableUICanvas();

    this.initMainMenu();
    await this.initParticles();

    return Engine3D.startRenderView(this.view);
  }

  async initParticles(): Promise<void> {
    {
      const objParticles = new Object3D();
      objParticles.y = 100;
      this.scene3D.addChild(objParticles);

      const particleSystem = objParticles.addComponent(ParticleSystem);

      const material = new ParticleMaterial();
      material.baseMap = await Engine3D.res.loadTexture('static/img/fx_a_fragment_003.png');

      particleSystem.geometry = new PlaneGeometry(2, 8, 1, 1, Vector3.Z_AXIS);
      particleSystem.material = material;

      const simulator = particleSystem.useSimulator(ParticleStandardSimulator);

      const emitter = simulator.addModule(ParticleEmitterModule);
      emitter.maxParticle = 10000;
      emitter.duration = 10;
      emitter.emissionRate = 1000;
      emitter.startLifecycle.setScalar(1);
      emitter.shapeType = ShapeType.Box;
      emitter.boxSize = new Vector3(3*planeHalfSize, 1, 3*planeHalfSize);
      emitter.emitLocation = EmitLocation.Shell;

      const gravityModifier = simulator.addModule(ParticleGravityModifierModule);
      gravityModifier.gravity = new Vector3(0, -7, 0);

      const overLifeColorModule = simulator.addModule(ParticleOverLifeColorModule);
      overLifeColorModule.startColor = new Color(0, 0, 1);
      overLifeColorModule.startAlpha = 0.1;
      overLifeColorModule.endColor = new Color(0, 1, 0.5);
      overLifeColorModule.endAlpha = 1.0;

      particleSystem.play();
    }
    {
      const objParticles = new Object3D();
      objParticles.y = 0.1;
      this.scene3D.addChild(objParticles);

      const particleSystem = objParticles.addComponent(ParticleSystem);

      const material = new ParticleMaterial();
      material.baseMap = await Engine3D.res.loadTexture('static/img/fx_a_glow_003.png');

      particleSystem.geometry = new PlaneGeometry(1, 1, 1, 1, Vector3.Z_AXIS);
      particleSystem.material = material;

      const simulator = particleSystem.useSimulator(ParticleStandardSimulator);

      const emitter = simulator.addModule(ParticleEmitterModule);
      emitter.maxParticle = 10000;
      emitter.duration = 10;
      emitter.emissionRate = 1000;
      emitter.startLifecycle.setScalar(1);
      emitter.shapeType = ShapeType.Box;
      emitter.boxSize = new Vector3(2*planeHalfSize, 0.3, 2*planeHalfSize);
      emitter.emitLocation = EmitLocation.Shell;

      const overLifeColorModule = simulator.addModule(ParticleOverLifeColorModule);
      overLifeColorModule.startColor = new Color(1, 0, 0);
      overLifeColorModule.startAlpha = 0.1;
      overLifeColorModule.endColor = new Color(1, 0, 0.5);
      overLifeColorModule.endAlpha = 1.0;

      particleSystem.play();
    }
  }

  initMainMenu(): void {
    const viewPanel = new Object3D();
    const guiPanel = viewPanel.addComponent(ViewPanel);
    this.gui.addChild(viewPanel);

    // load music and simple mode
    {
      const y = -200;
      const loadButton = new Button('Load music');
      loadButton.buttonLabel.uiTransform.x = 100;
      loadButton.buttonLabel.uiTransform.y = y;
      loadButton.buttonLabel.uiTransform.resize(150, 50);
      loadButton.addEventListener(
        PointerEvent3D.PICK_CLICK_GUI,
        () => getFile()
          .then(file => {
            this.file = file;
            loadButton.select(!!file);
          })
          .catch(() => loadButton.select(false)),
        this,
      );
      viewPanel.addChild(loadButton);

      const simpleButton = new Button('Enable simple mode');
      simpleButton.buttonLabel.uiTransform.x = -100;
      simpleButton.buttonLabel.uiTransform.y = y;
      simpleButton.buttonLabel.uiTransform.resize(250, 50);
      simpleButton.addEventListener(
        PointerEvent3D.PICK_CLICK_GUI,
        () => this.simpleMode = simpleButton.toggle(),
        this,
      );
      viewPanel.addChild(simpleButton);
    }

    const scoreQuad = new Object3D();
    viewPanel.addChild(scoreQuad);
    const score = scoreQuad.addComponent(UITextField);
    const scoreText = localStorage.getItem('bestScore');
    score.text = scoreText ? `Best score: ${scoreText}` : '';
    score.color = new Color(1, 0.5, 0, 1);
    score.fontSize = 64;
    score.alignment = TextAnchor.LowerRight;
    score.uiTransform.resize(512, 160);

    const resizeFunction = () => setTimeout(() => {
      guiPanel.uiTransform.resize(this.canvas.width, this.canvas.height);
      score.uiTransform.x = this.canvas.width / -2 + 160;
      score.uiTransform.y = this.canvas.height / 2;
    });
    resizeFunction();
    addEventListener('resize', resizeFunction);

    // change mode
    {
      const y = 100;
      const modeButtons: {[key in Modes]?: Button} = {};
      const selectModeButton = () => {
        for (const mode of modes) {
          modeButtons[mode]!.select(mode === this.mode);
        }
      };

      modes.forEach((item, index) => {
        const button = new Button(item);
        button.buttonLabel.uiTransform.resize(150, 50);
        button.buttonLabel.uiTransform.x = index * 150 - 150;
        button.buttonLabel.uiTransform.y = y;

        button.addEventListener(
          PointerEvent3D.PICK_CLICK_GUI,
          () => {
            this.mode = item;
            selectModeButton();
          },
          this,
        );

        viewPanel.addChild(button);
        modeButtons[item] = button;
      });
      selectModeButton();

      const modeLabelQuad = new Object3D();
      viewPanel.addChild(modeLabelQuad);
      const modeLabel = modeLabelQuad.addComponent(UITextField);
      modeLabel.text = 'Music mode:';
      modeLabel.color = new Color(1, 0.5, 0, 1);
      modeLabel.fontSize = 25;
      modeLabel.alignment = TextAnchor.MiddleCenter;
      modeLabel.uiTransform.resize(150, 50);
      modeLabel.uiTransform.x = -300;
      modeLabel.uiTransform.y = y;
    }

    // change tempo
    {
      const y = 0;
      const modeButtons: {[key: number]: Button} = {};

      const selectModeButton = () => {
        for (const value of tempoValues) {
          modeButtons[value]!.select(value === this.tempo);
        }
      };

      tempoValues.forEach((item, index) => {
        const button = new Button(`${item} bpm`);
        button.buttonLabel.uiTransform.resize(150, 50);
        button.buttonLabel.uiTransform.x = index * 150 - 150;
        button.buttonLabel.uiTransform.y = y;

        button.addEventListener(
          PointerEvent3D.PICK_CLICK_GUI,
          () => {
            this.tempo = item;
            selectModeButton();
          },
          this,
        );

        viewPanel.addChild(button);
        modeButtons[item] = button;
      });
      selectModeButton();

      const modeLabelQuad = new Object3D();
      viewPanel.addChild(modeLabelQuad);
      const modeLabel = modeLabelQuad.addComponent(UITextField);
      modeLabel.text = 'Tempo:';
      modeLabel.color = new Color(1, 0.5, 0, 1);
      modeLabel.fontSize = 25;
      modeLabel.alignment = TextAnchor.MiddleCenter;
      modeLabel.uiTransform.resize(150, 50);
      modeLabel.uiTransform.x = -300;
      modeLabel.uiTransform.y = y;
    }

    // change click window
    {
      const y = -100;
      const modeButtons: {[key: number]: Button} = {};

      const selectModeButton = () => {
        for (const value of windowsValues) {
          modeButtons[value]!.select(value === this.timeWindow);
        }
      };

      windowsValues.forEach((item, index) => {
        const button = new Button(`${item} ms`);
        button.buttonLabel.uiTransform.resize(150, 50);
        button.buttonLabel.uiTransform.x = index * 150 - 150;
        button.buttonLabel.uiTransform.y = y;

        button.addEventListener(
          PointerEvent3D.PICK_CLICK_GUI,
          () => {
            this.timeWindow = item;
            selectModeButton();
          },
          this,
        );

        viewPanel.addChild(button);
        modeButtons[item] = button;
      });
      selectModeButton();

      const modeLabelQuad = new Object3D();
      viewPanel.addChild(modeLabelQuad);
      const modeLabel = modeLabelQuad.addComponent(UITextField);
      modeLabel.text = 'Click window:';
      modeLabel.color = new Color(1, 0.5, 0, 1);
      modeLabel.fontSize = 25;
      modeLabel.alignment = TextAnchor.MiddleCenter;
      modeLabel.uiTransform.resize(150, 50);
      modeLabel.uiTransform.x = -300;
      modeLabel.uiTransform.y = y;
    }

    // start
    {
      const startButton = new Button('Start');
      startButton.buttonLabel.uiTransform.resize(100, 50);
      startButton.buttonLabel.uiTransform.x = 0;
      startButton.buttonLabel.uiTransform.y = 200;
      startButton.addEventListener(
        PointerEvent3D.PICK_CLICK_GUI,
        () => {
          if (this.mode === 'custom' && !this.file) {
            return;
          }

          this.gui.removeChild(viewPanel);
          this.start();
          removeEventListener('resize', resizeFunction);
        },
        this,
        {once: true},
      );
      viewPanel.addChild(startButton);
    }
  }

  async start(): Promise<void> {
    this.viewPanel = new Object3D();
    const guiPanel = this.viewPanel.addComponent(ViewPanel);
    this.gui.addChild(this.viewPanel);

    this.walls.add(new Wall(10, 2, -10, 1, 4, 20));
    this.walls.add(new Wall(10, 2, 10, 20, 4, 1));
    for (const wall of this.walls) {
      wall.material.baseMap = this.groundTexture;
      this.scene3D.addChild(wall);
    }

    const imageQuad = new Object3D();
    this.viewPanel.addChild(imageQuad);
    const image = imageQuad.addComponent(UIImage);
    image.uiTransform.resize(32, 32);
    image.sprite = makeAloneSprite('center', this.bitmapTexture2D);
    this.viewPanel.addChild(imageQuad);

    const scoreQuad = new Object3D();
    this.viewPanel.addChild(scoreQuad);
    const score = scoreQuad.addComponent(UITextField);
    score.text = `${this.gameDataController.score}`;
    score.color = new Color(0, 1, 0, 1);
    score.fontSize = 64;
    score.alignment = TextAnchor.LowerLeft;
    score.uiTransform.resize(256, 256);
    score.uiTransform.x = this.canvas.width / 2;
    score.uiTransform.y = this.canvas.height / 2;
    this.setScore = (value: number | string) => (score.text = `${value}`);

    const healthQuad = new Object3D();
    this.viewPanel.addChild(healthQuad);
    const health = healthQuad.addComponent(UITextField);
    health.text = `${this.gameDataController.health}`;
    health.color = new Color(1, 0, 0, 1);
    health.fontSize = 64;
    health.alignment = TextAnchor.LowerRight;
    health.uiTransform.resize(256, 256);
    health.uiTransform.x = this.canvas.width / -2;
    health.uiTransform.y = this.canvas.height / 2;
    this.setHealth = (value: number | string) => (health.text = `${value}`);

    addEventListener('resize', () =>
      setTimeout(() => {
        guiPanel.uiTransform.resize(this.canvas.width, this.canvas.height)
        score.uiTransform.x = this.canvas.width / 2;
        health.uiTransform.x = this.canvas.width / -2;
        score.uiTransform.y = health.uiTransform.y = this.canvas.height / 2;
      }),
    );

    this.player = new Object3D();
    this.player.transform.localPosition.set(0, 2, 0);
    this.scene3D.addChild(this.player);
    this.rootEnemy.playerPosition = this.player.transform.localPosition;

    this.actionController = this.cameraObj.addComponent(ActionController);
    this.actionController.moveSpeed = 10;
    this.actionController.distance = 10;
    this.actionController.target = this.player;
    this.actionController.canvas = this.canvas;
    this.actionController.walls = this.walls;

    if (this.simpleMode) {
      this.actionController.enemies = this.enemies;
    }
    this.actionController.clickTarget = (value?: any) => {
      if (this.canAttack) {
        const bullet = new Bullet(this.actionController.transform);
        this.bullets.add(bullet);
        this.scene3D.addChild(bullet);
      }
    };

    this.spawnEnemies(3);


    switch (this.mode) {
      case 'rnn':
        this.worker = new Worker(new URL('./workers/rnn-worker', import.meta.url));
        break;
      case 'vae':
        this.worker = new Worker(new URL('./workers/vae-worker', import.meta.url));
        break;
      case 'custom':
        await this.playMusicCustom();
        break;
      case 'default':
        this.startTime = Date.now();
        break;
    }

    if (this.worker) {
      await new Promise(resolve => {
        this.worker!.onmessage = (e) => {
          this.sequences.push(e.data);
          resolve(null);
        };
        this.worker!.postMessage(3);
      });
      this.playMusicNN();
    }

    this.started = true;
  }

  async playMusicCustom(): Promise<void> {
    const source = this.audioContext.createBufferSource();
    const buffer = await getBuffer(this.audioContext, this.file!);
    this.beatSequence = await getPeaks(buffer);
    this.readyBullets = new Set(this.beatSequence);

    source.buffer = buffer;
    source.addEventListener(
      'ended',
      () => this.gameDataController.gameOver(),
      {once: true},
    );
    source.connect(this.audioContext.destination);
    source.start(this.audioContext.currentTime);

    this.beatTarget = 0;
    this.startTime = Date.now();
  }

  playMusicNN(): void {
    Player.tone.context.resume();

    const action = () => {
      const seq = this.sequences.pop();
      if (!seq) {
        setTimeout(() => action(), 2000);
        return;
      }

      if (this.sequences.length < 3) {
        this.worker?.postMessage(3);
      }

      const coef = 1000 * 60 / this.tempo / seq.quantizationInfo!.stepsPerQuarter!;

      this.readyBullets = new Set(
        seq.notes!.map((note) => note.quantizedStartStep! * coef).sort(sortNumbers)
      );
      this.beatSequence = [...this.readyBullets];

      player.start(seq, this.tempo);
      this.beatTarget = 0;
      this.startTime = Date.now();

    };

    const player = new Player(false, {
      run: (note) => null,
      stop: action,
    });
    player.stop();

    action();
  }
}
