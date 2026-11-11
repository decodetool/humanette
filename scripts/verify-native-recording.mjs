// Maintainer-only media analysis. ffmpeg/ffprobe are not consumer recording dependencies.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

export function verifyNativeRecording(
  path,
  { width = 2560, height = 1600, barcode = false, appTones = [] } = {},
) {
  const metadata = JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], {
      encoding: 'utf8',
    }),
  );
  const video = metadata.streams.find((s) => s.codec_type === 'video');
  const audio = metadata.streams.find((s) => s.codec_type === 'audio');
  assert.equal(video?.codec_name, 'av1', 'Expected native AV1 capture');
  assert.equal(audio?.codec_name, 'opus', 'Expected captured tab audio');
  assert.equal(video.width, width);
  assert.equal(video.height, height);
  const duration = Number(video.duration ?? metadata.format.duration);
  const pcm = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', path, '-map', '0:a:0', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'],
    { maxBuffer: 128 * 1024 * 1024 },
  );
  const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / samples.length);
  assert.ok(rms > 0.0001, 'Audio track is silent');
  const tones = {};
  for (const hz of appTones) {
    let peak = 0;
    const n = 2400;
    for (let offset = 0; offset + n <= samples.length; offset += n / 2) {
      let re = 0,
        im = 0;
      for (let i = 0; i < n; i++) {
        const phase = (2 * Math.PI * hz * i) / 48000;
        re += samples[offset + i] * Math.cos(phase);
        im -= samples[offset + i] * Math.sin(phase);
      }
      peak = Math.max(peak, (2 * Math.hypot(re, im)) / n);
    }
    tones[hz] = peak;
    assert.ok(peak > 0.015, `App tone ${hz}Hz is missing from decoded audio`);
  }
  const result = { duration, width, height, rms, tones };
  if (barcode) {
    // Fixture barcode is 18 blocks of 24 CSS px, at the archive preset's native DPR 2.
    const block = 48,
      rowWidth = block * 18;
    const pixels = execFileSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        path,
        '-map',
        '0:v:0',
        '-vf',
        `format=gray,crop=${rowWidth}:1:0:24`,
        '-fps_mode',
        'passthrough',
        '-enc_time_base',
        'demux',
        '-f',
        'rawvideo',
        '-',
      ],
      { maxBuffer: 64 * 1024 * 1024 },
    );
    const ids = [];
    for (let at = 0; at + rowWidth <= pixels.length; at += rowWidth) {
      if (pixels[at + block / 2] < 160 || pixels[at + block * 1.5] > 96) continue;
      let id = 0;
      for (let bit = 0; bit < 16; bit++)
        id = (id << 1) | (pixels[at + (bit + 2.5) * block] >= 128 ? 1 : 0);
      ids.push(id);
    }
    result.decodedFrames = pixels.length / rowWidth;
    result.distinctFrames = new Set(ids).size;
    result.distinctVisualFps = result.distinctFrames / duration;
    assert.ok(
      result.distinctVisualFps >= 45,
      `Too few distinct rendered frames: ${result.distinctVisualFps.toFixed(1)}fps`,
    );
  }
  return result;
}
