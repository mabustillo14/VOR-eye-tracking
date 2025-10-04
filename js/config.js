// Configuration constants
const CONFIG = {
  SACCADE_VEL_THRESHOLD: 1500,
  SAMPLE_WINDOW_MS: 100,
  HEAD_VEL_THRESHOLD: 50,
  EYE_VEL_THRESHOLD: 200,
  MIN_HEAD_VEL_FOR_GAIN: 5,
  PREVIEW_WIDTH: 320
};

// Global state
const STATE = {
  sessionActive: false,
  currentLevel: null,
  completedLevels: new Set(),
  recorded: [],
  frameCount: 0,
  saccCount: 0,
  lastHeadAngle: null,
  lastGaze: null,
  lastTimestamp: null,
  latencyEstimates: [],
  fixPositions: [],
  webgazerCanvas: null,
  force: null,
  nodes: [],
  currentTargetPosition: { x: 0, y: 0 }
};

// Utility functions
const UTILS = {
  mean: (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1),
  rms: (arr) => Math.sqrt(UTILS.mean(arr.map(v => v * v)))
};