import html2canvas from 'html2canvas';
import { toCanvas as htmlToImageCanvas } from 'html-to-image';

export interface CaptureOptions {
  /** Target element to capture */
  element: HTMLElement;
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Background color (default: transparent) */
  backgroundColor?: string;
  /** Scale factor for high-DPI capture */
  scale?: number;
  /** Whether to use CORS for images */
  useCORS?: boolean;
  /** Proxy URL for cross-origin images */
  proxy?: string;
}

export interface CaptureResult {
  /** Captured canvas element */
  canvas: HTMLCanvasElement;
  /** Capture time in milliseconds */
  captureTime: number;
}

export interface FrameCapturer {
  /** Capture a single frame */
  captureFrame(options: CaptureOptions): Promise<CaptureResult>;
  /** Capture frame as ImageData */
  captureFrameData(options: CaptureOptions): Promise<ImageData>;
  /** Capture frame as Blob */
  captureFrameBlob(options: CaptureOptions, format?: string, quality?: number): Promise<Blob>;
  /** Capture frame as data URL */
  captureFrameDataURL(options: CaptureOptions, format?: string, quality?: number): Promise<string>;
}

/**
 * Snapshot WebGL canvases from the live DOM and paint them onto matching
 * canvases in the html2canvas clone. This avoids touching the live DOM
 * (which would destroy the WebGL context).
 */
function snapshotWebGLCanvases(
  liveRoot: HTMLElement,
): Map<HTMLCanvasElement, ImageData> {
  const snapshots = new Map<HTMLCanvasElement, ImageData>();

  const canvases = liveRoot.querySelectorAll('canvas');
  for (const original of canvases) {
    // Get the existing WebGL context (do NOT create a new one)
    const gl =
      (original as any).__webglContext ??
      original.getContext('webgl2') ??
      original.getContext('webgl');
    if (!gl) continue;

    const w = original.width;
    const h = original.height;
    if (w === 0 || h === 0) continue;

    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // WebGL readPixels returns bottom-up; flip vertically
    const rowSize = w * 4;
    const tempRow = new Uint8Array(rowSize);
    for (let y = 0; y < Math.floor(h / 2); y++) {
      const topOffset = y * rowSize;
      const botOffset = (h - 1 - y) * rowSize;
      tempRow.set(pixels.subarray(topOffset, topOffset + rowSize));
      pixels.copyWithin(topOffset, botOffset, botOffset + rowSize);
      pixels.set(tempRow, botOffset);
    }

    const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), w, h);
    snapshots.set(original, imageData);
  }

  return snapshots;
}

/**
 * In the cloned document, find canvases that correspond to WebGL originals
 * and paint the snapshot data onto them (as 2D canvases).
 */
function applyWebGLSnapshots(
  liveRoot: HTMLElement,
  clonedRoot: HTMLElement,
  snapshots: Map<HTMLCanvasElement, ImageData>,
): void {
  if (snapshots.size === 0) return;

  const liveCanvases = Array.from(liveRoot.querySelectorAll('canvas'));
  const clonedCanvases = Array.from(clonedRoot.querySelectorAll('canvas'));

  for (let i = 0; i < liveCanvases.length; i++) {
    const imageData = snapshots.get(liveCanvases[i]);
    if (!imageData || !clonedCanvases[i]) continue;

    const clonedCanvas = clonedCanvases[i];
    clonedCanvas.width = imageData.width;
    clonedCanvas.height = imageData.height;
    const ctx = clonedCanvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
    }
  }
}

// Cache for inlined CSS (rebuilt once per capturer instance)
let _inlinedCssCache: string | null = null;
let _inlinedCssPromise: Promise<string> | null = null;

/**
 * Fetch a font URL as base64 data URI.
 */
async function fetchFontAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const ext = (url.match(/\.([a-z0-9]+)(\?|$)/i)?.[1] || 'woff2').toLowerCase();
    const mime =
      ext === 'woff2' ? 'font/woff2' :
      ext === 'woff' ? 'font/woff' :
      ext === 'ttf' ? 'font/ttf' :
      ext === 'otf' ? 'font/otf' : 'application/octet-stream';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Collect all CSS rules from document stylesheets, inlining @font-face URLs as
 * base64 data URIs so the resulting CSS has no cross-origin references.
 */
async function collectInlinedCss(): Promise<string> {
  if (_inlinedCssCache !== null) return _inlinedCssCache;
  if (_inlinedCssPromise) return _inlinedCssPromise;

  _inlinedCssPromise = (async () => {
    const parts: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRule[] = [];
      try {
        rules = Array.from(sheet.cssRules || []);
      } catch {
        continue; // cross-origin stylesheet, skip
      }
      for (const rule of rules) {
        if (rule.constructor.name === 'CSSFontFaceRule' || rule.cssText.startsWith('@font-face')) {
          let inlined = rule.cssText;
          const urlRegex = /url\((['"]?)(https?:\/\/[^'")]+)\1\)/g;
          const matches: { full: string; url: string }[] = [];
          let m: RegExpExecArray | null;
          while ((m = urlRegex.exec(rule.cssText)) !== null) {
            matches.push({ full: m[0], url: m[2] });
          }
          for (const { full, url } of matches) {
            const dataUri = await fetchFontAsDataUri(url);
            if (dataUri) {
              inlined = inlined.replace(full, `url("${dataUri}")`);
            }
          }
          parts.push(inlined);
        } else {
          parts.push(rule.cssText);
        }
      }
    }
    const result = parts.join('\n');
    _inlinedCssCache = result;
    return result;
  })();

  return _inlinedCssPromise;
}

/**
 * Native DOM-to-canvas using SVG foreignObject. Bypasses html2canvas entirely.
 * Inlines all CSS (including @font-face) so the resulting SVG has no
 * cross-origin references and the canvas is never tainted.
 */
async function nativeDomToCanvas(
  element: HTMLElement,
  width: number,
  height: number,
  scale: number = 1
): Promise<HTMLCanvasElement> {
  const inlinedCss = await collectInlinedCss();
  const clone = element.cloneNode(true) as HTMLElement;

  // Serialize the cloned element using XMLSerializer for valid XHTML
  const serializer = new XMLSerializer();
  let cloneXml: string;
  try {
    cloneXml = serializer.serializeToString(clone);
  } catch {
    cloneXml = clone.outerHTML;
  }

  // Build the SVG wrapping the DOM in a foreignObject
  const svgString =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
    '<foreignObject x="0" y="0" width="' + width + '" height="' + height + '">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + width + 'px;height:' + height + 'px;font-family:Inter,system-ui,sans-serif;">' +
    '<style>' + inlinedCss + '</style>' +
    cloneXml +
    '</div>' +
    '</foreignObject>' +
    '</svg>';

  // Load via Blob URL to avoid data URL size/encoding issues
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(new Error('Failed to load SVG image: ' + e));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Frame capturer using a native DOM→SVG→canvas pipeline (with html2canvas
 * fallback for edge cases).
 */
export function createFrameCapturer(): FrameCapturer {
  async function captureFrame(options: CaptureOptions): Promise<CaptureResult> {
    const startTime = performance.now();

    // Snapshot WebGL canvases from the live DOM before html2canvas clones it
    const snapshots = snapshotWebGLCanvases(options.element);

    const scale = options.scale ?? 1;
    // Primary capture path: html-to-image's foreignObject SVG renderer.
    // Unlike html2canvas (which re-implements CSS layout/paint and gets
    // opacity, gradients, blend modes, and filters subtly wrong), this
    // serialises the element subtree into an <foreignObject> inside an
    // <svg> and rasterises via the browser's native renderer. The result
    // matches what the user sees on screen pixel-for-pixel — no more
    // washed-out crossfades or ghosted opacity transitions.
    let canvas: HTMLCanvasElement;
    try {
      canvas = await htmlToImageCanvas(options.element, {
        canvasWidth: Math.round(options.width * scale),
        canvasHeight: Math.round(options.height * scale),
        pixelRatio: scale,
        backgroundColor: options.backgroundColor,
        cacheBust: false,
        skipFonts: false,
        // Force the captured root to be fully visible — handles off-screen
        // render containers that have opacity:0 / display:none / etc.
        style: { opacity: '1', visibility: 'visible', display: 'block' },
        // Skip preserving WebGL contexts — we snapshot them separately.
        filter: () => true,
      });
      // html-to-image doesn't run an onclone callback, so apply WebGL
      // snapshots after the fact by overlaying them on the produced canvas.
      // (For most templates there are no canvases, so this is a no-op.)
      if (snapshots.size > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const liveCanvases = options.element.querySelectorAll('canvas');
          const elementRect = options.element.getBoundingClientRect();
          for (const original of liveCanvases) {
            const snap = snapshots.get(original);
            if (!snap) continue;
            const r = original.getBoundingClientRect();
            const off = document.createElement('canvas');
            off.width = snap.width;
            off.height = snap.height;
            off.getContext('2d')?.putImageData(snap, 0, 0);
            ctx.drawImage(
              off,
              (r.left - elementRect.left) * scale,
              (r.top - elementRect.top) * scale,
              r.width * scale,
              r.height * scale,
            );
          }
        }
      }
    } catch (err) {
      // Fallback to html2canvas if foreignObject path fails (e.g. tainted
      // images or other security restrictions on the page).
      console.warn('[capturer] html-to-image failed, falling back to html2canvas:', err);
      canvas = await html2canvas(options.element, {
        backgroundColor: options.backgroundColor ?? null,
        scale,
        useCORS: options.useCORS ?? true,
        proxy: options.proxy,
        logging: false,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        removeContainer: true,
        onclone: (_doc: Document, clonedElement: HTMLElement) => {
          const cloneRoot = clonedElement as HTMLElement;
          cloneRoot.style.opacity = '1';
          cloneRoot.style.visibility = 'visible';
          cloneRoot.style.display = 'block';
          applyWebGLSnapshots(options.element, clonedElement, snapshots);
        },
      });
    }

    // Verify the canvas dims match the requested target. If html2canvas
    // produced something smaller (e.g. when the source element has zero
    // computed dimensions), upscale to the target via drawImage so the
    // encoder gets the resolution it expects.
    const targetW = Math.round(options.width * scale);
    const targetH = Math.round(options.height * scale);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      const upscaled = document.createElement('canvas');
      upscaled.width = targetW;
      upscaled.height = targetH;
      const upCtx = upscaled.getContext('2d');
      if (upCtx) {
        upCtx.imageSmoothingEnabled = true;
        upCtx.imageSmoothingQuality = 'high';
        upCtx.drawImage(canvas, 0, 0, targetW, targetH);
        canvas = upscaled;
      }
    }

    const captureTime = performance.now() - startTime;

    return { canvas, captureTime };
  }

  async function captureFrameData(options: CaptureOptions): Promise<ImageData> {
    const { canvas } = await captureFrame(options);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  async function captureFrameBlob(
    options: CaptureOptions,
    format = 'image/png',
    quality = 0.95
  ): Promise<Blob> {
    const { canvas } = await captureFrame(options);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        format,
        quality
      );
    });
  }

  async function captureFrameDataURL(
    options: CaptureOptions,
    format = 'image/png',
    quality = 0.95
  ): Promise<string> {
    const { canvas } = await captureFrame(options);
    return canvas.toDataURL(format, quality);
  }

  return {
    captureFrame,
    captureFrameData,
    captureFrameBlob,
    captureFrameDataURL,
  };
}

/**
 * Optimized capturer using OffscreenCanvas for better performance.
 * Falls back to regular canvas if OffscreenCanvas is not supported.
 */
export function createOffscreenCapturer(): FrameCapturer {
  const supportsOffscreen = typeof OffscreenCanvas !== 'undefined';

  if (!supportsOffscreen) {
    console.error('OffscreenCanvas not supported, falling back to regular canvas');
    return createFrameCapturer();
  }

  // For now, we use the regular capturer since html2canvas doesn't support OffscreenCanvas
  // In the future, we could implement a custom DOM renderer for OffscreenCanvas
  return createFrameCapturer();
}
