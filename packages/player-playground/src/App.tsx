import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Layer, InputDefinition, Template } from '@rendervid/core';
import type { ThreeLayer as ThreeLayerType } from '@rendervid/core';
import { exportAnimatedSvg } from '@rendervid/core';
import { Player } from '@rendervid/player';
import type { AudioLayer as AudioLayerType } from '@rendervid/core';
import {
  ThreeLayer,
  AudioLayer,
  createBrowserRenderer,
  downloadBlob,
  isWebCodecsSupported,
} from '@rendervid/renderer-browser';
import { allTemplates, categories } from './templates';

type ZoomMode = 'fit' | number;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomComponentType = React.ComponentType<any>;

/**
 * Evaluate inline component code from template.customComponents
 * and return a Map of component name → React component.
 */
function buildComponentRegistry(
  customComponents: Record<string, { type: string; code?: string }> | undefined,
): Map<string, CustomComponentType> {
  const registry = new Map<string, CustomComponentType>();
  if (!customComponents) return registry;

  for (const [name, def] of Object.entries(customComponents)) {
    if (def.type !== 'inline' || !def.code) continue;
    try {
      const code = def.code;
      let component: CustomComponentType | null = null;

      if (code.includes('function') && code.includes('return')) {
        // Function component: function MyComponent(props) { ... }
        const wrappedCode = `
          return (function(React) {
            ${code}
            var match = ${JSON.stringify(code)}.match(/function\\s+(\\w+)/);
            if (match) { try { return eval(match[1]); } catch(e) {} }
            return null;
          });
        `;
        const factory = new Function(wrappedCode);
        component = factory()(React);
      } else if (code.includes('=>')) {
        // Arrow function: const MyComponent = (props) => ...
        const wrappedCode = `
          return (function(React) {
            ${code}
            var match = ${JSON.stringify(code)}.match(/(?:const|let|var)\\s+(\\w+)\\s*=/);
            if (match) { try { return eval(match[1]); } catch(e) {} }
            return null;
          });
        `;
        const factory = new Function(wrappedCode);
        component = factory()(React);
      }

      if (component && typeof component === 'function') {
        registry.set(name, component);
      } else {
        console.warn(`Failed to evaluate custom component "${name}"`);
      }
    } catch (err) {
      console.warn(`Error evaluating custom component "${name}":`, err);
    }
  }

  return registry;
}

function formatCategory(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function zoomLabel(z: ZoomMode): string {
  if (z === 'fit') return 'Fit';
  return `${Math.round(z * 100)}%`;
}

const ZOOM_PRESETS: ZoomMode[] = ['fit', 0.25, 0.5, 0.75, 1];

export function App() {
  const [selectedId, setSelectedId] = useState(allTemplates[0]?.id ?? '');
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState<ZoomMode>('fit');
  const [inputValues, setInputValues] = useState<Record<string, unknown>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const frameCount = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });

  const entry = allTemplates.find((e) => e.id === selectedId) ?? allTemplates[0];
  const template = entry?.template;

  // Reset inputValues when template changes
  useEffect(() => {
    if (!template) {
      setInputValues({});
      return;
    }
    const defaults: Record<string, unknown> = { ...template.defaults };
    if (template.inputs) {
      for (const input of template.inputs) {
        if (input.default !== undefined && !(input.key in defaults)) {
          defaults[input.key] = input.default;
        }
      }
    }
    setInputValues(defaults);
  }, [selectedId, template]);

  // Measure available viewport space
  const measureViewport = useCallback(() => {
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    measureViewport();
    window.addEventListener('resize', measureViewport);
    return () => window.removeEventListener('resize', measureViewport);
  }, [measureViewport]);

  // Build component registry from template.customComponents
  const componentRegistry = useMemo(
    () => buildComponentRegistry(template?.customComponents),
    [template],
  );

  // Export handler
  const handleExport = useCallback(async (tmpl: Template) => {
    if (exporting) return;
    setExporting(true);
    setExportProgress(0);
    setExportError(null);
    try {
      const renderer = createBrowserRenderer({
        preferWebCodecs: isWebCodecsSupported(),
      });
      const format = isWebCodecsSupported() ? 'mp4' as const : 'webm' as const;
      const result = await renderer.renderVideo({
        template: tmpl,
        inputs: inputValues,
        format,
        onProgress: (p) => setExportProgress(Math.round(p.percentage)),
      });
      const ext = format === 'mp4' ? 'mp4' : 'webm';
      const filename = `${tmpl.name || 'video'}.${ext}`.replace(/\s+/g, '-').toLowerCase();
      downloadBlob(result.blob, filename);
      renderer.dispose();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  }, [exporting, inputValues]);

  // SVG export handler
  const handleExportSvg = useCallback((tmpl: Template) => {
    try {
      const result = exportAnimatedSvg(tmpl, inputValues);
      const blob = new Blob([result.svg], { type: 'image/svg+xml' });
      const filename = `${tmpl.name || 'animation'}.svg`.replace(/\s+/g, '-').toLowerCase();
      downloadBlob(blob, filename);
      if (result.unsupportedLayers.length > 0) {
        const names = result.unsupportedLayers.map(l => `${l.name || l.id} (${l.type})`).join(', ');
        console.warn(`SVG export skipped unsupported layers: ${names}`);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    }
  }, [inputValues]);

  // Custom layer renderer for Three.js 3D layers and custom components
  const renderLayer = useMemo(() => {
    if (!template) return undefined;
    const fps = template.output.fps ?? 30;
    const totalFrames =
      template.composition.scenes.length > 0
        ? Math.max(...template.composition.scenes.map((s) => s.endFrame))
        : 0;
    return (layer: Layer, frame: number) => {
      if (layer.type === 'three') {
        const scene = template.composition.scenes.find(
          (s) => frame >= s.startFrame && frame < s.endFrame
        );
        const sceneDuration = scene ? scene.endFrame - scene.startFrame : totalFrames;
        return (
          <ThreeLayer
            layer={layer as ThreeLayerType}
            frame={frame}
            fps={fps}
            sceneDuration={sceneDuration}
          />
        );
      }
      if (layer.type === 'audio') {
        const scene = template.composition.scenes.find(
          (s) => frame >= s.startFrame && frame < s.endFrame
        );
        const sceneDuration = scene ? scene.endFrame - scene.startFrame : totalFrames;
        return (
          <AudioLayer
            layer={layer as AudioLayerType}
            frame={frame}
            fps={fps}
            sceneDuration={sceneDuration}
            isPlaying={isPlaying}
          />
        );
      }
      if (layer.type === 'custom') {
        const customComponent = (layer as { customComponent?: { name: string; props?: Record<string, unknown> } }).customComponent;
        const Component = customComponent ? componentRegistry.get(customComponent.name) : undefined;
        if (Component && customComponent) {
          const scene = template.composition.scenes.find(
            (s) => frame >= s.startFrame && frame < s.endFrame
          );
          const sceneDuration = scene ? scene.endFrame - scene.startFrame : totalFrames;
          const localFrame = scene ? frame - scene.startFrame - (layer.from ?? 0) : frame;
          return (
            <Component
              {...(customComponent.props ?? {})}
              frame={localFrame}
              fps={fps}
              sceneDuration={sceneDuration}
              layerSize={layer.size}
            />
          );
        }
      }
      return null; // fall back to default rendering
    };
  }, [template, componentRegistry, isPlaying]);

  if (!template) {
    return <div style={{ padding: 40, color: '#fff' }}>No templates found in examples/</div>;
  }

  const tw = template.output.width;
  const th = template.output.height;
  const fps = template.output.fps ?? 30;
  const totalFrames =
    template.composition.scenes.length > 0
      ? Math.max(...template.composition.scenes.map((s) => s.endFrame))
      : 0;
  const duration = fps ? totalFrames / fps : 0;

  // Controls add ~100px height, add padding
  const controlsHeight = showControls ? 100 : 0;
  const padding = 48;
  const availW = viewportSize.width - padding * 2;
  const availH = viewportSize.height - padding * 2 - controlsHeight;

  const scale =
    zoom === 'fit'
      ? Math.min(availW / tw, availH / th, 1)
      : zoom;

  const scaledW = tw * scale;
  const scaledH = th * scale;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Player area */}
      <div
        ref={viewportRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          padding: `${padding}px`,
          minWidth: 0,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            width: scaledW,
            height: scaledH + controlsHeight * scale,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: tw,
              height: th + controlsHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <Player
              key={`${selectedId}-${autoplay}-${speed}`}
              template={template}
              inputs={inputValues}
              width={tw}
              height={th}
              controls={showControls}
              autoplay={autoplay}
              loop={loop}
              speed={speed}
              renderLayer={renderLayer}
              onExport={handleExport}
              onComplete={() => {
                console.log('[onComplete]');
              }}
              onFrameChange={(frame) => {
                frameCount.current++;
                if (frameCount.current % 30 === 0) {
                  console.log('[onFrameChange]', frame);
                }
              }}
              onPlayStateChange={(playing) => {
                setIsPlaying(playing);
                console.log('[onPlayStateChange]', playing);
              }}
            />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        style={{
          width: '280px',
          flexShrink: 0,
          backgroundColor: '#18181b',
          borderLeft: '1px solid #27272a',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto',
        }}
      >
        {/* Template selector */}
        <Section title={`Template (${allTemplates.length})`}>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              frameCount.current = 0;
            }}
            style={selectStyle}
          >
            {categories.map((group) => (
              <optgroup key={group.category} label={formatCategory(group.category)}>
                {group.entries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.template.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Section>

        {/* Template info */}
        <Section title="Info">
          <InfoRow label="Category" value={formatCategory(entry.category)} />
          <InfoRow label="Dimensions" value={`${tw}x${th}`} />
          <InfoRow label="FPS" value={template.output.fps ?? 'N/A'} />
          <InfoRow label="Duration" value={duration > 0 ? `${duration.toFixed(1)}s` : 'N/A'} />
          <InfoRow label="Scenes" value={template.composition.scenes.length} />
          <InfoRow label="Type" value={template.output.type} />
        </Section>

        {/* Inputs */}
        {template.inputs && template.inputs.length > 0 && (
          <Section title={`Inputs (${template.inputs.length})`}>
            {template.inputs.map((input: InputDefinition) => (
              <PlaygroundInputField
                key={input.key}
                input={input}
                value={inputValues[input.key]}
                onChange={(val) => setInputValues((prev) => ({ ...prev, [input.key]: val }))}
              />
            ))}
            <button
              onClick={() => {
                const defaults: Record<string, unknown> = { ...template.defaults };
                if (template.inputs) {
                  for (const inp of template.inputs) {
                    if (inp.default !== undefined && !(inp.key in defaults)) {
                      defaults[inp.key] = inp.default;
                    }
                  }
                }
                setInputValues(defaults);
              }}
              style={{
                marginTop: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                backgroundColor: '#27272a',
                color: '#a1a1aa',
                border: '1px solid #3f3f46',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Reset to defaults
            </button>
          </Section>
        )}

        {/* Export */}
        <Section title="Export">
          {exporting ? (
            <div>
              <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                Rendering... {exportProgress}%
              </div>
              <div style={{
                width: '100%', height: '4px', backgroundColor: '#27272a',
                borderRadius: '2px', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${exportProgress}%`, height: '100%',
                  backgroundColor: '#6366f1', borderRadius: '2px',
                  transition: 'width 0.2s ease',
                }} />
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => template && handleExport(template)}
                style={{
                  width: '100%', padding: '8px', fontSize: '13px', fontWeight: 600,
                  backgroundColor: '#16a34a', color: '#fff', border: 'none',
                  borderRadius: '6px', cursor: 'pointer',
                }}
              >
                Export {isWebCodecsSupported() ? 'MP4' : 'WebM'}
              </button>
              <button
                onClick={() => template && handleExportSvg(template)}
                style={{
                  width: '100%', padding: '8px', fontSize: '13px', fontWeight: 600,
                  backgroundColor: '#7c3aed', color: '#fff', border: 'none',
                  borderRadius: '6px', cursor: 'pointer', marginTop: '4px',
                }}
              >
                Export SVG
              </button>
              {exportError && (
                <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>
                  {exportError}
                </div>
              )}
            </>
          )}
        </Section>

        {/* Zoom */}
        <Section title={`Zoom: ${zoomLabel(zoom)}`}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {ZOOM_PRESETS.map((z) => (
              <button
                key={String(z)}
                onClick={() => setZoom(z)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  backgroundColor: zoom === z ? '#6366f1' : '#27272a',
                  color: zoom === z ? '#fff' : '#a1a1aa',
                  border: '1px solid',
                  borderColor: zoom === z ? '#6366f1' : '#3f3f46',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {zoomLabel(z)}
              </button>
            ))}
          </div>
        </Section>

        {/* Controls */}
        <Section title="Controls">
          <Toggle label="Autoplay" checked={autoplay} onChange={setAutoplay} />
          <Toggle label="Loop" checked={loop} onChange={setLoop} />
          <Toggle label="Show controls" checked={showControls} onChange={setShowControls} />
        </Section>

        {/* Speed */}
        <Section title={`Speed: ${speed}x`}>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#6366f1' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#71717a' }}>
            <span>0.25x</span>
            <span>1x</span>
            <span>2x</span>
            <span>4x</span>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#a1a1aa',
          marginBottom: '8px',
        }}
      >
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        color: '#d4d4d8',
        cursor: 'pointer',
      }}
    >
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#6366f1' }}
      />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
      }}
    >
      <span style={{ color: '#71717a' }}>{label}</span>
      <span style={{ color: '#d4d4d8' }}>{value}</span>
    </div>
  );
}

function PlaygroundInputField({
  input,
  value,
  onChange,
}: {
  input: InputDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: '#27272a',
    color: '#fff',
    border: '1px solid #3f3f46',
    borderRadius: '4px',
    boxSizing: 'border-box',
  };

  const renderControl = () => {
    switch (input.type) {
      case 'boolean':
        return (
          <Toggle
            label={input.label || input.key}
            checked={Boolean(value)}
            onChange={(v) => onChange(v)}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value != null ? Number(value) : ''}
            min={input.validation?.min}
            max={input.validation?.max}
            step={input.validation?.step}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            style={fieldStyle}
          />
        );
      case 'color':
        return (
          <input
            type="color"
            value={typeof value === 'string' ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...fieldStyle, height: '28px', padding: '2px', cursor: 'pointer' }}
          />
        );
      case 'enum':
        return (
          <select
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...fieldStyle, cursor: 'pointer' }}
          >
            <option value="">-- Select --</option>
            {input.validation?.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'url':
      case 'image' as any:
      case 'video' as any: {
        const allowedTypes = input.validation?.allowedTypes as string[] | undefined;
        const isImage = input.type === ('image' as any) || allowedTypes?.includes('image');
        const isVideo = input.type === ('video' as any) || allowedTypes?.includes('video');
        const typeLabel = isVideo ? 'Video' : isImage ? 'Image' : 'URL';
        const strValue = String(value ?? '');
        const hasPreview = isImage && strValue && strValue !== '';

        return (
          <div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input
                type="text"
                value={strValue}
                onChange={(e) => onChange(e.target.value)}
                placeholder={input.ui?.placeholder || `Enter ${typeLabel.toLowerCase()} URL...`}
                style={{ ...fieldStyle, flex: 1 }}
              />
              <span style={{
                padding: '2px 5px',
                fontSize: '9px',
                fontWeight: 600,
                backgroundColor: isVideo ? '#7c3aed' : isImage ? '#0284c7' : '#3f3f46',
                color: '#fff',
                borderRadius: '3px',
                whiteSpace: 'nowrap' as const,
                textTransform: 'uppercase' as const,
              }}>
                {typeLabel}
              </span>
            </div>
            {hasPreview && (
              <div style={{
                marginTop: '4px',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #3f3f46',
                maxHeight: '60px',
              }}>
                <img
                  src={strValue}
                  alt=""
                  style={{ width: '100%', height: '60px', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        );
      }
      default:
        return (
          <input
            type={input.type === 'date' ? 'date' : 'text'}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={input.ui?.placeholder}
            style={fieldStyle}
          />
        );
    }
  };

  if (input.type === 'boolean') {
    return <div>{renderControl()}</div>;
  }

  return (
    <div>
      <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '3px' }}>
        {input.label || input.key}
      </div>
      {renderControl()}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontSize: '13px',
  backgroundColor: '#27272a',
  color: '#fff',
  border: '1px solid #3f3f46',
  borderRadius: '4px',
  cursor: 'pointer',
};
