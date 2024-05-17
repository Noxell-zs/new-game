importScripts("tf.min.js");
importScripts("core.js");
importScripts("music_rnn.js");

/** @type {{ new(): import('@magenta/music').chords.ChordSymbols }} */
const ChordSymbols = core.chords.ChordSymbols;

const STEPS_PER_CHORD = 8;
const STEPS_PER_PROG = 4 * STEPS_PER_CHORD;

const NUM_REPS = 8;

const allChords = [
  'C', 'D', 'E','F', 'G', 'A', 'B',
  'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm',
];
const allChordsNumber = allChords.length;

function *getRandChord(number){
  for (let i = 0; i < number; i++) {
    yield allChords[Math.floor(Math.random() * allChordsNumber)];
  }
}


/** @type {import('@magenta/music').MusicRNN} */
const model = new music_rnn.MusicRNN(
  'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv',
);

let currentChords;


async function playOnce() {
  const chords = currentChords;

  const root = ChordSymbols.root(chords[0]);
  const seq = {
    quantizationInfo: {stepsPerQuarter: 4},
    notes: [],
    totalQuantizedSteps: 1,
  };

  const contSeq = await model.continueSequence(
    seq,
    STEPS_PER_PROG + (NUM_REPS - 1) * STEPS_PER_PROG - 1,
    0.9,
    chords,
  );

  // Add the continuation to the original.
  contSeq.notes?.forEach((note) => {
    note.quantizedStartStep += 1;
    note.quantizedEndStep += 1;
    seq.notes.push(note);
  });

  const roots = chords.map(ChordSymbols.root);
  for (let i = 0; i < NUM_REPS; i++) {
    for (let j = 0; j < 4; j++) {
      // Add the bass progression.
      seq.notes.push({
        instrument: 1,
        program: 32,
        pitch: 36 + roots[j],
        quantizedStartStep: i * STEPS_PER_PROG + j * STEPS_PER_CHORD,
        quantizedEndStep: i * STEPS_PER_PROG + (j + 1) * STEPS_PER_CHORD,
      });
    }
  }

  // Set total sequence length.
  seq.totalQuantizedSteps = STEPS_PER_PROG * NUM_REPS;

  return seq;
}

const initialize =  model.initialize();

async function getMusic(number = 1) {
  await initialize;

  for (let i = 0; i < number; i++) {
    currentChords = [...getRandChord(4)];
    postMessage(await playOnce());
  }
}

onmessage = (e) => getMusic(e.data);
