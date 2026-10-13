import { createStore } from "../store.js";

// Rain, a fire, wind and a low hum, made in the browser from noise: no sound files to ship,
// and nothing to fetch. Each plays while its level is above zero.

export type SoundId = "regn" | "brasa" | "vind" | "brus";

export const levels = createStore<Record<SoundId, number>>({ regn: 0, brasa: 0, vind: 0, brus: 0 });

let context: AudioContext | null = null;
const playing = new Map<SoundId, GainNode>();

const SECONDS = 4;

function buffer(audio: AudioContext, fill: (data: Float32Array) => void) {
  const made = audio.createBuffer(1, audio.sampleRate * SECONDS, audio.sampleRate);
  fill(made.getChannelData(0));
  return made;
}

const white = (data: Float32Array) =>
  data.forEach((_value, index) => (data[index] = Math.random() * 2 - 1));

// Brown noise: each sample a small step from the last, so it rumbles instead of hisses.
function brown(data: Float32Array) {
  let last = 0;
  for (let index = 0; index < data.length; index++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[index] = last * 3.5;
  }
}

// A fire's crackle: short, falling clicks at random moments.
function crackle(data: Float32Array) {
  for (let index = 0; index < data.length; index++) {
    if (Math.random() > 0.9996) {
      const length = 200 + Math.random() * 600;
      for (let step = 0; step < length && index + step < data.length; step++) {
        data[index + step] = (Math.random() * 2 - 1) * (1 - step / length) * 0.8;
      }
    }
  }
}

function source(audio: AudioContext, fill: (data: Float32Array) => void) {
  const node = audio.createBufferSource();
  node.buffer = buffer(audio, fill);
  node.loop = true;
  node.start();
  return node;
}

function filter(audio: AudioContext, type: BiquadFilterType, frequency: number) {
  const node = audio.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  return node;
}

// Each sound's graph, ending in the gain it is turned up and down by.
const SOUNDS: Record<SoundId, (audio: AudioContext, out: GainNode) => void> = {
  regn: (audio, out) => {
    const high = filter(audio, "highpass", 500);
    source(audio, white)
      .connect(high)
      .connect(filter(audio, "lowpass", 7000))
      .connect(out);
  },
  brus: (audio, out) => void source(audio, brown).connect(out),
  vind: (audio, out) => {
    const band = filter(audio, "bandpass", 450);
    const gust = audio.createOscillator();
    const depth = audio.createGain();
    gust.frequency.value = 0.07;
    depth.gain.value = 300;
    gust.connect(depth).connect(band.frequency);
    gust.start();
    source(audio, brown).connect(band).connect(out);
  },
  brasa: (audio, out) => {
    source(audio, brown)
      .connect(filter(audio, "lowpass", 300))
      .connect(out);
    source(audio, crackle)
      .connect(filter(audio, "highpass", 1200))
      .connect(out);
  },
};

function start(id: SoundId) {
  context ??= new AudioContext();
  const gain = context.createGain();
  gain.connect(context.destination);
  SOUNDS[id](context, gain);
  playing.set(id, gain);
  return gain;
}

/** 0 is silent; the first sound turned up starts the audio, as browsers only allow on a click. */
export function setLevel(id: SoundId, level: number) {
  levels.set({ ...levels.get(), [id]: level });
  const gain = playing.get(id) ?? (level > 0 ? start(id) : null);
  if (!gain || !context) return;
  gain.gain.setTargetAtTime(level * level, context.currentTime, 0.15);
}
