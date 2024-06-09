export class Kick {
  context: AudioContext;
  osc?: OscillatorNode;
  gain?: GainNode;
  circle: HTMLDivElement;

  constructor(context: AudioContext) {
    this.context = context;
  }

  setup(): void {
    this.osc = this.context.createOscillator();
    this.gain = this.context.createGain();
    this.osc.connect(this.gain);
    this.gain.connect(this.context.destination);
  }

  trigger(time: number): void {
    this.setup();

    this.osc!.frequency.setValueAtTime(200, time);
    this.gain!.gain.setValueAtTime(0.5, time);

    this.osc!.frequency.exponentialRampToValueAtTime(1, time + 0.5);
    this.gain!.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    this.osc!.start(time);

    this.osc!.stop(time + 0.5);
  }
}
