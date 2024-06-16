export const sortNumbers = (a: number, b: number): number => a - b;

export function* range(
  start: number,
  stop: number,
  step: number = 1
): Generator<number> {
  for (; start <= stop; start += step) {
    yield start;
  }
}
