export class Kick {
  private context: AudioContext;
  private osc: OscillatorNode;
  private gain: GainNode;

  constructor(context: AudioContext) {
    this.context = context;
  }

  private setup(): void {
    this.osc = this.context.createOscillator();
    this.gain = this.context.createGain();
    this.osc.connect(this.gain);
    this.gain.connect(this.context.destination);
  }

  trigger(): void {
    this.setup();
    const time = this.context.currentTime;

    this.osc.frequency.setValueAtTime(150 + Math.random() * 100, time);
    this.gain.gain.setValueAtTime(0.5, time);

    this.osc.frequency.exponentialRampToValueAtTime(1, time + 0.75);
    this.gain.gain.exponentialRampToValueAtTime(0.01, time + 0.75);

    this.osc.start(time);
    this.osc.stop(time + 0.75);
  }
}
