import html2canvas from 'html2canvas';

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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a URL and return it as a base64 data URL.  Results are cached.
 */
async function fetchAsDataURL(
  url: string,
  cache: Map<string, string>,
): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    cache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return url; // return original URL if fetch fails
  }
}

/**
 * Inline all external image/resource URLs in a cloned DOM tree as data URLs.
 * Handles <img>, <image> (SVG), and CSS background-image url() references.
 */
async function inlineExternalResources(
  clone: HTMLElement,
  cache: Map<string, string>,
): Promise<void> {
  const promises: Promise<void>[] = [];

  // <img> elements
  for (const img of clone.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
      promises.push(
        fetchAsDataURL(src, cache).then((d) => img.setAttribute('src', d)),
      );
    }
  }

  // SVG <image> elements
  for (const img of clone.querySelectorAll('image')) {
    const href =
      img.getAttribute('href') ??
      img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (href && !href.startsWith('data:')) {
      promises.push(
        fetchAsDataURL(href, cache).then((d) => {
          img.setAttribute('href', d);
          if (img.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
            img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', d);
          }
        }),
      );
    }
  }

  // CSS background-image url() (skip gradient functions)
  for (const el of clone.querySelectorAll('*')) {
    const htmlEl = el as HTMLElement;
    if (!htmlEl.style) continue;
    const bg = htmlEl.style.backgroundImage;
    if (!bg || !bg.includes('url(')) continue;

    const urlRe = /url\(\s*['"]?(?!['"]?\s*data:)([^'")\s]+)['"]?\s*\)/g;
    let match: RegExpExecArray | null;
    const bgReplacements: Promise<{ original: string; dataUrl: string }>[] = [];
    while ((match = urlRe.exec(bg)) !== null) {
      const m = match; // capture for closure
      bgReplacements.push(
        fetchAsDataURL(m[1], cache).then((d) => ({
          original: m[0],
          dataUrl: d,
        })),
      );
    }

    if (bgReplacements.length > 0) {
      promises.push(
        Promise.all(bgReplacements).then((replacements) => {
          let newBg = bg;
          for (const { original, dataUrl } of replacements) {
            newBg = newBg.replace(original, `url(${dataUrl})`);
          }
          htmlEl.style.backgroundImage = newBg;
        }),
      );
    }
  }

  await Promise.all(promises);
}

/**
 * Replace <canvas> elements in the clone with <img> snapshots so they
 * survive XHTML serialisation (canvas pixel data is lost by cloneNode).
 */
function replaceCanvasesWithImages(
  liveRoot: HTMLElement,
  clone: HTMLElement,
): void {
  const liveCanvases = Array.from(liveRoot.querySelectorAll('canvas'));
  const cloneCanvases = Array.from(clone.querySelectorAll('canvas'));

  for (let i = 0; i < liveCanvases.length && i < cloneCanvases.length; i++) {
    const orig = liveCanvases[i];
    const cloned = cloneCanvases[i];

    try {
      let dataUrl: string;

      // Try WebGL first
      const gl =
        (orig as any).__webglContext ??
        orig.getContext('webgl2') ??
        orig.getContext('webgl');

      if (gl) {
        const w = orig.width;
        const h = orig.height;
        if (w === 0 || h === 0) continue;

        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // Flip vertically (WebGL is bottom-up)
        const rowSize = w * 4;
        const tmp = new Uint8Array(rowSize);
        for (let y = 0; y < Math.floor(h / 2); y++) {
          const top = y * rowSize;
          const bot = (h - 1 - y) * rowSize;
          tmp.set(pixels.subarray(top, top + rowSize));
          pixels.copyWithin(top, bot, bot + rowSize);
          pixels.set(tmp, bot);
        }

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = w;
        tmpCanvas.height = h;
        const ctx = tmpCanvas.getContext('2d')!;
        ctx.putImageData(
          new ImageData(new Uint8ClampedArray(pixels.buffer), w, h),
          0,
          0,
        );
        dataUrl = tmpCanvas.toDataURL();
      } else {
        // Regular 2D canvas
        dataUrl = orig.toDataURL();
      }

      const img = document.createElement('img');
      img.setAttribute('src', dataUrl);
      img.setAttribute('width', String(orig.width));
      img.setAttribute('height', String(orig.height));
      img.style.cssText = cloned.style.cssText;
      for (const attr of Array.from(cloned.attributes)) {
        if (attr.name !== 'width' && attr.name !== 'height' && attr.name !== 'style') {
          img.setAttribute(attr.name, attr.value);
        }
      }
      cloned.parentNode?.replaceChild(img, cloned);
    } catch {
      // If canvas can't be read, leave as-is
    }
  }
}

/**
 * Inline all computed styles from the live DOM tree onto the clone.
 *
 * The SVG foreignObject-as-image renderer doesn't always handle CSS rules,
 * vendor-prefixed properties, or inherited styles reliably. By reading the
 * browser's fully-resolved computed values from the live elements and writing
 * them directly as inline styles on the cloned elements, we guarantee that
 * every element is self-contained and renders identically in the SVG context.
 *
 * This specifically fixes:
 *  - `-webkit-background-clip: text` gradient text effects
 *  - `-webkit-text-fill-color: transparent`
 *  - `backdrop-filter` / `-webkit-backdrop-filter`
 *  - `filter`, `opacity`, `transform` animations
 *  - Font inheritance and sizing
 */
function inlineComputedStyles(
  liveRoot: HTMLElement,
  clone: HTMLElement,
): void {
  const XHTML_NS = 'http://www.w3.org/1999/xhtml';

  // Build parallel arrays of all elements (root + descendants)
  const liveAll: Element[] = [liveRoot, ...Array.from(liveRoot.querySelectorAll('*'))];
  const cloneAll: Element[] = [clone, ...Array.from(clone.querySelectorAll('*'))];

  if (liveAll.length !== cloneAll.length) {
    // Trees diverged (shouldn't happen with cloneNode) — bail gracefully
    return;
  }

  for (let i = 0; i < liveAll.length; i++) {
    const live = liveAll[i];
    const cloned = cloneAll[i];

    // Only inline styles on HTML elements (skip SVG <path>, <circle>, etc.)
    if (live.namespaceURI !== XHTML_NS && live.namespaceURI !== null) continue;
    if (!(cloned instanceof HTMLElement)) continue;

    const computed = window.getComputedStyle(live);
    const len = computed.length;
    const parts: string[] = new Array(len);
    for (let j = 0; j < len; j++) {
      const prop = computed[j];
      parts[j] = `${prop}:${computed.getPropertyValue(prop)}`;
    }
    cloned.setAttribute('style', parts.join(';'));
  }
}

// ---------------------------------------------------------------------------
// ForeignObject capturer  –  pixel-perfect, uses native browser renderer
// ---------------------------------------------------------------------------

/**
 * Frame capturer using SVG foreignObject for pixel-perfect DOM-to-canvas
 * conversion.  Unlike html2canvas this delegates ALL rendering to the
 * browser's native engine, so every CSS feature is reproduced exactly:
 *  - inline SVG elements with gradients
 *  - background-clip: text
 *  - backdrop-filter
 *  - complex CSS gradients & animations
 */
export function createForeignObjectCapturer(): FrameCapturer {
  const resourceCache = new Map<string, string>();
  let cachedStyles: string | null = null;

  /**
   * Collect all CSS rules from document stylesheets.
   * @font-face src URLs are inlined as data-URLs so the SVG context can
   * access the fonts.
   */
  async function getDocumentStyles(): Promise<string> {
    if (cachedStyles !== null) return cachedStyles;

    const rules: string[] = [];

    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          let text = rule.cssText;

          // Inline font URLs inside @font-face rules
          if (rule instanceof CSSFontFaceRule) {
            const urlMatches = [
              ...text.matchAll(
                /url\(\s*['"]?(?!['"]?\s*data:)([^'")\s]+)['"]?\s*\)/g,
              ),
            ];
            for (const m of urlMatches) {
              try {
                const abs = new URL(
                  m[1],
                  sheet.href || window.location.href,
                ).href;
                const dataUrl = await fetchAsDataURL(abs, resourceCache);
                text = text.replace(m[0], `url("${dataUrl}")`);
              } catch {
                /* skip unreachable font */
              }
            }
          }

          rules.push(text);
        }
      } catch {
        /* cross-origin sheets can't be read */
      }
    }

    cachedStyles = rules.join('\n');
    return cachedStyles;
  }

  let frameCount = 0;

  async function captureFrame(options: CaptureOptions): Promise<CaptureResult> {
    const startTime = performance.now();
    const { element, width, height, backgroundColor } = options;

    frameCount++;
    if (frameCount === 1) {
      console.log('[rendervid] Using ForeignObject capturer (native browser rendering)');
    }

    // 1. Deep-clone the live DOM
    const clone = element.cloneNode(true) as HTMLElement;

    // 2. Replace <canvas> elements with <img> snapshots
    replaceCanvasesWithImages(element, clone);

    // 3. Inline all computed styles from live DOM → clone.
    //    This is the key step that fixes text/effects flickering:
    //    the SVG-as-image renderer doesn't reliably handle vendor-prefixed
    //    CSS (like -webkit-background-clip: text, -webkit-text-fill-color),
    //    CSS rule matching, or inherited properties. Inlining the browser's
    //    fully-resolved values makes each element self-contained.
    inlineComputedStyles(element, clone);

    // 4. Inline any external resource URLs (images, SVG hrefs)
    await inlineExternalResources(clone, resourceCache);

    // 5. Embed document styles (@font-face declarations with inlined font data)
    const styles = await getDocumentStyles();
    if (styles) {
      const styleEl = document.createElement('style');
      styleEl.textContent = styles;
      clone.insertBefore(styleEl, clone.firstChild);
    }

    // 6. Set XHTML namespace (required for foreignObject)
    clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

    // 7. Serialize the clone to valid XHTML
    const xhtml = new XMLSerializer().serializeToString(clone);

    // 8. Wrap in SVG foreignObject
    const svgParts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    ];
    if (backgroundColor) {
      svgParts.push(
        `<rect width="100%" height="100%" fill="${backgroundColor}"/>`,
      );
    }
    svgParts.push(
      `<foreignObject x="0" y="0" width="${width}" height="${height}">`,
      xhtml,
      '</foreignObject>',
      '</svg>',
    );
    const svgMarkup = svgParts.join('');

    // 9. Render SVG → Image → Canvas
    const svgBlob = new Blob([svgMarkup], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    try {
      const img = new Image();
      img.width = width;
      img.height = height;
      img.src = svgUrl;

      // Use img.decode() which guarantees the image is fully decoded
      // (fonts parsed, CSS computed, layout settled) before we draw.
      // img.onload fires too early for complex SVG foreignObject content,
      // causing flickering on frames where fonts/CSS haven't settled yet.
      await img.decode();

      ctx.drawImage(img, 0, 0, width, height);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }

    // Debug: show first captured frame in console
    if (frameCount === 1) {
      const debugUrl = canvas.toDataURL('image/png');
      console.log('[rendervid] First frame captured. Size:', canvas.width, 'x', canvas.height);
      console.log('[rendervid] Preview first frame: %c ', `
        font-size:1px;
        padding: ${Math.min(canvas.height / 4, 100)}px ${Math.min(canvas.width / 4, 200)}px;
        background: url(${debugUrl}) no-repeat center/contain;
      `);
    }

    const captureTime = performance.now() - startTime;
    return { canvas, captureTime };
  }

  async function captureFrameData(options: CaptureOptions): Promise<ImageData> {
    const { canvas } = await captureFrame(options);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context from canvas');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  async function captureFrameBlob(
    options: CaptureOptions,
    format = 'image/png',
    quality = 0.95,
  ): Promise<Blob> {
    const { canvas } = await captureFrame(options);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('Failed to create blob from canvas')),
        format,
        quality,
      );
    });
  }

  async function captureFrameDataURL(
    options: CaptureOptions,
    format = 'image/png',
    quality = 0.95,
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

// ---------------------------------------------------------------------------
// html2canvas capturer  –  legacy fallback
// ---------------------------------------------------------------------------

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

/**
 * Frame capturer using html2canvas for DOM-to-canvas conversion.
 * Kept as a fallback – does NOT support all CSS features (inline SVGs,
 * background-clip: text, backdrop-filter, etc.).
 */
export function createHtml2CanvasCapturer(): FrameCapturer {
  async function captureFrame(options: CaptureOptions): Promise<CaptureResult> {
    const startTime = performance.now();

    // Snapshot WebGL canvases from the live DOM before html2canvas clones it
    const snapshots = snapshotWebGLCanvases(options.element);

    const canvas = await html2canvas(options.element, {
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor ?? null,
      scale: options.scale ?? 1,
      useCORS: options.useCORS ?? true,
      proxy: options.proxy,
      logging: false,
      allowTaint: false,
      foreignObjectRendering: false,
      imageTimeout: 15000,
      removeContainer: true,
      onclone: (_doc: Document, clonedElement: HTMLElement) => {
        // Paint WebGL snapshots onto the cloned canvases
        applyWebGLSnapshots(options.element, clonedElement, snapshots);
      },
    });

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
 * Default frame capturer – uses foreignObject for pixel-perfect rendering.
 */
export function createFrameCapturer(): FrameCapturer {
  return createForeignObjectCapturer();
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
