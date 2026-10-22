/**
 * 生成多媒体演示页的两段自制音频（public/audio/，随项目 MIT）：
 * - stereo.wav：音频播放页（频谱 + 滚动歌词）与波形页「片段 2」——五声音阶旋律 + 低音 + 反拍轻打击，立体声分声部
 * - audio.wav：波形页「片段 1」——单声道琶音，整体先渐强后渐弱
 *
 * 此前两段都是纯正弦调制，波形是一条起伏均匀的「香肠」，频谱只有一根谱线，看不出播放器与可视化的效果。
 * 现在每个音符有起音与指数衰减（波形上是一个个音头）、带泛音（频谱有多根谱线），时长与格式不变（16 kHz / 16 bit / 8 秒），
 * 文件体积与 size-budget.json 的 publicMB 不受影响；歌词时间轴（src/demo/lyrics.ts）按 8 秒编排，同样不受影响。
 *
 * 用法：node scripts/make-demo-audio.mjs
 * 确定性：无 Math.random、无当前时间，噪声用固定种子的线性同余发生器，重复执行产物字节一致。
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio');
const RATE = 16_000;
const SECONDS = 8;
const FRAMES = RATE * SECONDS;

/** 十二平均律：A4 = 440 Hz */
const NOTE = (name) => {
  const [, letter, octave] = /^([A-G]#?)(\d)$/.exec(name);
  const index = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(letter);
  return 440 * 2 ** ((index - 9) / 12 + (Number(octave) - 4));
};

/** 音色：基频 + 衰减的泛音（频谱上一组谱线，而不是一根） */
const tone = (freq, t, harmonics) =>
  harmonics.reduce((sum, weight, i) => sum + weight * Math.sin(2 * Math.PI * freq * (i + 1) * t), 0);

/** 起音 attack 秒线性上升，之后按 decay 秒的时间常数指数衰减 */
const envelope = (t, attack, decay) => (t < 0 ? 0 : t < attack ? t / attack : Math.exp(-(t - attack) / decay));

/** 固定种子的线性同余发生器（打击声的噪声） */
const lcg = (seed) => {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 2 ** 32 - 0.5;
  };
};

/** 整段淡入淡出，避免首尾爆音 */
const fade = (t) => Math.min(1, t / 0.05, (SECONDS - t) / 0.4);

/** 写 16 bit PCM WAV；channels 为各声道的 Float 数组，按全局峰值归一化到 0.85 */
const writeWav = (file, channels) => {
  const peak = Math.max(...channels.map((data) => data.reduce((max, v) => Math.max(max, Math.abs(v)), 0)));
  const gain = 0.85 / peak;
  const blockAlign = channels.length * 2;
  const buffer = Buffer.alloc(44 + FRAMES * blockAlign);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + FRAMES * blockAlign, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels.length, 22);
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(FRAMES * blockAlign, 40);
  for (let i = 0; i < FRAMES; i++) {
    channels.forEach((data, c) => {
      const sample = Math.max(-1, Math.min(1, data[i] * gain));
      buffer.writeInt16LE(Math.round(sample * 32_767), 44 + i * blockAlign + c * 2);
    });
  }
  writeFileSync(join(OUT_DIR, file), buffer);
};

// ---------------------------------------------------------------- stereo.wav：120 BPM，16 拍旋律

const BEAT = 0.5;
const MELODY = ['E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'A4', 'G4', 'E4', 'G4'];
/** 低音每两拍一个音：I – vi – IV – V 的根音（IV 用 F 也只出现在低音声部） */
const BASS = ['C3', 'C3', 'A2', 'A2', 'F2', 'F2', 'G2', 'G2'];

const left = new Float32Array(FRAMES);
const right = new Float32Array(FRAMES);
const noise = lcg(20_261_022);
for (let i = 0; i < FRAMES; i++) {
  const t = i / RATE;
  const beat = Math.floor(t / BEAT);
  const inBeat = t - beat * BEAT;
  // 旋律：明亮的泛音组，快衰减，音头清楚
  const melody =
    0.55 * tone(NOTE(MELODY[beat % MELODY.length]), t, [1, 0.45, 0.22, 0.1]) * envelope(inBeat, 0.008, 0.22);
  // 低音：两拍一个音，慢衰减托底
  const bassStart = Math.floor(t / (2 * BEAT)) * 2 * BEAT;
  const bass =
    0.45 * tone(NOTE(BASS[Math.floor(t / (2 * BEAT)) % BASS.length]), t, [1, 0.3]) * envelope(t - bassStart, 0.02, 0.6);
  // 反拍轻打击：一段很短的噪声
  const offbeat = inBeat - BEAT / 2;
  const tick = offbeat >= 0 ? 0.18 * noise() * envelope(offbeat, 0.001, 0.012) : (noise(), 0);
  const gain = fade(t);
  left[i] = gain * (0.8 * melody + bass + 0.35 * tick);
  right[i] = gain * (0.55 * melody + bass + 0.7 * tick);
}
writeWav('stereo.wav', [left, right]);

// ---------------------------------------------------------------- audio.wav：上下行琶音，先渐强后渐弱

const ARPEGGIO = ['C4', 'E4', 'G4', 'C5', 'E5', 'C5', 'G4', 'E4'];
const STEP = 0.25;
const mono = new Float32Array(FRAMES);
for (let i = 0; i < FRAMES; i++) {
  const t = i / RATE;
  const step = Math.floor(t / STEP);
  const note =
    tone(NOTE(ARPEGGIO[step % ARPEGGIO.length]), t, [1, 0.35, 0.15]) * envelope(t - step * STEP, 0.006, 0.12);
  // 整体力度：两次渐强渐弱的「呼吸」，波形轮廓起伏而不是一条平带
  const swell = 0.35 + 0.65 * Math.sin((Math.PI * t) / (SECONDS / 2)) ** 2;
  mono[i] = fade(t) * swell * note;
}
writeWav('audio.wav', [mono]);

console.log('wrote public/audio/stereo.wav, public/audio/audio.wav');
