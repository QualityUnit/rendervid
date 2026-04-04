import type {
  Template,
  ComponentRegistry,
  ComponentInfo,
  JSONSchema7,
} from './types';
import {
  validateTemplate,
  validateInputs,
  getTemplateSchema,
  getLayerSchema,
  type ValidationResult,
} from './validation';
import { getAllEasingNames } from './animation';
import { getAllPresetNames, getPresetsByType } from './animation/presets';
import React from 'react';

/**
 * Engine options.
 */
export interface EngineOptions {
  /** Renderer type */
  renderer?: 'auto' | 'browser' | 'node';
  /** Custom component registry */
  components?: ComponentRegistry;
  /** Default fonts to load */
  defaultFonts?: string[];
  /** Google Fonts API key */
  googleFontsApiKey?: string;
  /** Max concurrent renders */
  maxConcurrentRenders?: number;
}

/**
 * Render video options.
 */
export interface RenderVideoOptions {
  /** Template to render */
  template: Template;
  /** Input values */
  inputs: Record<string, unknown>;
  /** Output configuration */
  output?: {
    format?: 'mp4' | 'webm' | 'mov' | 'gif';
    codec?: 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1' | 'prores';
    quality?: 'draft' | 'standard' | 'high' | 'lossless';
    bitrate?: number;
    fps?: number;
    scale?: number;
    audioCodec?: 'aac' | 'mp3' | 'opus' | 'none';
    audioBitrate?: number;
  };
  /** Unique render ID for cancellation */
  renderId?: string;
}

/**
 * Video render result.
 */
export interface VideoResult {
  success: boolean;
  data: Blob | Buffer;
  dataUrl?: string;
  stats: {
    duration: number;
    frames: number;
    fps: number;
    fileSize: number;
  };
}

/**
 * Render image options.
 */
export interface RenderImageOptions {
  /** Template to render */
  template: Template;
  /** Input values */
  inputs: Record<string, unknown>;
  /** Frame to render (for video templates) */
  frame?: number;
  /** Output configuration */
  output?: {
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    scale?: number;
  };
}

/**
 * Image render result.
 */
export interface ImageResult {
  success: boolean;
  data: Blob | Buffer;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Render progress.
 */
export interface RenderProgress {
  phase: 'loading' | 'rendering' | 'encoding';
  progress: number;
  currentFrame?: number;
  totalFrames?: number;
  estimatedTimeRemaining?: number;
  message?: string;
}

/**
 * Engine capabilities.
 */
export interface EngineCapabilities {
  version: string;
  elements: Record<string, ElementCapability>;
  customComponents: Record<string, ComponentInfo>;
  animations: {
    entrance: string[];
    exit: string[];
    emphasis: string[];
  };
  easings: string[];
  blendModes: string[];
  filters: string[];
  fonts: {
    builtin: string[];
    googleFonts: boolean;
    customFonts: boolean;
  };
  output: {
    video: {
      formats: string[];
      codecs: string[];
      maxWidth: number;
      maxHeight: number;
      maxDuration: number;
      maxFps: number;
    };
    image: {
      formats: string[];
      maxWidth: number;
      maxHeight: number;
    };
  };
  runtime: 'browser' | 'node';
  features: {
    tailwind: boolean;
    customComponents: boolean;
    webgl: boolean;
    webcodecs: boolean;
  };
}

/**
 * Element capability info.
 */
export interface ElementCapability {
  description: string;
  category: 'visual' | 'audio' | 'container';
  props: JSONSchema7;
  allowChildren: boolean;
  animatable: boolean;
  example: object;
}

/**
 * Generic component type for registry (framework-agnostic).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentType = (props: any) => unknown;

/**
 * Default component registry implementation.
 */
class DefaultComponentRegistry implements ComponentRegistry {
  private components = new Map<string, {
    component: ComponentType;
    info: ComponentInfo;
  }>();

  register(
    name: string,
    component: ComponentType,
    schema?: JSONSchema7
  ): void {
    this.components.set(name, {
      component,
      info: { name, propsSchema: schema },
    });
  }

  get(name: string): ComponentType | undefined {
    return this.components.get(name)?.component;
  }

  list(): ComponentInfo[] {
    return Array.from(this.components.values()).map((c) => c.info);
  }

  async registerFromUrl(name: string, url: string): Promise<void> {
    // Dynamic import would happen here
    throw new Error(`Dynamic component loading not yet implemented: ${name} from ${url}`);
  }

  registerFromCode(name: string, code: string): void {
    let component: ComponentType | null = null;

    if (code.includes('function') && code.includes('return')) {
      const wrappedCode = `
        return (function(React) {
          ${code}
          var match = ${JSON.stringify(code)}.match(/function\\s+(\\w+)/);
          if (match) { try { return eval(match[1]); } catch(e) {} }
          return null;
        });
      `;
      const factory = new Function(wrappedCode);
      component = factory()(React) as ComponentType;
    } else if (code.includes('=>')) {
      const wrappedCode = `
        return (function(React) {
          ${code}
          var match = ${JSON.stringify(code)}.match(/(?:const|let|var)\\s+(\\w+)\\s*=/);
          if (match) { try { return eval(match[1]); } catch(e) {} }
          return null;
        });
      `;
      const factory = new Function(wrappedCode);
      component = factory()(React) as ComponentType;
    }

    if (component && typeof component === 'function') {
      this.register(name, component);
    } else {
      throw new Error(`Failed to evaluate inline component "${name}": no valid function found`);
    }
  }

  unregister(name: string): boolean {
    return this.components.delete(name);
  }

  has(name: string): boolean {
    return this.components.has(name);
  }
}

/**
 * Global default registry instance.
 */
let globalRegistry: ComponentRegistry | null = null;

/**
 * Get the default global component registry.
 * Creates one if it doesn't exist.
 */
export function getDefaultRegistry(): ComponentRegistry {
  if (!globalRegistry) {
    globalRegistry = new DefaultComponentRegistry();
  }
  return globalRegistry;
}

/**
 * Rendervid Engine.
 *
 * Main entry point for the Rendervid library.
 *
 * @example
 * ```typescript
 * import { RendervidEngine } from '@rendervid/core';
 *
 * const engine = new RendervidEngine();
 *
 * // Validate a template
 * const result = engine.validateTemplate(myTemplate);
 *
 * // Get capabilities for AI
 * const caps = engine.getCapabilities();
 *
 * // Render a video (requires renderer package)
 * const video = await engine.renderVideo({
 *   template: myTemplate,
 *   inputs: { title: 'Hello World' },
 * });
 * ```
 */
export class RendervidEngine {
  private options: EngineOptions;
  private _components: ComponentRegistry;
  private activeRenders = new Map<string, AbortController>();

  constructor(options: EngineOptions = {}) {
    this.options = {
      renderer: 'auto',
      maxConcurrentRenders: 4,
      ...options,
    };
    this._components = options.components ?? new DefaultComponentRegistry();
  }

  /**
   * Get the component registry.
   */
  get components(): ComponentRegistry {
    return this._components;
  }

  /**
   * Get engine capabilities.
   */
  getCapabilities(): EngineCapabilities {
    const runtime = typeof window !== 'undefined' ? 'browser' : 'node';

    return {
      version: '0.1.0',
      elements: this.getElementCapabilities(),
      customComponents: Object.fromEntries(
        this._components.list().map((c) => [c.name, c])
      ),
      animations: {
        entrance: getPresetsByType('entrance').map((p) => p.name),
        exit: getPresetsByType('exit').map((p) => p.name),
        emphasis: getPresetsByType('emphasis').map((p) => p.name),
      },
      easings: getAllEasingNames(),
      blendModes: [
        'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
        'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion',
      ],
      filters: [
        'blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate',
        'invert', 'opacity', 'saturate', 'sepia', 'drop-shadow',
      ],
      fonts: {
        builtin: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat'],
        googleFonts: true,
        customFonts: true,
      },
      output: {
        video: {
          formats: ['mp4', 'webm', 'mov', 'gif'],
          codecs: ['h264', 'h265', 'vp8', 'vp9', 'av1', 'prores'],
          maxWidth: 7680,
          maxHeight: 4320,
          maxDuration: 3600,
          maxFps: 120,
        },
        image: {
          formats: ['png', 'jpeg', 'webp'],
          maxWidth: 7680,
          maxHeight: 4320,
        },
      },
      runtime,
      features: {
        tailwind: true,
        customComponents: true,
        webgl: runtime === 'browser',
        webcodecs: runtime === 'browser' && 'VideoEncoder' in globalThis,
      },
    };
  }

  /**
   * Get element capabilities.
   */
  private getElementCapabilities(): Record<string, ElementCapability> {
    return {
      image: {
        description: 'Display an image with fit and positioning options',
        category: 'visual',
        props: {
          type: 'object',
          properties: {
            src: { type: 'string', description: 'Image URL' },
            fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'none'] },
            objectPosition: { type: 'string' },
          },
          required: ['src'],
        },
        allowChildren: false,
        animatable: true,
        example: {
          id: 'image-1',
          type: 'image',
          position: { x: 0, y: 0 },
          size: { width: 400, height: 300 },
          props: { src: 'https://example.com/image.jpg', fit: 'cover' },
        },
      },
      video: {
        description: 'Play a video with playback controls',
        category: 'visual',
        props: {
          type: 'object',
          properties: {
            src: { type: 'string' },
            fit: { type: 'string', enum: ['cover', 'contain', 'fill'] },
            loop: { type: 'boolean' },
            muted: { type: 'boolean' },
            playbackRate: { type: 'number' },
            startTime: { type: 'number' },
            endTime: { type: 'number' },
            volume: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['src'],
        },
        allowChildren: false,
        animatable: true,
        example: {
          id: 'video-1',
          type: 'video',
          position: { x: 0, y: 0 },
          size: { width: 1920, height: 1080 },
          props: { src: 'https://example.com/video.mp4', fit: 'cover' },
        },
      },
      text: {
        description: 'Display text with rich typography options',
        category: 'visual',
        props: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            fontFamily: { type: 'string' },
            fontSize: { type: 'number' },
            fontWeight: { type: 'string' },
            color: { type: 'string' },
            textAlign: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
          },
          required: ['text'],
        },
        allowChildren: false,
        animatable: true,
        example: {
          id: 'text-1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 800, height: 100 },
          props: { text: 'Hello World', fontSize: 48, color: '#ffffff' },
        },
      },
      shape: {
        description: 'Draw shapes with fill and stroke',
        category: 'visual',
        props: {
          type: 'object',
          properties: {
            shape: { type: 'string', enum: ['rectangle', 'ellipse', 'polygon', 'star', 'path'] },
            fill: { type: 'string' },
            stroke: { type: 'string' },
            strokeWidth: { type: 'number' },
            borderRadius: { type: 'number' },
          },
          required: ['shape'],
        },
        allowChildren: false,
        animatable: true,
        example: {
          id: 'shape-1',
          type: 'shape',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 200 },
          props: { shape: 'rectangle', fill: '#3B82F6', borderRadius: 16 },
        },
      },
      audio: {
        description: 'Play audio with volume and fade controls',
        category: 'audio',
        props: {
          type: 'object',
          properties: {
            src: { type: 'string' },
            volume: { type: 'number', minimum: 0, maximum: 1 },
            loop: { type: 'boolean' },
            startTime: { type: 'number' },
            fadeIn: { type: 'number' },
            fadeOut: { type: 'number' },
          },
          required: ['src'],
        },
        allowChildren: false,
        animatable: false,
        example: {
          id: 'audio-1',
          type: 'audio',
          position: { x: 0, y: 0 },
          size: { width: 0, height: 0 },
          props: { src: 'https://example.com/audio.mp3', volume: 1 },
        },
      },
      group: {
        description: 'Container for grouping layers',
        category: 'container',
        props: {
          type: 'object',
          properties: {
            clip: { type: 'boolean' },
          },
        },
        allowChildren: true,
        animatable: true,
        example: {
          id: 'group-1',
          type: 'group',
          position: { x: 0, y: 0 },
          size: { width: 400, height: 300 },
          props: { clip: true },
          children: [],
        },
      },
      lottie: {
        description: 'Play Lottie animation',
        category: 'visual',
        props: {
          type: 'object',
          properties: {
            data: { oneOf: [{ type: 'object' }, { type: 'string' }] },
            loop: { type: 'boolean' },
            speed: { type: 'number' },
            direction: { type: 'integer', enum: [1, -1] },
          },
          required: ['data'],
        },
        allowChildren: false,
        animatable: true,
        example: {
          id: 'lottie-1',
          type: 'lottie',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 200 },
          props: { data: 'https://example.com/animation.json', loop: true },
        },
      },
      custom: {
        description: 'Render a custom React component',
        category: 'visual',
        props: {
          type: 'object',
          additionalProperties: true,
        },
        allowChildren: false,
        animatable: true,
        example: {
          id: 'custom-1',
          type: 'custom',
          position: { x: 100, y: 100 },
          size: { width: 400, height: 300 },
          customComponent: { name: 'MyComponent', props: {} },
          props: {},
        },
      },
    };
  }

  /**
   * Get JSON Schema for template validation.
   */
  getTemplateSchema(): JSONSchema7 {
    return getTemplateSchema();
  }

  /**
   * Get schema for a specific element type.
   */
  getElementSchema(type: string): JSONSchema7 | null {
    return getLayerSchema(type);
  }

  /**
   * Validate a template.
   */
  validateTemplate(template: unknown): ValidationResult {
    return validateTemplate(template);
  }

  /**
   * Validate inputs against a template.
   */
  validateInputs(template: Template, inputs: Record<string, unknown>): ValidationResult {
    return validateInputs(template, inputs);
  }

  /**
   * Render a video.
   * Requires @rendervid/renderer-browser or @rendervid/renderer-node.
   */
  async renderVideo(_options: RenderVideoOptions): Promise<VideoResult> {
    throw new Error(
      'Video rendering requires a renderer package. ' +
      'Install @rendervid/renderer-browser or @rendervid/renderer-node.'
    );
  }

  /**
   * Render a video with progress updates.
   */
  async renderVideoWithProgress(
    options: RenderVideoOptions,
    _onProgress: (progress: RenderProgress) => void
  ): Promise<VideoResult> {
    return this.renderVideo(options);
  }

  /**
   * Render an image.
   * Requires @rendervid/renderer-browser or @rendervid/renderer-node.
   */
  async renderImage(_options: RenderImageOptions): Promise<ImageResult> {
    throw new Error(
      'Image rendering requires a renderer package. ' +
      'Install @rendervid/renderer-browser or @rendervid/renderer-node.'
    );
  }

  /**
   * Cancel an in-progress render.
   */
  cancelRender(renderId: string): void {
    const controller = this.activeRenders.get(renderId);
    if (controller) {
      controller.abort();
      this.activeRenders.delete(renderId);
    }
  }
}
