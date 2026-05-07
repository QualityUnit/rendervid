// Core renderer
export {
  BrowserRenderer,
  createBrowserRenderer,
  RenderCancelledError,
  type BrowserRendererOptions,
  type RenderVideoOptions,
  type RenderImageOptions,
  type RenderProgress,
  type VideoResult,
  type ImageResult,
} from './renderer';

export {
  SceneRenderer,
  TemplateRenderer,
  calculateTotalDuration,
  calculateTotalFrames,
  getSceneAtFrame,
  type SceneRendererProps,
  type TemplateRendererProps,
} from './renderer';

// Layer components
export {
  ImageLayer,
  TextLayer,
  VideoLayer,
  ShapeLayer,
  AudioLayer,
  GroupLayer,
  LottieLayer,
  CustomLayer,
  ThreeLayer,
  GifLayer,
  CaptionLayer,
  LayerRenderer,
  type ImageLayerProps,
  type TextLayerProps,
  type VideoLayerProps,
  type ShapeLayerProps,
  type AudioLayerProps,
  type GroupLayerProps,
  type LottieLayerProps,
  type CustomLayerProps,
  type ThreeLayerProps,
  type GifLayerProps,
  type CaptionLayerProps,
  type LayerRendererProps,
} from './layers';

// Animation hooks
export {
  useLayerAnimation,
  type UseLayerAnimationResult,
} from './hooks/useLayerAnimation';

// Style utilities
export {
  resolveStyle,
  mergeStyles,
  getStyleClassName,
  type ResolvedStyle,
} from './styles/resolver';

// Encoder utilities
export {
  // Capturer
  createFrameCapturer,
  createOffscreenCapturer,
  type CaptureOptions,
  type CaptureResult,
  type FrameCapturer,
  // WebCodecs
  createWebCodecsEncoder,
  isWebCodecsSupported,
  getRecommendedCodec,
  canvasToVideoFrame,
  type WebCodecsEncoderOptions,
  type EncodedChunk,
  type WebCodecsEncoder,
  // MediaRecorder
  createMediaRecorderEncoder,
  createFrameByFrameRecorder,
  getBestMimeType,
  isMediaRecorderSupported,
  type MediaRecorderEncoderOptions,
  type MediaRecorderEncoder,
  type FrameByFrameRecorderOptions,
  type FrameByFrameRecorder,
  // Muxer
  createMp4Muxer,
  createWebMMuxer,
  blobToArrayBuffer,
  arrayBufferToBlob,
  downloadBlob,
  downloadArrayBuffer,
  type MuxerOptions,
  type AudioChunk,
  type VideoMuxer,
  type WebMMuxerOptions,
  // GIF
  createGifEncoder,
  type GifEncoderOptions,
  type GifEncoder,
} from './encoder';
