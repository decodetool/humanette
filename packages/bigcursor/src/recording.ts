import type {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  BrowserType,
  LaunchOptions,
  Page,
} from 'playwright-core';
import * as runtime from './recording/runtime.js';
import { installInteractionSounds as installSounds } from './recording/interaction-sounds.js';

export type RecordingPresetName = 'youtube' | 'x' | 'vertical' | 'archive';
export interface PixelSize {
  width: number;
  height: number;
}
export interface RecordingPreset {
  viewport: PixelSize;
  dpr: number;
  fps: number;
}
export interface ResolvedRecordingPreset extends RecordingPreset {
  frame: PixelSize;
}
export interface InteractionSoundOptions {
  volume?: number;
  clicks?: boolean;
  keyboard?: boolean;
}
export interface TypingSoundStats {
  played: number;
  released: number;
  suppressed: number;
  errors: number;
  theme: string;
  state: string;
  activeSources: number;
  pendingTimers: number;
}
export interface InteractionSoundStats {
  clicks: number;
  keys: number;
  errors: number;
  state: string;
  typing?: TypingSoundStats;
}
export interface InteractionSoundController {
  stats(): Promise<InteractionSoundStats[]>;
  dispose(): Promise<void>;
}
export interface RecordingOptions extends Partial<RecordingPreset> {
  audio?: boolean;
  sounds?: boolean | InteractionSoundOptions;
  /** Interaction-bound capture stabilization. Enabled by default; no idle render loop. */
  captureRefresh?: boolean;
}
export interface RecordingStats {
  output: string;
  width: number;
  height: number;
  audio: boolean;
  encodedFrames: number;
  videoCodec: string;
  audioCodec?: string;
  requestedFps: number;
  expectedSourceSize: PixelSize;
  sourceSize: PixelSize | null;
  encodedSize: PixelSize;
  interactionSounds?: InteractionSoundStats[];
  captureRefresh?: { frames: number; events: number; active: boolean };
  takeMs: number;
  stopMs: number;
  warning?: string;
}
export interface Recording {
  preset: ResolvedRecordingPreset;
  stop(outputPath: string): Promise<RecordingStats>;
}

export const PRESETS: Readonly<Record<RecordingPresetName, RecordingPreset>> = runtime.PRESETS;

/** Launch full Chromium with native sizing and tab audio enabled for recording. */
export function launchForPreset(
  chromium: BrowserType,
  preset: RecordingPresetName | RecordingPreset = 'archive',
  options: { launch?: LaunchOptions; context?: BrowserContextOptions } = {},
): Promise<{ browser: Browser; context: BrowserContext; preset: ResolvedRecordingPreset }> {
  return runtime.launchForPreset(chromium, preset, options);
}

/** Native AV1/Opus capture, app audio, live interaction sounds, and capture stabilization. */
export function startRecording(
  page: Page,
  preset: RecordingPresetName | RecordingPreset = 'archive',
  options: RecordingOptions = {},
): Promise<Recording> {
  return runtime.startRecording(page, preset, options);
}

/** Play sounds live without recording; dispose to remove listeners and owned audio contexts. */
export function installInteractionSounds(
  page: Page,
  options: InteractionSoundOptions = {},
): Promise<InteractionSoundController> {
  return installSounds(page, options);
}
