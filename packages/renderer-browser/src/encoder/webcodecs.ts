export interface WebCodecsEncoderOptions {
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Frame rate */
  fps: number;
  /** Bitrate in bits per second */
  bitrate?: number;
  /** Codec to use (default: 'avc1.42001f' for H.264) */
  codec?: string;
  /** Hardware acceleration preference */
  hardwareAcceleration?: 'no-preference' | 'prefer-hardware' | 'prefer-software';
  /** Latency mode */
  latencyMode?: 'quality' | 'realtime';
}

export interface EncodedChunk {
  /** Chunk data */
  data: Uint8Array;
  /** Timestamp in microseconds */
  timestamp: number;
  /** Duration in microseconds */
  duration: number;
  /** Whether this is a keyframe */
  isKeyframe: boolean;
  /** Encoder metadata (contains decoderConfig for first keyframe) */
  meta?: EncodedVideoChunkMetadata;
}

export interface WebCodecsEncoder {
  /** Check if WebCodecs is supported */
  isSupported(): boolean;
  /** Initialize the encoder */
  initialize(): Promise<void>;
  /** Encode a frame */
  encodeFrame(frame: VideoFrame | ImageBitmap | HTMLCanvasElement, timestamp: number): Promise<void>;
  /** Flush remaining frames */
  flush(): Promise<void>;
  /** Get encoded chunks */
  getChunks(): EncodedChunk[];
  /** Close the encoder */
  close(): void;
  /** Get encoder configuration */
  getConfig(): VideoEncoderConfig;
}

/**
 * Check if WebCodecs API is supported in the current environment.
 */
export function isWebCodecsSupported(): boolean {
  return (
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined' &&
    typeof EncodedVideoChunk !== 'undefined'
  );
}

/**
 * Get recommended codec for the given configuration.
 */
export function getRecommendedCodec(width: number, height: number): string {
  // H.264 Baseline Profile for broad compatibility
  if (width <= 1920 && height <= 1080) {
    return 'avc1.42001f'; // Baseline Profile Level 3.1
  }
  // H.264 High Profile for 4K
  if (width <= 3840 && height <= 2160) {
    return 'avc1.640028'; // High Profile Level 4.0
  }
  // VP9 for larger resolutions
  return 'vp09.00.10.08';
}

/**
 * Create a WebCodecs-based video encoder.
 */
export function createWebCodecsEncoder(options: WebCodecsEncoderOptions): WebCodecsEncoder {
  const {
    width,
    height,
    fps,
    bitrate = width * height * fps * 0.1, // ~10% of raw bitrate
    codec = getRecommendedCodec(width, height),
    hardwareAcceleration = 'prefer-hardware',
    latencyMode = 'quality',
  } = options;

  const chunks: EncodedChunk[] = [];
  let encoder: VideoEncoder | null = null;
  let frameCount = 0;
  const frameDuration = Math.floor(1_000_000 / fps); // in microseconds

  const config: VideoEncoderConfig = {
    codec,
    width,
    height,
    bitrate,
    framerate: fps,
    hardwareAcceleration,
    latencyMode,
    avc: codec.startsWith('avc1') ? { format: 'annexb' } : undefined,
  };

  function isSupported(): boolean {
    return isWebCodecsSupported();
  }

  async function initialize(): Promise<void> {
    if (!isSupported()) {
      throw new Error('WebCodecs is not supported in this browser');
    }

    // Try the requested config, then fall back to software acceleration and alternative codecs
    const fallbackConfigs: VideoEncoderConfig[] = [
      config,
      { ...config, hardwareAcceleration: 'prefer-software' },
      { ...config, codec: 'avc1.4d001f', hardwareAcceleration: 'prefer-software' }, // Main Profile
      { ...config, codec: 'avc1.640028', hardwareAcceleration: 'prefer-software' }, // High Profile
      { ...config, codec: 'vp09.00.10.08', hardwareAcceleration: 'prefer-software', avc: undefined }, // VP9
    ];

    let supportedConfig: VideoEncoderConfig | null = null;
    for (const candidate of fallbackConfigs) {
      const support = await VideoEncoder.isConfigSupported(candidate);
      if (support.supported) {
        supportedConfig = support.config!;
        break;
      }
    }

    if (!supportedConfig) {
      throw new Error(`No supported video codec found for ${width}x${height}`);
    }

    // Update config to the one that worked
    Object.assign(config, supportedConfig);

    encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);

        chunks.push({
          data,
          timestamp: chunk.timestamp,
          duration: chunk.duration ?? frameDuration,
          isKeyframe: chunk.type === 'key',
          meta: metadata,
        });
      },
      error: (error) => {
        console.error('VideoEncoder error:', error);
      },
    });

    encoder.configure(config);
  }

  async function encodeFrame(
    frame: VideoFrame | ImageBitmap | HTMLCanvasElement,
    timestamp: number
  ): Promise<void> {
    if (!encoder) {
      throw new Error('Encoder not initialized');
    }

    let videoFrame: VideoFrame;

    if (frame instanceof VideoFrame) {
      videoFrame = frame;
    } else if (frame instanceof HTMLCanvasElement) {
      // Draw source canvas onto a fresh OffscreenCanvas to ensure valid pixel data
      const offscreen = new OffscreenCanvas(width, height);
      const ctx = offscreen.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get 2d context from OffscreenCanvas');
      }
      ctx.drawImage(frame, 0, 0, width, height);
      try {
        videoFrame = new VideoFrame(offscreen, {
          timestamp: timestamp * 1000,
          duration: frameDuration,
        });
      } catch (e) {
        // Fallback: try ImageData approach
        const imageData = ctx.getImageData(0, 0, width, height);
        videoFrame = new VideoFrame(imageData.data, {
          format: 'RGBA',
          codedWidth: width,
          codedHeight: height,
          timestamp: timestamp * 1000,
          duration: frameDuration,
        });
      }
    } else {
      videoFrame = new VideoFrame(frame, {
        timestamp: timestamp * 1000,
        duration: frameDuration,
      });
    }

    // Force keyframe every 2 seconds for seeking
    const isKeyframe = frameCount % (fps * 2) === 0;

    encoder.encode(videoFrame, { keyFrame: isKeyframe });
    videoFrame.close();

    frameCount++;
  }

  async function flush(): Promise<void> {
    if (!encoder) {
      throw new Error('Encoder not initialized');
    }

    await encoder.flush();
  }

  function getChunks(): EncodedChunk[] {
    return [...chunks];
  }

  function close(): void {
    if (encoder) {
      encoder.close();
      encoder = null;
    }
    chunks.length = 0;
    frameCount = 0;
  }

  function getConfig(): VideoEncoderConfig {
    return { ...config };
  }

  return {
    isSupported,
    initialize,
    encodeFrame,
    flush,
    getChunks,
    close,
    getConfig,
  };
}

/**
 * Create a VideoFrame from an HTMLCanvasElement.
 */
export function canvasToVideoFrame(
  canvas: HTMLCanvasElement,
  timestamp: number,
  fps: number
): VideoFrame {
  // Ensure canvas has a valid 2D context (VideoFrame reads colorSpace from it)
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(
      'Cannot create VideoFrame: canvas has no 2D context. ' +
      'Ensure the canvas was not previously used with a WebGL context.'
    );
  }
  const frameDuration = Math.floor(1_000_000 / fps);
  return new VideoFrame(canvas, {
    timestamp: timestamp * 1000, // Convert ms to microseconds
    duration: frameDuration,
  });
}
