import React from 'react';
import type { Scene, ComponentRegistry } from '@rendervid/core';
import { LayerRenderer } from '../layers/LayerRenderer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomComponentType = React.ComponentType<any>;

export interface SceneRendererProps {
  /** Scene to render */
  scene: Scene;
  /** Current frame number */
  frame: number;
  /** Frames per second */
  fps: number;
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Whether the scene is playing (for audio/video sync) */
  isPlaying?: boolean;
  /** Custom component registry */
  registry?: ComponentRegistry;
}

/**
 * Calculate scene duration in frames.
 */
function getSceneDuration(scene: Scene): number {
  return scene.endFrame - scene.startFrame;
}

/**
 * Convert ComponentRegistry to Map for backward compatibility with LayerRenderer.
 */
function registryToMap(registry?: ComponentRegistry): Map<string, CustomComponentType> | undefined {
  if (!registry) return undefined;

  const map = new Map<string, CustomComponentType>();
  const components = registry.list();

  for (const info of components) {
    const component = registry.get(info.name);
    if (component) {
      map.set(info.name, component as CustomComponentType);
    }
  }

  return map;
}

/**
 * Renders a complete scene with all its layers.
 */
export function SceneRenderer({
  scene,
  frame,
  fps,
  width,
  height,
  isPlaying = true,
  registry,
}: SceneRendererProps) {
  // sceneDuration should be in frames, not seconds
  const sceneDuration = getSceneDuration(scene);

  // Convert registry to map for LayerRenderer
  const registryMap = React.useMemo(() => registryToMap(registry), [registry]);

  // Resolve scene background style
  const backgroundStyle: React.CSSProperties = {};
  if (scene.backgroundColor) {
    backgroundStyle.backgroundColor = scene.backgroundColor;
  }
  if (scene.backgroundImage) {
    backgroundStyle.backgroundImage = `url(${scene.backgroundImage})`;
    backgroundStyle.backgroundSize = scene.backgroundFit || 'cover';
    backgroundStyle.backgroundPosition = 'center';
    backgroundStyle.backgroundRepeat = 'no-repeat';
  }

  // Sort layers by their order in the array (first = behind, last = front)
  const sortedLayers = [...(scene.layers || [])];

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        // No hardcoded background. The scene's own backgroundColor (if any)
        // is spread in via backgroundStyle below; otherwise the container
        // stays transparent and the parent (BrowserRenderer / template
        // output bg) shows through. Hardcoding #000 here meant any layer
        // with opacity < 1 composited against black, producing visibly
        // washed-out / desaturated content during phase crossfades on
        // light-themed templates.
        ...backgroundStyle,
      }}
    >
      {sortedLayers.map((layer) => (
        <LayerRenderer
          key={layer.id}
          layer={layer}
          frame={frame}
          fps={fps}
          sceneDuration={sceneDuration}
          isPlaying={isPlaying}
          registry={registryMap}
        />
      ))}
    </div>
  );
}

export interface TemplateRendererProps {
  /** Template scenes */
  scenes: Scene[];
  /** Current frame number (global) */
  frame: number;
  /** Frames per second */
  fps: number;
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Whether the scene is playing */
  isPlaying?: boolean;
  /** Custom component registry */
  registry?: ComponentRegistry;
}

/**
 * Renders the appropriate scene based on the current frame with transition support.
 */
export function TemplateRenderer({
  scenes,
  frame,
  fps,
  width,
  height,
  isPlaying = true,
  registry,
}: TemplateRendererProps) {
  // Filter out hidden scenes
  const visibleScenes = scenes.filter((s) => !(s as any).hidden);

  // Find the current scene and check for transitions
  let currentScene: Scene | null = null;
  let nextScene: Scene | null = null;
  let currentSceneIndex = -1;
  let localFrame = frame;
  let transitionProgress = 0;
  let transitionType: string | null = null;
  let transitionDirection: string | undefined = undefined;

  for (let i = 0; i < visibleScenes.length; i++) {
    const scene = visibleScenes[i];
    if (frame >= scene.startFrame && frame < scene.endFrame) {
      currentScene = scene;
      currentSceneIndex = i;
      localFrame = frame - scene.startFrame;

      // Check if we're in a transition period
      if (scene.transition && scene.transition.duration > 0 && i < visibleScenes.length - 1) {
        const transitionStart = scene.endFrame - scene.transition.duration;
        if (frame >= transitionStart && frame < scene.endFrame) {
          nextScene = visibleScenes[i + 1];
          transitionType = scene.transition.type;
          transitionDirection = scene.transition.direction;
          transitionProgress = (frame - transitionStart) / scene.transition.duration;
        }
      }
      break;
    }
  }

  // If no scene found, try to show the last frame of the last scene
  if (!currentScene && visibleScenes.length > 0) {
    const lastScene = visibleScenes[visibleScenes.length - 1];
    if (frame >= lastScene.endFrame) {
      currentScene = lastScene;
      localFrame = lastScene.endFrame - lastScene.startFrame - 1;
    }
  }

  if (!currentScene) {
    // Empty/no-scene fallback — keep transparent so the parent decides
    // the canvas bg (was previously hardcoded #000, which forced a black
    // tail on any export that ran past the last scene's endFrame).
    return (
      <div
        style={{
          width,
          height,
        }}
      />
    );
  }

  // If no transition, render single scene
  if (!nextScene || !transitionType) {
    return (
      <SceneRenderer
        scene={currentScene}
        frame={localFrame}
        fps={fps}
        width={width}
        height={height}
        isPlaying={isPlaying}
        registry={registry}
      />
    );
  }

  // Render transition between two scenes
  const nextLocalFrame = 0; // Next scene starts at frame 0

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
      }}
    >
      <TransitionRenderer
        outgoingScene={currentScene}
        incomingScene={nextScene}
        outgoingFrame={localFrame}
        incomingFrame={nextLocalFrame}
        progress={transitionProgress}
        transitionType={transitionType}
        direction={transitionDirection}
        fps={fps}
        width={width}
        height={height}
        isPlaying={isPlaying}
        registry={registry}
      />
    </div>
  );
}

interface TransitionRendererProps {
  outgoingScene: Scene;
  incomingScene: Scene;
  outgoingFrame: number;
  incomingFrame: number;
  progress: number;
  transitionType: string;
  direction?: string;
  fps: number;
  width: number;
  height: number;
  isPlaying: boolean;
  registry?: ComponentRegistry;
}

function TransitionRenderer({
  outgoingScene,
  incomingScene,
  outgoingFrame,
  incomingFrame,
  progress,
  transitionType,
  direction = 'left',
  fps,
  width,
  height,
  isPlaying,
  registry,
}: TransitionRendererProps) {
  const getTransitionStyle = (): React.CSSProperties => {
    switch (transitionType) {
      case 'fade': {
        // Keep outgoing fully opaque; the incoming scene fades in on top.
        // Fading both simultaneously (outgoing 1-p, incoming p) leaves
        // 25% body-bg leakthrough at mid-transition (50% × 50% transparency
        // stacked), producing a washed-out "ghost" frame.
        return {
          opacity: 1,
        };
      }
      case 'slide': {
        const offset = progress * 100;
        if (direction === 'left') {
          return { transform: `translateX(-${offset}%)` };
        } else if (direction === 'right') {
          return { transform: `translateX(${offset}%)` };
        } else if (direction === 'up') {
          return { transform: `translateY(-${offset}%)` };
        } else if (direction === 'down') {
          return { transform: `translateY(${offset}%)` };
        }
        return { transform: `translateX(-${offset}%)` };
      }
      case 'zoom': {
        const scale = 1 - progress;
        return {
          transform: `scale(${scale})`,
          opacity: scale,
        };
      }
      case 'wipe': {
        const offset = progress * 100;
        if (direction === 'left') {
          return { clipPath: `inset(0 ${offset}% 0 0)` };
        } else if (direction === 'right') {
          return { clipPath: `inset(0 0 0 ${offset}%)` };
        } else if (direction === 'up') {
          return { clipPath: `inset(0 0 ${offset}% 0)` };
        } else if (direction === 'down') {
          return { clipPath: `inset(${offset}% 0 0 0)` };
        }
        return { clipPath: `inset(0 ${offset}% 0 0)` };
      }
      case 'rotate': {
        // Rotate out with scale down
        const angle = progress * 90;
        const scale = 1 - progress * 0.5;
        return {
          transform: `rotate(${angle}deg) scale(${scale})`,
          opacity: 1 - progress,
          transformOrigin: 'center center',
        };
      }
      case 'flip': {
        // 3D flip effect
        const angle = progress * 90;
        const isHorizontal = direction === 'left' || direction === 'right';
        return {
          transform: isHorizontal
            ? `perspective(1000px) rotateY(${angle}deg)`
            : `perspective(1000px) rotateX(${angle}deg)`,
          opacity: progress > 0.5 ? 0 : 1,
          transformOrigin: 'center center',
        };
      }
      case 'blur': {
        // Blur out transition
        const blurAmount = progress * 20;
        return {
          filter: `blur(${blurAmount}px)`,
          opacity: 1 - progress,
        };
      }
      case 'circle': {
        // Circular reveal (contract)
        const radius = 150 * (1 - progress);
        return {
          clipPath: `circle(${radius}% at 50% 50%)`,
        };
      }
      case 'push': {
        // Push transition - both scenes move together
        const offset = progress * 100;
        if (direction === 'left') {
          return { transform: `translateX(-${offset}%)` };
        } else if (direction === 'right') {
          return { transform: `translateX(${offset}%)` };
        } else if (direction === 'up') {
          return { transform: `translateY(-${offset}%)` };
        } else if (direction === 'down') {
          return { transform: `translateY(${offset}%)` };
        }
        return { transform: `translateX(-${offset}%)` };
      }
      case 'crosszoom': {
        // Zoom out old scene, zoom in new scene
        const scale = 1 + progress * 0.5;
        return {
          transform: `scale(${scale})`,
          opacity: 1 - progress,
        };
      }
      case 'glitch': {
        // Glitch effect with random displacement
        const seed = Math.floor(progress * 100);
        const offsetX = ((seed * 9301 + 49297) % 233280) / 233280 * 20 - 10;
        const offsetY = ((seed * 421 + 2038074743) % 2147483647) / 2147483647 * 20 - 10;
        return {
          transform: `translate(${offsetX}px, ${offsetY}px)`,
          opacity: 1 - progress,
          filter: progress > 0.3 ? `hue-rotate(${progress * 360}deg)` : 'none',
        };
      }
      case 'dissolve': {
        // Pixelated dissolve effect
        const pixelSize = Math.floor(progress * 20);
        return {
          filter: pixelSize > 0 ? `blur(${pixelSize}px)` : 'none',
          opacity: 1 - progress,
        };
      }
      case 'cube': {
        // 3D cube rotation
        const angle = progress * 90;
        const isHorizontal = direction === 'left' || direction === 'right';
        const rotateDir = direction === 'left' || direction === 'up' ? -1 : 1;
        return {
          transform: isHorizontal
            ? `perspective(2000px) rotateY(${angle * rotateDir}deg) translateZ(-500px)`
            : `perspective(2000px) rotateX(${angle * rotateDir}deg) translateZ(-500px)`,
          transformOrigin: 'center center',
          opacity: progress > 0.5 ? 0 : 1,
        };
      }
      case 'swirl': {
        // Swirl/spiral effect
        const angle = progress * 180;
        const scale = 1 - progress;
        return {
          transform: `rotate(${angle}deg) scale(${scale})`,
          opacity: 1 - progress,
          filter: `blur(${progress * 10}px)`,
        };
      }
      case 'diagonal-wipe': {
        // Diagonal wipe transition
        const offset = progress * 150;
        if (direction === 'left') {
          // Top-left to bottom-right
          return { clipPath: `polygon(0 0, ${100 - offset}% 0, 0 ${100 - offset}%, 0 0)` };
        } else if (direction === 'right') {
          // Top-right to bottom-left
          return { clipPath: `polygon(100% 0, 100% ${100 - offset}%, ${offset}% 100%, 100% 100%, 100% 0)` };
        }
        return { clipPath: `polygon(0 0, ${100 - offset}% 0, 0 ${100 - offset}%, 0 0)` };
      }
      case 'iris': {
        // Iris out effect (shrinking circle)
        const radius = 100 * (1 - progress);
        return {
          clipPath: `circle(${radius}% at 50% 50%)`,
        };
      }
      case 'cut':
      default:
        return progress > 0.5 ? { opacity: 0 } : {};
    }
  };

  const getIncomingStyle = (): React.CSSProperties => {
    switch (transitionType) {
      case 'fade': {
        return {
          opacity: progress,
        };
      }
      case 'slide': {
        const offset = (1 - progress) * 100;
        if (direction === 'left') {
          return { transform: `translateX(${offset}%)` };
        } else if (direction === 'right') {
          return { transform: `translateX(-${offset}%)` };
        } else if (direction === 'up') {
          return { transform: `translateY(${offset}%)` };
        } else if (direction === 'down') {
          return { transform: `translateY(-${offset}%)` };
        }
        return { transform: `translateX(${offset}%)` };
      }
      case 'zoom': {
        const scale = progress;
        return {
          transform: `scale(${scale})`,
          opacity: scale,
        };
      }
      case 'wipe': {
        return {}; // Wipe only affects outgoing scene
      }
      case 'rotate': {
        // Rotate in with scale up
        const angle = (1 - progress) * -90;
        const scale = 0.5 + progress * 0.5;
        return {
          transform: `rotate(${angle}deg) scale(${scale})`,
          opacity: progress,
          transformOrigin: 'center center',
        };
      }
      case 'flip': {
        // 3D flip effect
        const angle = (1 - progress) * -90;
        const isHorizontal = direction === 'left' || direction === 'right';
        return {
          transform: isHorizontal
            ? `perspective(1000px) rotateY(${angle}deg)`
            : `perspective(1000px) rotateX(${angle}deg)`,
          opacity: progress > 0.5 ? 1 : 0,
          transformOrigin: 'center center',
        };
      }
      case 'blur': {
        // Blur in transition
        const blurAmount = (1 - progress) * 20;
        return {
          filter: `blur(${blurAmount}px)`,
          opacity: progress,
        };
      }
      case 'circle': {
        // Circular reveal (expand)
        const radius = 150 * progress;
        return {
          clipPath: `circle(${radius}% at 50% 50%)`,
        };
      }
      case 'push': {
        // Push transition - incoming scene follows outgoing
        const offset = (1 - progress) * 100;
        if (direction === 'left') {
          return { transform: `translateX(${offset}%)` };
        } else if (direction === 'right') {
          return { transform: `translateX(-${offset}%)` };
        } else if (direction === 'up') {
          return { transform: `translateY(${offset}%)` };
        } else if (direction === 'down') {
          return { transform: `translateY(-${offset}%)` };
        }
        return { transform: `translateX(${offset}%)` };
      }
      case 'crosszoom': {
        // Zoom in new scene
        const scale = 0.5 + progress * 0.5;
        return {
          transform: `scale(${scale})`,
          opacity: progress,
        };
      }
      case 'glitch': {
        // Glitch effect appearing
        const seed = Math.floor(progress * 100);
        const offsetX = ((seed * 9301 + 49297) % 233280) / 233280 * 20 - 10;
        const offsetY = ((seed * 421 + 2038074743) % 2147483647) / 2147483647 * 20 - 10;
        return {
          transform: progress > 0.7 ? `translate(${offsetX}px, ${offsetY}px)` : 'none',
          opacity: progress,
        };
      }
      case 'dissolve': {
        // Pixelated appear effect
        const pixelSize = Math.floor((1 - progress) * 20);
        return {
          filter: pixelSize > 0 ? `blur(${pixelSize}px)` : 'none',
          opacity: progress,
        };
      }
      case 'cube': {
        // 3D cube rotation
        const angle = (1 - progress) * -90;
        const isHorizontal = direction === 'left' || direction === 'right';
        const rotateDir = direction === 'left' || direction === 'up' ? -1 : 1;
        return {
          transform: isHorizontal
            ? `perspective(2000px) rotateY(${angle * rotateDir}deg) translateZ(-500px)`
            : `perspective(2000px) rotateX(${angle * rotateDir}deg) translateZ(-500px)`,
          transformOrigin: 'center center',
          opacity: progress > 0.5 ? 1 : 0,
        };
      }
      case 'swirl': {
        // Swirl/spiral effect appearing
        const angle = (1 - progress) * -180;
        const scale = progress;
        return {
          transform: `rotate(${angle}deg) scale(${scale})`,
          opacity: progress,
          filter: `blur(${(1 - progress) * 10}px)`,
        };
      }
      case 'diagonal-wipe': {
        // Diagonal wipe - incoming scene appears from opposite direction
        const offset = (1 - progress) * 150;
        if (direction === 'left') {
          // Appears from bottom-right
          return { clipPath: `polygon(100% 100%, ${offset}% 100%, 100% ${offset}%, 100% 100%)` };
        } else if (direction === 'right') {
          // Appears from bottom-left
          return { clipPath: `polygon(0 100%, 0 ${offset}%, ${100 - offset}% 100%, 0 100%)` };
        }
        return { clipPath: `polygon(100% 100%, ${offset}% 100%, 100% ${offset}%, 100% 100%)` };
      }
      case 'iris': {
        // Iris in effect (expanding circle)
        const radius = 100 * progress;
        return {
          clipPath: `circle(${radius}% at 50% 50%)`,
        };
      }
      case 'cut':
      default:
        return progress > 0.5 ? {} : { opacity: 0 };
    }
  };

  // For wipe transitions, outgoing scene needs to be on top so clip-path reveals incoming scene
  const needsOutgoingOnTop = transitionType === 'wipe' || transitionType === 'diagonal-wipe';

  return (
    <>
      {/* Incoming scene */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: needsOutgoingOnTop ? 0 : 1,
          ...getIncomingStyle(),
        }}
      >
        <SceneRenderer
          scene={incomingScene}
          frame={incomingFrame}
          fps={fps}
          width={width}
          height={height}
          isPlaying={isPlaying}
          registry={registry}
        />
      </div>

      {/* Outgoing scene */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: needsOutgoingOnTop ? 1 : 0,
          ...getTransitionStyle(),
        }}
      >
        <SceneRenderer
          scene={outgoingScene}
          frame={outgoingFrame}
          fps={fps}
          width={width}
          height={height}
          isPlaying={isPlaying}
          registry={registry}
        />
      </div>
    </>
  );
}

/**
 * Calculate total duration of all scenes in seconds.
 */
export function calculateTotalDuration(scenes: Scene[]): number {
  if (scenes.length === 0) return 0;
  const lastScene = scenes[scenes.length - 1];
  return lastScene.endFrame / 30; // Assume 30fps as default, caller should provide fps
}

/**
 * Calculate total frames for all scenes.
 */
export function calculateTotalFrames(scenes: Scene[], _fps: number): number {
  if (scenes.length === 0) return 0;
  const lastScene = scenes[scenes.length - 1];
  return lastScene.endFrame;
}

/**
 * Get scene at specific frame.
 */
export function getSceneAtFrame(
  scenes: Scene[],
  frame: number,
  _fps: number
): { scene: Scene; localFrame: number; sceneIndex: number } | null {
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (frame >= scene.startFrame && frame < scene.endFrame) {
      return {
        scene,
        localFrame: frame - scene.startFrame,
        sceneIndex: i,
      };
    }
  }

  // Return last frame of last scene if beyond duration
  if (scenes.length > 0) {
    const lastScene = scenes[scenes.length - 1];
    if (frame >= lastScene.endFrame) {
      return {
        scene: lastScene,
        localFrame: lastScene.endFrame - lastScene.startFrame - 1,
        sceneIndex: scenes.length - 1,
      };
    }
  }

  return null;
}
