import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import type { Template, Scene, ComponentRegistry } from '@rendervid/core';
import { getDefaultRegistry, TemplateProcessor, FontManager } from '@rendervid/core';
import { TemplateRenderer, calculateTotalFrames } from './SceneRenderer';
import { createFrameCapturer } from '../encoder/capturer';
import { createWebCodecsEncoder, isWebCodecsSupported } from '../encoder/webcodecs';
import { createMp4Muxer } from '../encoder/muxer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomComponentType = React.ComponentType<any>;

export interface BrowserRendererOptions {
  /** Target container element */
  container?: HTMLElement;
  /** Custom component registry */
  registry?: ComponentRegistry;
  /** Whether to use WebCodecs (falls back to MediaRecorder if unavailable) */
  preferWebCodecs?: boolean;
}

export interface RenderVideoOptions {
  /** Template to render */
  template: Template;
  /** Input values for template variables */
  inputs?: Record<string, unknown>;
  /** Output format */
  format?: 'mp4' | 'webm';
  /** Video bitrate in bits per second */
  bitrate?: number;
  /** Progress callback */
  onProgress?: (progress: RenderProgress) => void;
  /** Frame callback (called after each frame is captured) */
  onFrame?: (frame: number, totalFrames: number) => void;
}

export interface RenderImageOptions {
  /** Template to render */
  template: Template;
  /** Input values for template variables */
  inputs?: Record<string, unknown>;
  /** Scene index to render (default: 0) */
  sceneIndex?: number;
  /** Frame to render (default: 0) */
  frame?: number;
  /** Output format */
  format?: 'png' | 'jpeg' | 'webp';
  /** Quality (0-1, only for jpeg/webp) */
  quality?: number;
}

export interface RenderProgress {
  /** Current frame being rendered */
  currentFrame: number;
  /** Total frames to render */
  totalFrames: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Current phase */
  phase: 'capturing' | 'encoding' | 'muxing' | 'complete';
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

export interface VideoResult {
  /** Video blob */
  blob: Blob;
  /** Duration in seconds */
  duration: number;
  /** Frame count */
  frameCount: number;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
}

export interface ImageResult {
  /** Image blob */
  blob: Blob;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
}

/**
 * Browser-based renderer for Rendervid templates.
 * Uses React for DOM rendering and WebCodecs/MediaRecorder for video encoding.
 */
export class BrowserRenderer {
  private options: BrowserRendererOptions;
  private container: HTMLElement;
  private root: Root | null = null;
  private isRendering = false;
  private registry: ComponentRegistry;
  private processor: TemplateProcessor;

  constructor(options: BrowserRendererOptions = {}) {
    this.options = options;
    this.container = options.container || this.createContainer();
    this.registry = options.registry || getDefaultRegistry();
    this.processor = new TemplateProcessor();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      pointer-events: none;
      opacity: 0;
      z-index: -1;
    `;
    document.body.appendChild(container);
    return container;
  }

  /**
   * Get the component registry.
   */
  getRegistry(): ComponentRegistry {
    return this.registry;
  }

  /**
   * Register a custom component.
   */
  registerComponent(name: string, component: CustomComponentType): void {
    // Cast React component to generic ComponentType
    this.registry.register(name, component as unknown as import('@rendervid/core').ComponentType);
  }

  /**
   * Check if WebCodecs is supported for high-quality encoding.
   */
  isWebCodecsSupported(): boolean {
    return isWebCodecsSupported();
  }

  /**
   * Render a template to video.
   */
  async renderVideo(options: RenderVideoOptions): Promise<VideoResult> {
    if (this.isRendering) {
      throw new Error('Renderer is already rendering');
    }

    this.isRendering = true;

    try {
      const { template, inputs = {}, format = 'mp4', bitrate, onProgress, onFrame } = options;

      // Process custom components and inputs
      await this.processor.loadCustomComponents(template, this.registry);
      const processedTemplate = this.processor.resolveInputs(template, inputs);

      // Load fonts before rendering
      await this.loadFonts(processedTemplate);

      const { width, height, fps = 30 } = processedTemplate.output;
      const scenes = processedTemplate.composition.scenes;
      const totalFrames = calculateTotalFrames(scenes, fps);
      const duration = totalFrames / fps;

      // Create render container
      const renderContainer = document.createElement('div');
      renderContainer.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
      `;
      this.container.appendChild(renderContainer);

      // Create React root
      this.root = createRoot(renderContainer);

      // Create capturer
      const capturer = createFrameCapturer();

      // Determine encoding method
      const useWebCodecs = this.options.preferWebCodecs !== false && isWebCodecsSupported();

      let result: VideoResult;

      if (useWebCodecs && format === 'mp4') {
        result = await this.renderWithWebCodecs(
          scenes,
          renderContainer,
          { width, height, fps, totalFrames, duration, bitrate },
          capturer,
          onProgress,
          onFrame
        );
      } else {
        result = await this.renderWithMediaRecorder(
          scenes,
          renderContainer,
          { width, height, fps, totalFrames, duration },
          capturer,
          onProgress,
          onFrame
        );
      }

      // Cleanup
      this.root.unmount();
      this.root = null;
      this.container.removeChild(renderContainer);

      return result;
    } finally {
      this.isRendering = false;
    }
  }

  private async renderWithWebCodecs(
    scenes: Scene[],
    container: HTMLElement,
    config: { width: number; height: number; fps: number; totalFrames: number; duration: number; bitrate?: number },
    capturer: ReturnType<typeof createFrameCapturer>,
    onProgress?: (progress: RenderProgress) => void,
    onFrame?: (frame: number, totalFrames: number) => void
  ): Promise<VideoResult> {
    const { width, height, fps, totalFrames, duration, bitrate } = config;

    // Initialize encoder
    const encoder = createWebCodecsEncoder({
      width,
      height,
      fps,
      bitrate,
    });
    await encoder.initialize();

    // Initialize muxer
    const muxer = createMp4Muxer({
      width,
      height,
      fps,
    });

    const startTime = performance.now();
    const frameTimes: number[] = [];

    // Render each frame
    for (let frame = 0; frame < totalFrames; frame++) {
      const frameStartTime = performance.now();

      // Render frame to DOM
      await this.renderFrame(scenes, frame, fps, width, height);

      // Wait for DOM update
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Capture frame
      const { canvas } = await capturer.captureFrame({
        element: container,
        width,
        height,
      });

      // Encode frame
      const timestamp = (frame / fps) * 1000; // in milliseconds
      await encoder.encodeFrame(canvas, timestamp);

      // Track frame time for estimation
      frameTimes.push(performance.now() - frameStartTime);
      if (frameTimes.length > 10) frameTimes.shift();

      // Calculate progress
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const remainingFrames = totalFrames - frame - 1;
      const estimatedTimeRemaining = (remainingFrames * avgFrameTime) / 1000;

      onProgress?.({
        currentFrame: frame,
        totalFrames,
        percentage: ((frame + 1) / totalFrames) * 100,
        phase: 'capturing',
        estimatedTimeRemaining,
      });

      onFrame?.(frame, totalFrames);
    }

    // Flush encoder
    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      phase: 'encoding',
    });
    await encoder.flush();

    // Mux video
    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      phase: 'muxing',
    });

    for (const chunk of encoder.getChunks()) {
      muxer.addVideoChunk(chunk);
    }

    const videoData = muxer.finalize();
    encoder.close();

    // Convert Uint8Array to Blob (cast needed for TypeScript with SharedArrayBuffer)
    const blob = new Blob([videoData as unknown as ArrayBuffer], { type: 'video/mp4' });

    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      phase: 'complete',
    });

    return {
      blob,
      duration,
      frameCount: totalFrames,
      size: blob.size,
      mimeType: 'video/mp4',
    };
  }

  private async renderWithMediaRecorder(
    scenes: Scene[],
    container: HTMLElement,
    config: { width: number; height: number; fps: number; totalFrames: number; duration: number },
    capturer: ReturnType<typeof createFrameCapturer>,
    onProgress?: (progress: RenderProgress) => void,
    onFrame?: (frame: number, totalFrames: number) => void
  ): Promise<VideoResult> {
    const { width, height, fps, totalFrames, duration } = config;

    // Create a canvas for MediaRecorder
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas for MediaRecorder export');
    }

    // Get stream from canvas
    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: width * height * fps * 0.1,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const recordingComplete = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };
    });

    mediaRecorder.start(100);

    const frameTimes: number[] = [];

    // Render each frame
    for (let frame = 0; frame < totalFrames; frame++) {
      const frameStartTime = performance.now();

      // Render frame to DOM
      await this.renderFrame(scenes, frame, fps, width, height);

      // Wait for DOM update
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Capture frame
      const { canvas: capturedCanvas } = await capturer.captureFrame({
        element: container,
        width,
        height,
      });

      // Draw to MediaRecorder canvas
      ctx.drawImage(capturedCanvas, 0, 0);

      // Wait for frame timing
      const targetFrameTime = 1000 / fps;
      const elapsed = performance.now() - frameStartTime;
      if (elapsed < targetFrameTime) {
        await new Promise((resolve) => setTimeout(resolve, targetFrameTime - elapsed));
      }

      // Track frame time for estimation
      frameTimes.push(performance.now() - frameStartTime);
      if (frameTimes.length > 10) frameTimes.shift();

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const remainingFrames = totalFrames - frame - 1;
      const estimatedTimeRemaining = (remainingFrames * avgFrameTime) / 1000;

      onProgress?.({
        currentFrame: frame,
        totalFrames,
        percentage: ((frame + 1) / totalFrames) * 100,
        phase: 'capturing',
        estimatedTimeRemaining,
      });

      onFrame?.(frame, totalFrames);
    }

    mediaRecorder.stop();
    const blob = await recordingComplete;

    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      phase: 'complete',
    });

    return {
      blob,
      duration,
      frameCount: totalFrames,
      size: blob.size,
      mimeType: 'video/webm',
    };
  }

  private renderFrame(
    scenes: Scene[],
    frame: number,
    fps: number,
    width: number,
    height: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.root) {
        resolve();
        return;
      }

      this.root.render(
        <TemplateRenderer
          scenes={scenes}
          frame={frame}
          fps={fps}
          width={width}
          height={height}
          isPlaying={false}
          registry={this.registry}
        />
      );

      // Wait for React to flush
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  /**
   * Render a single frame as an image.
   */
  async renderImage(options: RenderImageOptions): Promise<ImageResult> {
    if (this.isRendering) {
      throw new Error('Renderer is already rendering');
    }

    this.isRendering = true;

    try {
      const {
        template,
        inputs = {},
        sceneIndex = 0,
        frame = 0,
        format = 'png',
        quality = 0.95,
      } = options;

      // Process custom components and inputs
      await this.processor.loadCustomComponents(template, this.registry);
      const processedTemplate = this.processor.resolveInputs(template, inputs);

      // Load fonts before rendering
      await this.loadFonts(processedTemplate);

      const { width, height, fps = 30 } = processedTemplate.output;
      const scenes = processedTemplate.composition.scenes;

      if (sceneIndex >= scenes.length) {
        throw new Error(`Scene index ${sceneIndex} out of range`);
      }

      // Create render container
      const renderContainer = document.createElement('div');
      renderContainer.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
      `;
      this.container.appendChild(renderContainer);

      // Create React root
      this.root = createRoot(renderContainer);

      // Render the specific scene at the specific frame
      const scene = scenes[sceneIndex];
      const { SceneRenderer } = await import('./SceneRenderer');

      await new Promise<void>((resolve) => {
        this.root!.render(
          <SceneRenderer
            scene={scene}
            frame={frame}
            fps={fps}
            width={width}
            height={height}
            isPlaying={false}
            registry={this.registry}
          />
        );

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });

      // Capture frame
      const capturer = createFrameCapturer();
      const mimeType = `image/${format}`;
      const blob = await capturer.captureFrameBlob(
        {
          element: renderContainer,
          width,
          height,
        },
        mimeType,
        quality
      );

      // Cleanup
      this.root.unmount();
      this.root = null;
      this.container.removeChild(renderContainer);

      return {
        blob,
        width,
        height,
        size: blob.size,
        mimeType,
      };
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Load fonts from template configuration.
   *
   * @private
   */
  private async loadFonts(template: Template): Promise<void> {
    // Check if template has fonts configuration
    if (!template.fonts) {
      return;
    }

    const fontManager = new FontManager();

    try {
      const result = await fontManager.loadFonts(template.fonts);

      // Log successful font loading
      if (result.loaded.length > 0) {
        console.log(`[BrowserRenderer] Loaded ${result.loaded.length} fonts in ${result.loadTime}ms`);
        result.loaded.forEach(font => {
          console.log(`  - ${font.family} ${font.weight || 400} ${font.style || 'normal'}`);
        });
      }

      // Log font loading failures
      if (result.failed.length > 0) {
        console.warn(`[BrowserRenderer] Failed to load ${result.failed.length} fonts, using fallbacks`);
        result.failed.forEach(font => {
          console.warn(`  - ${font.family} ${font.weight || 400} ${font.style || 'normal'}`);
        });
      }
    } catch (error) {
      // Font loading failed, but we continue with fallbacks
      console.warn('[BrowserRenderer] Font loading failed, using fallbacks:', error);
    }
  }

  /**
   * Dispose of the renderer and clean up resources.
   */
  dispose(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (this.container && this.container.parentNode && !this.options.container) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

/**
 * Create a new BrowserRenderer instance.
 */
export function createBrowserRenderer(
  options?: BrowserRendererOptions
): BrowserRenderer {
  return new BrowserRenderer(options);
}
