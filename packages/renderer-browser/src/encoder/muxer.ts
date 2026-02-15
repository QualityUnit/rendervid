import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import type { EncodedChunk } from './webcodecs';

export interface MuxerOptions {
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Frame rate */
  fps: number;
  /** Video codec (default: 'avc') */
  videoCodec?: 'avc' | 'hevc' | 'vp9' | 'av1';
  /** Audio codec (default: 'aac') */
  audioCodec?: 'aac' | 'opus';
  /** Audio sample rate */
  audioSampleRate?: number;
  /** Number of audio channels */
  audioChannels?: number;
}

export interface AudioChunk {
  /** Audio data */
  data: Uint8Array;
  /** Timestamp in microseconds */
  timestamp: number;
  /** Duration in microseconds */
  duration: number;
}

export interface VideoMuxer {
  /** Add video chunk */
  addVideoChunk(chunk: EncodedChunk): void;
  /** Add audio chunk */
  addAudioChunk(chunk: AudioChunk): void;
  /** Finalize and get output */
  finalize(): Uint8Array;
  /** Get estimated file size */
  getEstimatedSize(): number;
}

/**
 * Create an MP4 muxer for combining video and audio streams.
 */
export function createMp4Muxer(options: MuxerOptions): VideoMuxer {
  const {
    width,
    height,
    fps,
    videoCodec = 'avc',
    audioSampleRate,
    audioChannels,
  } = options;

  const target = new ArrayBufferTarget();

  const muxerConfig: ConstructorParameters<typeof Muxer>[0] = {
    target,
    video: {
      codec: videoCodec,
      width,
      height,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  };

  // Add audio configuration if provided
  if (audioSampleRate && audioChannels) {
    muxerConfig.audio = {
      codec: 'aac',
      numberOfChannels: audioChannels,
      sampleRate: audioSampleRate,
    };
  }

  const muxer = new Muxer(muxerConfig);

  let totalVideoBytes = 0;
  let totalAudioBytes = 0;

  function addVideoChunk(chunk: EncodedChunk): void {
    muxer.addVideoChunkRaw(
      chunk.data,
      chunk.isKeyframe ? 'key' : 'delta',
      chunk.timestamp,
      chunk.duration,
      chunk.meta,
    );
    totalVideoBytes += chunk.data.byteLength;
  }

  function addAudioChunk(chunk: AudioChunk): void {
    muxer.addAudioChunk(
      {
        type: 'key', // Audio chunks are typically all keyframes
        timestamp: chunk.timestamp,
        duration: chunk.duration,
        data: chunk.data,
        byteLength: chunk.data.byteLength,
        copyTo: (dest: BufferSource) => {
          new Uint8Array(dest as ArrayBuffer).set(chunk.data);
        },
      } as EncodedAudioChunk,
      undefined,
      chunk.timestamp
    );
    totalAudioBytes += chunk.data.byteLength;
  }

  function finalize(): Uint8Array {
    muxer.finalize();
    return new Uint8Array(target.buffer);
  }

  function getEstimatedSize(): number {
    // Add ~10% overhead for container format
    return Math.ceil((totalVideoBytes + totalAudioBytes) * 1.1);
  }

  return {
    addVideoChunk,
    addAudioChunk,
    finalize,
    getEstimatedSize,
  };
}

/**
 * Create a WebM muxer for VP9/Opus content.
 * This is a simpler alternative when WebM output is acceptable.
 */
export interface WebMMuxerOptions {
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Frame rate */
  fps: number;
}

export function createWebMMuxer(_options: WebMMuxerOptions): VideoMuxer {
  // For WebM, we can use the native MediaRecorder which handles muxing
  // This is a placeholder that collects chunks for manual assembly
  const videoChunks: EncodedChunk[] = [];
  const audioChunks: AudioChunk[] = [];

  function addVideoChunk(chunk: EncodedChunk): void {
    videoChunks.push(chunk);
  }

  function addAudioChunk(chunk: AudioChunk): void {
    audioChunks.push(chunk);
  }

  function finalize(): Uint8Array {
    // WebM muxing would require a dedicated library like webm-muxer
    // For now, we just return the raw video data concatenated
    const totalSize = videoChunks.reduce((sum, c) => sum + c.data.byteLength, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of videoChunks) {
      result.set(chunk.data, offset);
      offset += chunk.data.byteLength;
    }

    return result;
  }

  function getEstimatedSize(): number {
    const videoSize = videoChunks.reduce((sum, c) => sum + c.data.byteLength, 0);
    const audioSize = audioChunks.reduce((sum, c) => sum + c.data.byteLength, 0);
    return Math.ceil((videoSize + audioSize) * 1.1);
  }

  return {
    addVideoChunk,
    addAudioChunk,
    finalize,
    getEstimatedSize,
  };
}

/**
 * Helper to convert Blob to ArrayBuffer.
 */
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

/**
 * Helper to convert ArrayBuffer to Blob.
 */
export function arrayBufferToBlob(buffer: ArrayBuffer, mimeType: string): Blob {
  return new Blob([buffer], { type: mimeType });
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Download an ArrayBuffer as a file.
 */
export function downloadArrayBuffer(
  buffer: ArrayBuffer,
  filename: string,
  mimeType: string
): void {
  const blob = arrayBufferToBlob(buffer, mimeType);
  downloadBlob(blob, filename);
}
