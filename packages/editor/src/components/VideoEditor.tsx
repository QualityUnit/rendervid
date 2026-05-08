import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { Template } from '@rendervid/core';
import { TemplateProcessor } from '@rendervid/core';
import { useEditorStore } from '../context/EditorStore';
import { Preview } from './Preview/Preview';
import { Timeline } from './Timeline/Timeline';
import { PropertyPanel } from './PropertyPanel/PropertyPanel';
import { InputPanel } from './InputPanel/InputPanel';
import { ExportDialog } from './ExportDialog/ExportDialog';
import type { EditorConfig, EditorCallbacks } from '../types';

const templateProcessor = new TemplateProcessor();

export interface VideoEditorProps {
  template: Template;
  config?: EditorConfig;
  callbacks?: EditorCallbacks;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function VideoEditor({
  template: initialTemplate,
  config = {},
  callbacks = {},
  width = '100%',
  height = '800px',
  className = '',
}: VideoEditorProps) {
  const {
    template,
    selectedLayerId,
    selectedSceneId,
    currentFrame,
    isPlaying,
    zoom,
    inputValues,
    setTemplate,
    setInputValue,
    resetInputValues,
    selectLayer,
    selectScene,
    setCurrentFrame,
    setPlaying,
    togglePlay,
    setZoom,
    undo,
    redo,
    canUndo,
    canRedo,
    addLayer,
    updateLayer,
    updateLayerWithoutHistory,
    deleteLayer,
    duplicateLayer,
    reorderLayers,
    moveLayerToScene,
    addScene,
    updateScene,
    deleteScene,
    getSelectedLayer,
    getSelectedScene,
    getTotalFrames,
    updateTemplate,
  } = useEditorStore();

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(250);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const dragRef = useRef<{ type: 'timeline' | 'right-panel'; startPos: number; startSize: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, type: 'timeline' | 'right-panel') => {
    e.preventDefault();
    dragRef.current = {
      type,
      startPos: type === 'timeline' ? e.clientY : e.clientX,
      startSize: type === 'timeline' ? timelineHeight : rightPanelWidth,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { type, startPos, startSize } = dragRef.current;
      if (type === 'timeline') {
        const delta = startPos - e.clientY;
        setTimelineHeight(Math.max(100, Math.min(600, startSize + delta)));
      } else {
        const delta = startPos - e.clientX;
        setRightPanelWidth(Math.max(200, Math.min(600, startSize + delta)));
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = type === 'timeline' ? 'ns-resize' : 'ew-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [timelineHeight, rightPanelWidth]);

  // Resolve template with input values for preview rendering
  const resolvedTemplate = useMemo(() => {
    if (!template.inputs || template.inputs.length === 0 || Object.keys(inputValues).length === 0) {
      return template;
    }
    return templateProcessor.resolveInputs(template, inputValues);
  }, [template, inputValues]);

  const handleUpdateCustomComponentCode = (name: string, code: string) => {
    const existing = template.customComponents?.[name];
    updateTemplate({
      customComponents: {
        ...template.customComponents,
        [name]: {
          type: 'inline' as const,
          ...existing,
          code,
        },
      },
    });
  };

  // Initialize template
  useEffect(() => {
    setTemplate(initialTemplate);
  }, [initialTemplate, setTemplate]);

  // Call onChange callback
  useEffect(() => {
    if (callbacks.onChange) {
      callbacks.onChange(template);
    }
  }, [template, callbacks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Play/Pause: Space
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }

      // Undo: Cmd+Z / Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      }

      // Redo: Cmd+Shift+Z / Ctrl+Shift+Z or Cmd+Y / Ctrl+Y
      if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        if (canRedo()) redo();
      }

      // Delete: Delete/Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
        e.preventDefault();
        deleteLayer(selectedLayerId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, undo, redo, canUndo, canRedo, deleteLayer, selectedLayerId]);

  const handleAddLayer = (type: string) => {
    const scene = getSelectedScene() || template.composition.scenes[0];
    if (!scene) return;

    const isAudio = type === 'audio';
    const newLayer = {
      id: `layer-${Date.now()}`,
      type,
      position: isAudio ? { x: 0, y: 0 } : { x: 100, y: 100 },
      size: isAudio ? { width: 0, height: 0 } : { width: 400, height: 300 },
      props: getDefaultLayerProps(type),
    };

    addLayer((scene as any).id, newLayer);
  };

  const handleExport = async () => {
    if (callbacks.onExport) {
      try {
        await callbacks.onExport(template);
      } catch (error) {
        if (callbacks.onError) {
          callbacks.onError(error as Error);
        }
      }
    } else {
      setShowExportDialog(true);
    }
  };

  const handleSave = async () => {
    if (callbacks.onSave) {
      try {
        await callbacks.onSave(template);
      } catch (error) {
        if (callbacks.onError) {
          callbacks.onError(error as Error);
        }
      }
    }
  };

  const handleLoadTemplate = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.output && json.composition) {
          // Ensure scenes and layers have unique IDs
          const scenes = json.composition.scenes || [];
          for (let si = 0; si < scenes.length; si++) {
            if (!scenes[si].id) scenes[si].id = `scene-${Date.now()}-${si}`;
            if (!scenes[si].name) scenes[si].name = `Scene ${si + 1}`;
            const layers = scenes[si].layers || [];
            for (let li = 0; li < layers.length; li++) {
              if (!layers[li].id) layers[li].id = `layer-${Date.now()}-${si}-${li}`;
            }
          }
          setTemplate(json as Template);
        } else {
          callbacks.onError?.(new Error('Invalid template file: missing "output" or "composition"'));
        }
      } catch (err) {
        callbacks.onError?.(new Error(`Failed to parse template file: ${(err as Error).message}`));
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be loaded again
    e.target.value = '';
  }, [setTemplate, callbacks]);

  const handleAddScene = () => {
    const scenes = template.composition.scenes;
    const lastScene = scenes[scenes.length - 1] as any;
    const startFrame = lastScene ? (lastScene.endFrame ?? lastScene.startFrame + 150) : 0;
    const duration = 150;
    addScene({
      id: `scene-${Date.now()}`,
      name: `Scene ${scenes.length + 1}`,
      startFrame,
      endFrame: startFrame + duration,
      layers: [],
    });
  };

  const totalFrames = getTotalFrames();
  const selectedLayer = getSelectedLayer();
  const currentSceneId = selectedSceneId || (template.composition.scenes[0] as any)?.id;
  const currentScene = template.composition.scenes.find((s: any) => s.id === currentSceneId);
  const layers = (currentScene as any)?.layers || [];

  return (
    <div
      className={`rendervid-video-editor ${className}`}
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: '#2a2a2a',
          borderBottom: '1px solid #444',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, flex: 1 }}>
          {template.name || 'Untitled'}
        </h2>

        <button
          onClick={() => canUndo() && undo()}
          disabled={!canUndo()}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: canUndo() ? '#444' : '#2a2a2a',
            color: canUndo() ? '#fff' : '#666',
            border: 'none',
            borderRadius: '4px',
            cursor: canUndo() ? 'pointer' : 'not-allowed',
          }}
          title="Undo (Cmd/Ctrl+Z)"
        >
          ↶ Undo
        </button>

        <button
          onClick={() => canRedo() && redo()}
          disabled={!canRedo()}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: canRedo() ? '#444' : '#2a2a2a',
            color: canRedo() ? '#fff' : '#666',
            border: 'none',
            borderRadius: '4px',
            cursor: canRedo() ? 'pointer' : 'not-allowed',
          }}
          title="Redo (Cmd/Ctrl+Shift+Z)"
        >
          ↷ Redo
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={handleLoadTemplate}
          style={{
            padding: '6px 16px',
            fontSize: '12px',
            backgroundColor: '#444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          title="Load template from JSON file"
        >
          Load
        </button>

        {callbacks.onSave && (
          <button
            onClick={handleSave}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              backgroundColor: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        )}

        <button
          onClick={handleExport}
          style={{
            padding: '6px 16px',
            fontSize: '12px',
            backgroundColor: '#00aa00',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Export
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Center - Preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a1a', minWidth: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px' }}>
            <Preview
              template={resolvedTemplate}
              currentFrame={currentFrame}
              isPlaying={isPlaying}
              onFrameChange={setCurrentFrame}
              onPlayingChange={setPlaying}
              width={template.output.width * 0.5 * zoom}
              height={template.output.height * 0.5 * zoom}
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={selectLayer}
              onUpdateLayer={(id, updates) => updateLayer(id, updates)}
              onUpdateLayerWithoutHistory={(id, updates) => updateLayerWithoutHistory(id, updates)}
            />
          </div>

          {/* Playback Controls */}
          <div style={{ padding: '12px', backgroundColor: '#2a2a2a', borderTop: '1px solid #444', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setCurrentFrame(0)}
              style={{
                padding: '8px',
                backgroundColor: '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Go to start"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 5h2v14H6zM9.5 12l10 7V5z" />
              </svg>
            </button>
            <button
              onClick={togglePlay}
              style={{
                padding: '8px 16px',
                backgroundColor: '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Play/Pause (Space)"
            >
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setCurrentFrame(totalFrames - 1)}
              style={{
                padding: '8px',
                backgroundColor: '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Go to end"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16 5h2v14h-2zM4.5 19l10-7-10-7z" />
              </svg>
            </button>

            <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
              Frame {currentFrame} / {totalFrames}
            </span>

            <div style={{ flex: 1 }} />

            {/* Zoom Controls */}
            <button
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
              disabled={zoom <= 0.25}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                backgroundColor: zoom > 0.25 ? '#444' : '#2a2a2a',
                color: zoom > 0.25 ? '#fff' : '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: zoom > 0.25 ? 'pointer' : 'not-allowed',
              }}
              title="Zoom out"
            >
              −
            </button>
            <span style={{ fontSize: '12px', color: '#ccc', minWidth: '40px', textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              disabled={zoom >= 3}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                backgroundColor: zoom < 3 ? '#444' : '#2a2a2a',
                color: zoom < 3 ? '#fff' : '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: zoom < 3 ? 'pointer' : 'not-allowed',
              }}
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                backgroundColor: '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Reset zoom to 100%"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Right Sidebar - Input Panel + Property Panel */}
        <div style={{ width: `${rightPanelWidth}px`, position: 'relative', display: 'flex', flexShrink: 0 }}>
          {/* Resize handle */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'right-panel')}
            style={{
              width: '4px',
              cursor: 'ew-resize',
              backgroundColor: 'transparent',
              flexShrink: 0,
              borderLeft: '1px solid #444',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#555')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
          />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {template.inputs && template.inputs.length > 0 && (
            <InputPanel
              inputs={template.inputs}
              values={inputValues}
              onChangeValue={setInputValue}
              onReset={resetInputValues}
            />
          )}
          <PropertyPanel
            selectedLayer={selectedLayer}
            onUpdateLayer={(updates) => selectedLayerId && updateLayer(selectedLayerId, updates)}
            template={template}
            onUpdateCustomComponentCode={handleUpdateCustomComponentCode}
            selectedScene={!selectedLayerId && selectedSceneId ? currentScene : undefined}
            onUpdateScene={(updates) => currentSceneId && updateScene(currentSceneId, updates)}
          />
        </div>
        </div>
      </div>

      {/* Timeline resize handle */}
      <div
        onMouseDown={(e) => handleResizeMouseDown(e, 'timeline')}
        style={{
          height: '4px',
          cursor: 'ns-resize',
          backgroundColor: 'transparent',
          borderTop: '1px solid #444',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#555')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
      />

      {/* Timeline */}
      <div style={{ height: `${timelineHeight}px`, flexShrink: 0 }}>
        <Timeline
          totalFrames={totalFrames || 300}
          fps={template.output.fps || 30}
          currentFrame={currentFrame}
          onFrameChange={setCurrentFrame}
          zoom={zoom}
          onZoomChange={setZoom}
          scenes={template.composition.scenes}
          selectedSceneId={currentSceneId}
          selectedLayerId={selectedLayerId}
          onSelectScene={selectScene}
          onSelectLayer={selectLayer}
          onUpdateLayer={(id, updates) => updateLayer(id, updates)}
          onDeleteLayer={deleteLayer}
          onDuplicateLayer={duplicateLayer}
          onDeleteScene={deleteScene}
          onAddLayer={handleAddLayer}
          onAddScene={handleAddScene}
          onReorderLayers={reorderLayers}
          onMoveLayerToScene={moveLayerToScene}
          onUpdateScene={(id, updates) => updateScene(id, updates)}
        />
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          template={resolvedTemplate}
          inputValues={inputValues}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
}

function getDefaultLayerProps(type: string): any {
  switch (type) {
    case 'text':
      return {
        text: 'New Text',
        fontSize: 48,
        color: '#ffffff',
        fontWeight: 'normal',
        textAlign: 'center',
      };
    case 'shape':
      return {
        shape: 'rectangle',
        fill: '#4444ff',
        borderRadius: 0,
      };
    case 'image':
      return {
        src: '',
        fit: 'cover',
      };
    case 'video':
      return {
        videoSrc: '',
        fit: 'cover',
      };
    case 'audio':
      return {
        src: '',
        volume: 1.0,
        loop: false,
      };
    case 'gif':
      return {
        src: '',
        loop: true,
        speed: 1,
      };
    case 'caption':
      return {
        content: '1\n00:00:00,000 --> 00:00:03,000\nSample subtitle text',
        format: 'srt',
        fontSize: 32,
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        textAlign: 'center',
      };
    default:
      return {};
  }
}
