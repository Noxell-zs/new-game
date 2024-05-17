importScripts("tf.min.js");
importScripts("core.js");
importScripts("music_vae.js");

/** @type {import('@magenta/music').MusicVAE} */
const model = new music_vae.MusicVAE(
  'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar',
);

const initialize =  model.initialize();

async function getMusic(number = 1) {
  await initialize;

  for (let i = 0; i < number; i++) {
    postMessage((await model.sample(1))[0]);
  }
}

onmessage = (e) => getMusic(e.data);
