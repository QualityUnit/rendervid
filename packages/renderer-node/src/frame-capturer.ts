import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';
import type { Template, ComponentRegistry } from '@rendervid/core';
import type { PlaywrightLaunchOptions } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Configuration for the frame capturer
 */
export interface FrameCapturerConfig {
  /** Template to render */
  template: Template;
  /** Input values */
  inputs?: Record<string, unknown>;
  /** Playwright launch options */
  playwrightOptions?: PlaywrightLaunchOptions;
  /** Time to wait after rendering before capturing (ms, default: 50) */
  renderWaitTime?: number;
  /** Custom component registry */
  registry?: ComponentRegistry;
  /** Enable GPU rendering in Puppeteer (default: true) */
  useGPU?: boolean;
}

/**
 * Frame capturer using Playwright headless browser
 */
export class FrameCapturer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: FrameCapturerConfig;
  private initialized = false;
  private renderWaitTime: number;
  private useGPU: boolean;
  private gpuFallback = false;

  constructor(config: FrameCapturerConfig) {
    this.config = config;
    this.renderWaitTime = config.renderWaitTime ?? 50;
    this.useGPU = config.useGPU ?? true;
  }

  /**
   * Initialize the browser and page
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const { playwrightOptions = {} } = this.config;
    const { width, height } = this.config.template.output;

    // Build GPU-related flags based on configuration
    // Use SwiftShader for software WebGL rendering (works in headless mode)
    const gpuFlags = this.useGPU && !this.gpuFallback
      ? [
          '--use-gl=swiftshader',
          '--enable-webgl',
          '--enable-webgl2',
          '--enable-unsafe-swiftshader',
        ]
      : [
          '--disable-gpu',
          '--disable-webgl',
          '--disable-webgl2',
        ];

    // Add font rendering flags for better quality
    const fontFlags = [
      '--font-render-hinting=none', // Better font rendering quality
    ];

    // Add stability and memory flags for handling large 3D assets
    const stabilityFlags = [
      '--disable-dev-shm-usage', // Avoid shared memory issues
      '--disable-setuid-sandbox', // Required for some environments
      '--no-sandbox', // Required for containerized environments
      '--disable-web-security', // Disable CORS to allow loading external resources
      '--disable-features=IsolateOrigins,site-per-process', // Required for --disable-web-security to work
      '--ignore-gpu-blocklist', // Ignore GPU blocklist for software rendering
      '--disable-blink-features=AutomationControlled', // Hide automation
    ];

    try {
      // Playwright uses boolean headless, no 'new' mode needed
      const headlessMode = playwrightOptions.headless === false ? false : true;

      console.error(`[FrameCapturer] Launching browser with Playwright headless mode: ${headlessMode}`);

      this.browser = await chromium.launch({
        headless: headlessMode,
        executablePath: playwrightOptions.executablePath,
        args: [
          ...stabilityFlags,
          ...gpuFlags,
          ...fontFlags,
          `--window-size=${width},${height}`,
          ...(playwrightOptions.args || []),
        ],
      });
    } catch (error) {
      // If GPU initialization fails and we haven't already tried fallback, retry without GPU
      if (this.useGPU && !this.gpuFallback) {
        console.error('[FrameCapturer] GPU initialization failed, falling back to software rendering:', error instanceof Error ? error.message : String(error));
        this.gpuFallback = true;
        return this.initialize();
      }
      throw error;
    }

    // Log GPU status
    if (this.useGPU && !this.gpuFallback) {
      console.error('[FrameCapturer] GPU rendering enabled');
    } else if (this.gpuFallback) {
      console.error('[FrameCapturer] GPU rendering disabled (fallback to software rendering)');
    } else {
      console.error('[FrameCapturer] GPU rendering disabled (by configuration)');
    }

    this.page = await this.browser.newPage();

    // Log browser console messages for debugging
    this.page.on('console', async msg => {
      const type = msg.type();
      const text = msg.text();

      // Log all console messages for debugging
      console.error(`[Browser ${type}]`, text);

      // Also get args for more detail on errors
      if (type === 'error') {
        try {
          const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => arg.toString())));
          if (args.length > 0 && args[0] !== text) {
            console.error(`[Browser error detail]`, ...args);
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    });

    // Log page errors
    this.page.on('pageerror', error => {
      console.error('[Browser error]', error.message);
    });

    await this.page.setViewportSize({
      width,
      height,
    });

    // Set up the rendering page with template HTML
    const html = this.generateRenderHTML();
    await this.page.setContent(html, {
      waitUntil: 'networkidle',
    });

    // Inject the browser renderer bundle
    await this.injectBrowserRenderer();

    // Wait for renderer to be ready
    await this.page.waitForFunction('window.RENDERVID_READY === true', {
      timeout: 10000,
    });

    // Check WebGL availability (required for Three.js layers)
    const webglAvailable = await this.page.evaluate(() => {
      return (window as any).RENDERVID_WEBGL_AVAILABLE;
    });
    if (webglAvailable) {
      console.error('[FrameCapturer] WebGL is available - Three.js layers will work');
    } else {
      console.warn('[FrameCapturer] WebGL is NOT available - Three.js layers may not render correctly');
    }

    // Load fonts if configured
    await this.loadFonts();

    // Pre-load all images from the template
    await this.preloadImages();

    this.initialized = true;
  }

  /**
   * Pre-load all media (images, videos, audio) from template
   * Based on Remotion's approach with retry mechanism and proper error handling
   */
  private async preloadImages(): Promise<void> {
    if (!this.page) return;

    const { template } = this.config;
    const mediaUrls: Array<{ url: string; type: 'image' | 'video' | 'audio' }> = [];

    // Extract ALL media URLs from all scenes (images, videos, audio)
    if (template.composition?.scenes) {
      for (const scene of template.composition.scenes) {
        if (scene.layers) {
          for (const layer of scene.layers) {
            if (layer.type === 'image' || layer.type === 'video' || layer.type === 'audio') {
              const src = (layer.props as any)?.src;
              if (src) {
                const url = String(src);
                // Skip data URLs (already embedded)
                if (!url.startsWith('data:') && !mediaUrls.some(m => m.url === url)) {
                  mediaUrls.push({ url, type: layer.type });
                }
              }
            }
          }
        }
      }
    }

    if (mediaUrls.length === 0) return;

    console.error(`[FrameCapturer] Preloading ${mediaUrls.length} media assets...`);

    // Pre-load media with retry mechanism (Remotion-style)
    // Use Function constructor to avoid TypeScript analyzing browser context code
    const preloadFn = new Function('media', `
      return Promise.all(
        media.map(({ url, type }) => {
          return new Promise((resolve, reject) => {
            let retries = 0;
            const maxRetries = 3;

            const attemptLoad = () => {
              if (type === 'image') {
                const img = new Image();
                img.crossOrigin = 'anonymous';

                img.onload = () => {
                  console.error(\`[Preload] ✓ Image loaded: \${url}\`);
                  resolve();
                };

                img.onerror = () => {
                  retries++;
                  if (retries <= maxRetries) {
                    const delay = Math.pow(2, retries - 1) * 1000;
                    console.error(\`[Preload] Retry \${retries}/\${maxRetries} for \${url} in \${delay}ms\`);
                    setTimeout(attemptLoad, delay);
                  } else {
                    console.error(\`[Preload] ✗ Failed to load image after \${maxRetries} retries: \${url}\`);
                    resolve();
                  }
                };

                img.src = url;
              } else if (type === 'video' || type === 'audio') {
                const media = type === 'video' ? document.createElement('video') : document.createElement('audio');
                media.crossOrigin = 'anonymous';
                media.preload = 'auto';

                media.onloadeddata = () => {
                  console.error(\`[Preload] ✓ \${type} loaded: \${url}\`);
                  resolve();
                };

                media.onerror = () => {
                  retries++;
                  if (retries <= maxRetries) {
                    const delay = Math.pow(2, retries - 1) * 1000;
                    console.error(\`[Preload] Retry \${retries}/\${maxRetries} for \${url} in \${delay}ms\`);
                    setTimeout(attemptLoad, delay);
                  } else {
                    console.error(\`[Preload] ✗ Failed to load \${type} after \${maxRetries} retries: \${url}\`);
                    resolve();
                  }
                };

                media.src = url;
                media.load();
              }
            };

            attemptLoad();
          });
        })
      );
    `);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.page.evaluate(preloadFn as any, mediaUrls);

    console.error(`[FrameCapturer] ✓ All media preloaded successfully`);
  }

  /**
   * Generate the HTML for rendering
   */
  private generateRenderHTML(): string {
    const { template, inputs = {}, registry } = this.config;
    const { width, height } = template.output;
    // Use the template's declared output background as the page background.
    // Falling back to black caused two visible bugs: (1) "greying" mid-crossfade,
    // because both scenes alpha-blend over the body during a fade transition and
    // the math only nets to white when the body is also white, (2) any
    // momentary uncovered pixel during reflow paints as black for a frame.
    const pageBg = template.output.backgroundColor || '#FFFFFF';

    // Serialize template and inputs for the renderer
    const templateJson = JSON.stringify(template);
    const inputsJson = JSON.stringify(inputs);

    // Serialize registry component info (not the actual components, as they need to be injected separately)
    const registryInfo = registry ? JSON.stringify(registry.list().map(c => c.name)) : '[]';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob: file:; img-src * data: blob: file: 'unsafe-inline'; media-src * data: blob: file:;">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      /* Disable text selection globally — headless Chromium can leave a
         residual selection state after setContent / font load / resize that
         renders a blue selection-highlight rectangle BEHIND any element using
         the gradient-text trick (-webkit-background-clip: text +
         -webkit-text-fill-color: transparent). Killing selection at the source. */
      -webkit-user-select: none !important;
      user-select: none !important;
    }
    /* Even if a selection somehow appears, make its highlight invisible. */
    ::selection { background: transparent !important; color: inherit !important; }
    ::-moz-selection { background: transparent !important; color: inherit !important; }
    html, body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: ${pageBg};
    }
    #root {
      width: ${width}px;
      height: ${height}px;
      position: relative;
      overflow: hidden;
      background: ${pageBg};
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.RENDERVID_TEMPLATE = ${templateJson};
    window.RENDERVID_INPUTS = ${inputsJson};
    window.RENDERVID_CURRENT_FRAME = 0;
    window.RENDERVID_REGISTRY_COMPONENTS = ${registryInfo};
    window.RENDERVID_CUSTOM_COMPONENTS = {};

    // Render function that will be called for each frame
    window.renderFrame = function(frame) {
      window.RENDERVID_CURRENT_FRAME = frame;
      // This will be handled by the injected renderer code
      if (window.__rendervidRenderFrame) {
        window.__rendervidRenderFrame(frame);
      }
    };

    // Signal that the page is ready
    window.RENDERVID_READY = true;
  </script>
</body>
</html>`;
  }

  /**
   * Inject the browser renderer bundle into the page
   */
  private async injectBrowserRenderer(): Promise<void> {
    if (!this.page) {
      throw new Error('Frame capturer not initialized');
    }

    try {
      // Try multiple potential paths for the bundle
      const possiblePaths = [
        join(__dirname, 'browser-renderer.global.js'),
        join(__dirname, '..', 'dist', 'browser-renderer.global.js'),
        join(process.cwd(), 'node_modules', '@rendervid', 'renderer-node', 'dist', 'browser-renderer.global.js'),
      ];

      let rendererCode: string | null = null;
      let usedPath: string | null = null;

      for (const bundlePath of possiblePaths) {
        try {
          rendererCode = readFileSync(bundlePath, 'utf-8');
          usedPath = bundlePath;
          break;
        } catch {
          // Try next path
          continue;
        }
      }

      if (!rendererCode) {
        throw new Error(
          `Browser renderer bundle not found. Tried paths:\n${possiblePaths.join('\n')}\n` +
          'Make sure to build the package with: pnpm build'
        );
      }

      // Inject the renderer code
      await this.page.addScriptTag({ content: rendererCode });

      // Inject custom components from registry
      await this.injectCustomComponents();

      // Add debugging info to the page
      await this.page.evaluate(`console.error('Browser renderer injected successfully')`);
    } catch (error) {
      throw new Error(
        `Failed to load browser renderer bundle: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Inject custom components from the registry into the page.
   * Note: This requires components to be serializable or pre-bundled.
   * For now, we'll inject component names and the renderer will need to handle them.
   */
  private async injectCustomComponents(): Promise<void> {
    if (!this.page) {
      throw new Error('Frame capturer not initialized');
    }

    const { registry } = this.config;
    if (!registry) {
      return;
    }

    // For Node.js environment, we can't directly serialize React components
    // The components need to be available in the browser bundle or injected as code strings
    // This is a placeholder for future implementation where components can be bundled
    // For now, we'll just make sure the registry info is available
    await this.page.evaluate(`
      (function() {
        // Components will be available through the global RENDERVID_CUSTOM_COMPONENTS
        // This will be populated by the application code that registers components
        console.error('Custom components ready:', window.RENDERVID_REGISTRY_COMPONENTS);
      })();
    `);
  }

  /**
   * Load fonts from template configuration.
   * Injects FontManager and loads fonts before rendering.
   */
  private async loadFonts(): Promise<void> {
    if (!this.page) {
      throw new Error('Frame capturer not initialized');
    }

    const { template } = this.config;

    // Skip if no fonts configured
    if (!template.fonts || (!template.fonts.google && !template.fonts.custom)) {
      console.error('[FrameCapturer] No fonts configured, skipping font loading');
      return;
    }

    console.error('[FrameCapturer] Loading fonts...');

    try {
      // Inject FontManager code into page context using addScriptTag
      const fontManagerScript = `
        (function() {
          // Define FontManager in browser context
          class FontManager {
            constructor(options = {}) {
              this.loadTimeout = options.timeout ?? 10000;
              this.injectedStyles = new Set();
            }

            async loadFonts(config) {
              const startTime = Date.now();
              const loaded = [];
              const failed = [];
              const promises = [];

              // Load Google Fonts
              if (config.google) {
                for (const font of config.google) {
                  promises.push(
                    this.loadGoogleFont(font)
                      .then(() => {
                        const weights = font.weights ?? [400];
                        const styles = font.styles ?? ['normal'];
                        for (const weight of weights) {
                          for (const style of styles) {
                            loaded.push({ family: font.family, weight, style });
                          }
                        }
                      })
                      .catch((error) => {
                        console.error('Failed to load Google Font ' + font.family + ':', error);
                        failed.push({ family: font.family });
                      })
                  );
                }
              }

              // Load custom fonts
              if (config.custom) {
                for (const font of config.custom) {
                  promises.push(
                    this.loadCustomFont(font)
                      .then(() => {
                        loaded.push({
                          family: font.family,
                          weight: font.weight ?? 400,
                          style: font.style ?? 'normal',
                        });
                      })
                      .catch((error) => {
                        console.error('Failed to load custom font ' + font.family + ':', error);
                        failed.push({ family: font.family });
                      })
                  );
                }
              }

              await Promise.all(promises);
              await this.waitForFontsReady();

              const loadTime = Date.now() - startTime;
              return { loaded, failed, loadTime };
            }

            async loadGoogleFont(definition) {
              const weights = definition.weights ?? [400];
              const styles = definition.styles ?? ['normal'];
              const subsets = definition.subsets ?? ['latin'];
              const display = definition.display ?? 'swap';

              const family = definition.family.replace(/ /g, '+');
              const weightsParam = weights.join(';');

              const variants = [];
              for (const style of styles) {
                if (style === 'italic') {
                  variants.push('ital,wght@1,' + weightsParam);
                } else {
                  variants.push('wght@' + weightsParam);
                }
              }

              const subsetsParam = subsets.join(',');
              const url = 'https://fonts.googleapis.com/css2?family=' + family + ':' + variants.join(';') + '&subset=' + subsetsParam + '&display=' + display;

              if (this.injectedStyles.has(url)) {
                return;
              }

              const response = await fetch(url);
              if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
              }
              const css = await response.text();
              this.injectFontCSS(css);
              this.injectedStyles.add(url);

              await this.loadFontFaces(definition.family, weights, styles);
            }

            async loadCustomFont(definition) {
              const weight = definition.weight ?? 400;
              const style = definition.style ?? 'normal';
              const format = definition.format ?? 'woff2';
              const display = definition.display ?? 'swap';

              const css = this.generateFontFaceCSS({
                family: definition.family,
                src: definition.source,
                weight,
                style,
                format,
                display,
                unicodeRange: definition.unicodeRange,
              });

              if (this.injectedStyles.has(css)) {
                return;
              }

              this.injectFontCSS(css);
              this.injectedStyles.add(css);

              await this.loadFontFaces(definition.family, [weight], [style]);
            }

            generateFontFaceCSS(options) {
              const { family, src, weight, style, format, display, unicodeRange } = options;

              let css = '@font-face {\\n';
              css += '  font-family: \\'' + family + '\\';\\n';
              css += '  src: url(\\'' + src + '\\') format(\\'' + format + '\\');\\n';
              css += '  font-weight: ' + weight + ';\\n';
              css += '  font-style: ' + style + ';\\n';
              css += '  font-display: ' + display + ';\\n';

              if (unicodeRange) {
                css += '  unicode-range: ' + unicodeRange + ';\\n';
              }

              css += '}\\n';
              return css;
            }

            injectFontCSS(css) {
              const style = document.createElement('style');
              style.textContent = css;
              document.head.appendChild(style);
            }

            async loadFontFaces(family, weights, styles) {
              const promises = [];

              for (const weight of weights) {
                for (const style of styles) {
                  const promise = this.loadFontFace(family, weight, style);
                  promises.push(promise);
                }
              }

              await Promise.all(promises);
            }

            async loadFontFace(family, weight, style) {
              try {
                const fontFace = new FontFace(
                  family,
                  'local(\\'' + family + '\\')',
                  { weight: weight.toString(), style }
                );

                const loadPromise = fontFace.load();
                const timeoutPromise = new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('Font load timeout')), this.loadTimeout);
                });

                await Promise.race([loadPromise, timeoutPromise]);
                document.fonts.add(fontFace);
              } catch (error) {
                console.warn('Failed to load font face: ' + family + ' ' + weight + ' ' + style, error);
              }
            }

            async waitForFontsReady(timeout) {
              const maxWait = timeout ?? this.loadTimeout;

              const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                  console.warn('Font loading timeout reached, continuing with fallbacks');
                  resolve();
                }, maxWait);
              });

              const readyPromise = document.fonts.ready.then(() => {
                console.error('[FontManager] All fonts loaded and ready');
              });

              await Promise.race([readyPromise, timeoutPromise]);
            }

            verifyFontsLoaded(fonts) {
              for (const font of fonts) {
                const weight = font.weight ?? 400;
                const style = font.style ?? 'normal';
                const fontSpec = style + ' ' + weight + ' 16px "' + font.family + '"';

                if (!document.fonts.check(fontSpec)) {
                  console.error('Font not loaded: ' + font.family + ' (' + weight + ' ' + style + ')');
                  return false;
                }
              }
              return true;
            }
          }

          // Make FontManager available globally
          window.FontManager = FontManager;
        })();
      `;

      await this.page.addScriptTag({ content: fontManagerScript });

      // Load fonts using the injected FontManager
      const fontConfig = template.fonts;

      // Use Function constructor to avoid TypeScript analyzing browser context code
      const loadFontsFn = new Function('config', `
        return (async () => {
          const fontManager = new window.FontManager({ timeout: config.timeout ?? 10000 });
          const result = await fontManager.loadFonts(config);

          // Wait for document.fonts.ready to ensure all fonts are loaded
          await document.fonts.ready;

          // Verify fonts are loaded
          const allFonts = [...(result.loaded || [])];
          const allLoaded = fontManager.verifyFontsLoaded(allFonts);

          return { ...result, allLoaded };
        })();
      `);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await this.page.evaluate(loadFontsFn as any, fontConfig) as any;

      console.error(`[FrameCapturer] Fonts loaded: ${result.loaded.length} successful, ${result.failed.length} failed (${result.loadTime}ms)`);

      if (!result.allLoaded) {
        console.warn('[FrameCapturer] Some fonts may not be available, fallbacks will be used');
      }

      if (result.failed.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.warn('[FrameCapturer] Failed fonts:', result.failed.map((f: any) => f.family).join(', '));
      }
    } catch (error) {
      console.error('[FrameCapturer] Font loading error:', error instanceof Error ? error.message : String(error));
      // Continue without fonts - fallbacks will be used
    }
  }

  /**
   * Inject custom renderer code into the page (for advanced use cases)
   */
  async injectRenderer(rendererCode: string): Promise<void> {
    if (!this.page) {
      throw new Error('Frame capturer not initialized');
    }

    await this.page.addScriptTag({ content: rendererCode });
  }

  /**
   * Capture a specific frame
   */
  async captureFrame(frame: number): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Frame capturer not initialized');
    }

    // Call the render function for this frame
    await this.page.evaluate((frameNum) => {
      if ((window as any).__rendervidRenderFrame) {
        (window as any).__rendervidRenderFrame(frameNum);
      } else if ((window as any).renderFrame) {
        (window as any).renderFrame(frameNum);
      }
    }, frame);

    // Wait for React to render, then wait for ALL media to load (Remotion-style)
    await this.page.evaluate(`
      new Promise(async (resolve) => {
        // Wait for React rendering
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        // Wait for fonts to be ready (critical for text rendering)
        if (document.fonts) {
          try {
            await Promise.race([
              document.fonts.ready,
              new Promise(r => setTimeout(r, 2000)) // 2s timeout for fonts
            ]);
          } catch (e) {
            console.warn('[Frame] Font ready check failed:', e);
          }
        }

        // Wait for all images in DOM to load
        const images = Array.from(document.querySelectorAll('img'));
        const imagePromises = images.map(img => {
          if (img.complete && img.naturalWidth > 0) {
            return Promise.resolve(); // Already loaded
          }
          return new Promise((resolveImg) => {
            img.onload = () => resolveImg();
            img.onerror = () => {
              console.error('[Frame] Image failed to load:', img.src);
              resolveImg(); // Continue anyway
            };
            // Timeout after 5 seconds per image
            setTimeout(resolveImg, 5000);
          });
        });

        // Wait for all videos in DOM to be ready
        const videos = Array.from(document.querySelectorAll('video'));
        const videoPromises = videos.map(video => {
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
            return Promise.resolve();
          }
          return new Promise((resolveVideo) => {
            video.onloadeddata = () => resolveVideo();
            video.onerror = () => {
              console.error('[Frame] Video failed to load:', video.src);
              resolveVideo();
            };
            setTimeout(resolveVideo, 5000);
          });
        });

        // Wait for all media to load
        await Promise.all([...imagePromises, ...videoPromises]);

        // Wait for Three.js/WebGL canvas to be ready
        const canvases = Array.from(document.querySelectorAll('canvas'));
        if (canvases.length > 0) {
          // Give Three.js time to initialize and render first frame
          await new Promise(r => setTimeout(r, 500));
        }

        // Additional safety delay
        await new Promise(r => setTimeout(r, ${this.renderWaitTime}));

        resolve();
      })
    `);

    // Take screenshot
    const screenshot = await this.page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: this.config.template.output.width,
        height: this.config.template.output.height,
      },
    });

    return screenshot as Buffer;
  }

  /**
   * Capture a frame as JPEG
   */
  async captureFrameJpeg(frame: number, quality = 90): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Frame capturer not initialized');
    }

    // Call the render function for this frame
    await this.page.evaluate((frameNum) => {
      if ((window as any).__rendervidRenderFrame) {
        (window as any).__rendervidRenderFrame(frameNum);
      } else if ((window as any).renderFrame) {
        (window as any).renderFrame(frameNum);
      }
    }, frame);

    // Wait for React to render, then wait for ALL media to load (Remotion-style)
    await this.page.evaluate(`
      new Promise(async (resolve) => {
        // Wait for React rendering
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        // Wait for fonts to be ready (critical for text rendering)
        if (document.fonts) {
          try {
            await Promise.race([
              document.fonts.ready,
              new Promise(r => setTimeout(r, 2000)) // 2s timeout for fonts
            ]);
          } catch (e) {
            console.warn('[Frame] Font ready check failed:', e);
          }
        }

        // Wait for all images in DOM to load
        const images = Array.from(document.querySelectorAll('img'));
        const imagePromises = images.map(img => {
          if (img.complete && img.naturalWidth > 0) {
            return Promise.resolve(); // Already loaded
          }
          return new Promise((resolveImg) => {
            img.onload = () => resolveImg();
            img.onerror = () => {
              console.error('[Frame] Image failed to load:', img.src);
              resolveImg(); // Continue anyway
            };
            // Timeout after 5 seconds per image
            setTimeout(resolveImg, 5000);
          });
        });

        // Wait for all videos in DOM to be ready
        const videos = Array.from(document.querySelectorAll('video'));
        const videoPromises = videos.map(video => {
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
            return Promise.resolve();
          }
          return new Promise((resolveVideo) => {
            video.onloadeddata = () => resolveVideo();
            video.onerror = () => {
              console.error('[Frame] Video failed to load:', video.src);
              resolveVideo();
            };
            setTimeout(resolveVideo, 5000);
          });
        });

        // Wait for all media to load
        await Promise.all([...imagePromises, ...videoPromises]);

        // Wait for Three.js/WebGL canvas to be ready
        const canvases = Array.from(document.querySelectorAll('canvas'));
        if (canvases.length > 0) {
          // Give Three.js time to initialize and render first frame
          await new Promise(r => setTimeout(r, 500));
        }

        // Additional safety delay
        await new Promise(r => setTimeout(r, ${this.renderWaitTime}));

        resolve();
      })
    `);

    // Take screenshot
    const screenshot = await this.page.screenshot({
      type: 'jpeg',
      quality,
      clip: {
        x: 0,
        y: 0,
        width: this.config.template.output.width,
        height: this.config.template.output.height,
      },
    });

    return screenshot as Buffer;
  }

  /**
   * Capture a frame as WebP
   */
  async captureFrameWebp(frame: number, quality = 90): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Frame capturer not initialized');
    }

    // Render the frame
    await this.page.evaluate((frameNum) => {
      if ((window as any).__rendervidRenderFrame) {
        (window as any).__rendervidRenderFrame(frameNum);
      } else if ((window as any).renderFrame) {
        (window as any).renderFrame(frameNum);
      }
    }, frame);

    // Wait for rendering to complete (same logic as captureFrameJpeg)
    await this.page.evaluate(`
      new Promise(async (resolve) => {
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        if (document.fonts) {
          try {
            await Promise.race([
              document.fonts.ready,
              new Promise(r => setTimeout(r, 2000))
            ]);
          } catch (e) {
            console.warn('[Frame] Font ready check failed:', e);
          }
        }

        const images = Array.from(document.querySelectorAll('img'));
        const imagePromises = images.map(img => {
          if (img.complete && img.naturalWidth > 0) {
            return Promise.resolve();
          }
          return new Promise((resolveImg) => {
            img.onload = () => resolveImg();
            img.onerror = () => {
              console.error('[Frame] Image failed to load:', img.src);
              resolveImg();
            };
            setTimeout(resolveImg, 5000);
          });
        });

        const videos = Array.from(document.querySelectorAll('video'));
        const videoPromises = videos.map(video => {
          if (video.readyState >= 2) {
            return Promise.resolve();
          }
          return new Promise((resolveVideo) => {
            video.onloadeddata = () => resolveVideo();
            video.onerror = () => {
              console.error('[Frame] Video failed to load:', video.src);
              resolveVideo();
            };
            setTimeout(resolveVideo, 5000);
          });
        });

        await Promise.all([...imagePromises, ...videoPromises]);

        const canvases = Array.from(document.querySelectorAll('canvas'));
        if (canvases.length > 0) {
          await new Promise(r => setTimeout(r, 500));
        }

        await new Promise(r => setTimeout(r, ${this.renderWaitTime}));

        resolve();
      })
    `);

    // Capture as PNG first, then we'll rely on the caller to convert if needed
    // Playwright doesn't support WebP screenshots natively, so we capture as PNG
    // and the ImageSequenceExporter handles conversion via canvas or FFmpeg
    const screenshot = await this.page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: this.config.template.output.width,
        height: this.config.template.output.height,
      },
    });

    return screenshot as Buffer;
  }

  /**
   * Get the page instance for advanced operations
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.initialized = false;
    }
  }
}

/**
 * Create a frame capturer
 */
export function createFrameCapturer(config: FrameCapturerConfig): FrameCapturer {
  return new FrameCapturer(config);
}
