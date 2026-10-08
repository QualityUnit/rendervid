import type { EasingFunction, EasingName } from '../types';

/**
 * Linear easing - no acceleration.
 */
export const linear: EasingFunction = (t) => t;

// ═══════════════════════════════════════════════════════════════
// QUADRATIC
// ═══════════════════════════════════════════════════════════════

export const easeInQuad: EasingFunction = (t) => t * t;
export const easeOutQuad: EasingFunction = (t) => t * (2 - t);
export const easeInOutQuad: EasingFunction = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// ═══════════════════════════════════════════════════════════════
// CUBIC
// ═══════════════════════════════════════════════════════════════

export const easeInCubic: EasingFunction = (t) => t * t * t;
export const easeOutCubic: EasingFunction = (t) => --t * t * t + 1;
export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// ═══════════════════════════════════════════════════════════════
// QUARTIC
// ═══════════════════════════════════════════════════════════════

export const easeInQuart: EasingFunction = (t) => t * t * t * t;
export const easeOutQuart: EasingFunction = (t) => 1 - --t * t * t * t;
export const easeInOutQuart: EasingFunction = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;

// ═══════════════════════════════════════════════════════════════
// QUINTIC
// ═══════════════════════════════════════════════════════════════

export const easeInQuint: EasingFunction = (t) => t * t * t * t * t;
export const easeOutQuint: EasingFunction = (t) => 1 + --t * t * t * t * t;
export const easeInOutQuint: EasingFunction = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;

// ═══════════════════════════════════════════════════════════════
// SINE
// ═══════════════════════════════════════════════════════════════

export const easeInSine: EasingFunction = (t) =>
  1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: EasingFunction = (t) =>
  Math.sin((t * Math.PI) / 2);
export const easeInOutSine: EasingFunction = (t) =>
  -(Math.cos(Math.PI * t) - 1) / 2;

// ═══════════════════════════════════════════════════════════════
// EXPONENTIAL
// ═══════════════════════════════════════════════════════════════

export const easeInExpo: EasingFunction = (t) =>
  t === 0 ? 0 : Math.pow(2, 10 * t - 10);
export const easeOutExpo: EasingFunction = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const easeInOutExpo: EasingFunction = (t) =>
  t === 0 ? 0 : t === 1 ? 1 : t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;

// ═══════════════════════════════════════════════════════════════
// CIRCULAR
// ═══════════════════════════════════════════════════════════════

export const easeInCirc: EasingFunction = (t) =>
  1 - Math.sqrt(1 - t * t);
export const easeOutCirc: EasingFunction = (t) =>
  Math.sqrt(1 - --t * t);
export const easeInOutCirc: EasingFunction = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

// ═══════════════════════════════════════════════════════════════
// BACK (Overshoot)
// ═══════════════════════════════════════════════════════════════

const c1 = 1.70158;
const c2 = c1 * 1.525;
const c3 = c1 + 1;

export const easeInBack: EasingFunction = (t) =>
  c3 * t * t * t - c1 * t * t;
export const easeOutBack: EasingFunction = (t) =>
  1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
export const easeInOutBack: EasingFunction = (t) =>
  t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;

// ═══════════════════════════════════════════════════════════════
// ELASTIC
// ═══════════════════════════════════════════════════════════════

const c4 = (2 * Math.PI) / 3;
const c5 = (2 * Math.PI) / 4.5;

export const easeInElastic: EasingFunction = (t) =>
  t === 0 ? 0 : t === 1 ? 1
    : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
export const easeOutElastic: EasingFunction = (t) =>
  t === 0 ? 0 : t === 1 ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
export const easeInOutElastic: EasingFunction = (t) =>
  t === 0 ? 0 : t === 1 ? 1 : t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;

// ═══════════════════════════════════════════════════════════════
// BOUNCE
// ═══════════════════════════════════════════════════════════════

const n1 = 7.5625;
const d1 = 2.75;

export const easeOutBounce: EasingFunction = (t) => {
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const easeInBounce: EasingFunction = (t) =>
  1 - easeOutBounce(1 - t);

export const easeInOutBounce: EasingFunction = (t) =>
  t < 0.5
    ? (1 - easeOutBounce(1 - 2 * t)) / 2
    : (1 + easeOutBounce(2 * t - 1)) / 2;

// ═══════════════════════════════════════════════════════════════
// EASING MAP
// ═══════════════════════════════════════════════════════════════

/**
 * Map of all preset easing functions.
 */
export const easingMap: Record<EasingName, EasingFunction> = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
};

/**
 * Get list of all easing names.
 */
export function getAllEasingNames(): EasingName[] {
  return Object.keys(easingMap) as EasingName[];
}

/**
 * Get an easing function by name.
 */
export function getEasing(name: EasingName): EasingFunction {
  return easingMap[name] || linear;
}

/**
 * Parse cubic-bezier string.
 * @example parseCubicBezier('cubic-bezier(0.25, 0.1, 0.25, 1)')
 */
export function parseCubicBezier(value: string): EasingFunction | null {
  const match = value.match(
    /^cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/
  );
  if (!match) return null;

  const [, x1, y1, x2, y2] = match.map(Number);
  return createCubicBezier(x1, y1, x2, y2);
}

// Solves x(t) = ((2a * t + 3b) * t + 3c) * t = x for t, with x in (0, 1):
// u = 1/t is the largest real root of x·u³ − 3c·u² − 3b·u − 2a = 0
// (closed-form solver from https://github.com/gre/bezier-easing)
function solveTForX(x: number, a: number, b: number, c: number): number {
  const j = 1 / Math.max(c, Math.sqrt(x));
  const k = x * j;
  const l = k * j;
  const s = c * j;
  const q = b * l;
  const m = s * s + q;
  const h = -s * (s * s + 1.5 * q) - a * k * l;
  const D = h * h - m * m * m;
  let v: number;
  if (m === 0 || D > 1e-12 * h * h) {
    // one real root (Cardano)
    const U = -Math.cbrt(h < 0 ? h - Math.sqrt(D) : h + Math.sqrt(D));
    v = (U + m / U) || 0;
  } else {
    // three real roots, take the largest
    const r = Math.sqrt(m);
    v = 2 * r * Math.cos(Math.acos(Math.max(-1, Math.min(1, -h / (m * r)))) / 3);
  }
  return Math.min(1, k / (v + s));
}

/**
 * Create a cubic bezier easing function.
 */
export function createCubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): EasingFunction {
  if (x1 === y1 && x2 === y2) return linear;

  // x(t) = ((2a * t + 3b) * t + 3c) * t, y(t) = ((ay * t + by) * t + cy) * t
  const a = (3 * x1 - 3 * x2 + 1) / 2;
  const b = x2 - 2 * x1;
  const c = x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * (y2 - 2 * y1);
  const cy = 3 * y1;

  return function bezierEasing(x: number): number {
    // x outside (0, 1) saturates to 0 / 1
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const t = solveTForX(x, a, b, c);
    return ((ay * t + by) * t + cy) * t;
  };
}

/**
 * Parse spring physics string.
 * @example parseSpring('spring(1, 100, 10)')
 */
export function parseSpring(value: string): EasingFunction | null {
  const match = value.match(
    /^spring\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/
  );
  if (!match) return null;

  const [, mass, stiffness, damping] = match.map(Number);
  return createSpring(mass, stiffness, damping);
}

/**
 * Create a spring physics easing function.
 */
export function createSpring(
  mass: number,
  stiffness: number,
  damping: number
): EasingFunction {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  let wd: number;
  let A: number;

  if (zeta < 1) {
    // Under-damped
    wd = w0 * Math.sqrt(1 - zeta * zeta);
    A = 1;
  } else {
    // Critically damped or over-damped
    wd = 0;
    A = 1;
  }

  return function springEasing(t: number): number {
    if (t === 0) return 0;
    if (t >= 1) return 1;

    // Scale t to get a reasonable animation duration
    const scaledT = t * 5;

    if (zeta < 1) {
      // Under-damped
      return (
        1 -
        Math.exp(-zeta * w0 * scaledT) *
          (A * Math.cos(wd * scaledT) + ((zeta * w0 * A) / wd) * Math.sin(wd * scaledT))
      );
    } else {
      // Critically damped
      return 1 - (1 + w0 * scaledT) * Math.exp(-w0 * scaledT);
    }
  };
}

/**
 * Parse any easing string (preset, cubic-bezier, or spring).
 */
export function parseEasing(value: string): EasingFunction {
  // Check preset
  if (value in easingMap) {
    return easingMap[value as EasingName];
  }

  // Check cubic-bezier
  const bezier = parseCubicBezier(value);
  if (bezier) return bezier;

  // Check spring
  const spring = parseSpring(value);
  if (spring) return spring;

  // Default to linear
  return linear;
}
