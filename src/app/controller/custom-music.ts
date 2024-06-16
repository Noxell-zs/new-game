import {range} from "../utils";

export const getPeaks = (buffer: AudioBuffer): Promise<number[]> => {
  const offlineContext = new OfflineAudioContext(
    1,
    buffer.length,
    buffer.sampleRate,
  );
  const source = offlineContext.createBufferSource();
  source.buffer = buffer;
  const filter = offlineContext.createBiquadFilter();
  filter.type = 'lowpass';
  source.connect(filter);
  filter.connect(offlineContext.destination);
  source.start(0);
  offlineContext.startRendering();

  return new Promise(
    (resolve) =>
      (offlineContext.oncomplete = (e) => {
        const filteredBuffer = e.renderedBuffer;
        const data = filteredBuffer.getChannelData(0);

        const peaksArray: number[] = [];

        const block = filteredBuffer.sampleRate * 3;

        [...range(0, filteredBuffer.length, block)]
          .map((x) => data.slice(x, x + block))
          .forEach((blockElement, blockIndex) => {
            let min = blockElement[0], max = blockElement[0];
            for (const number of blockElement) {
              if (number > max) {
                max = number;
              }
              if (number < min) {
                min = number;
              }
            }

            const threshold = min + (max - min) * 0.75;

            const {length} = blockElement;
            for (let i = 0; i < length; ) {
              if (blockElement[i] > threshold) {
                peaksArray.push((i + blockIndex * length) * 1000 / buffer.sampleRate);
                // Skip forward ~ 1/4s to get past this peak.
                i += 10000;
              }
              i++;
            }
          });

        resolve(peaksArray);
      }),
  );
};

export const getBuffer = (context: AudioContext, file: File): Promise<AudioBuffer> => {
  const reader = new FileReader();

  const result = new Promise<AudioBuffer>(resolve => reader.onload = () =>
    context.decodeAudioData(
      reader.result as ArrayBuffer,
      buffer => resolve(buffer),
    )
  );

  reader.readAsArrayBuffer(file);

  return result;
};
