// Configuration constants for VOR Rehabilitation System
const CONFIG = {
  // Eye tracking parameters
  SMOOTHING_FACTOR: 0.1,
  SACCADE_THRESHOLD: 600,
  SAMPLE_WINDOW_MS: 200,
  
  // Exercise levels
  LEVELS: {
    1: {
      name: "Fijación Central",
      description: "Mantén la mirada fija en el objetivo central mientras mueves la cabeza lentamente.",
      duration: 30000, // 30 seconds
      targetSize: 40,
      allowedDeviation: 50,
      headMovementRequired: true
    },
    2: {
      name: "Movimiento Horizontal", 
      description: "Sigue el objetivo que se mueve horizontalmente manteniendo la cabeza quieta.",
      duration: 45000,
      targetSize: 35,
      allowedDeviation: 40,
      headMovementRequired: false
    },
    3: {
      name: "Movimiento Vertical",
      description: "Sigue el objetivo que se mueve verticalmente manteniendo la cabeza quieta.",
      duration: 45000,
      targetSize: 35,
      allowedDeviation: 40,
      headMovementRequired: false
    },
    4: {
      name: "Movimiento Diagonal",
      description: "Sigue el objetivo en movimientos diagonales complejos.",
      duration: 60000,
      targetSize: 30,
      allowedDeviation: 35,
      headMovementRequired: false
    },
    5: {
      name: "Seguimiento Complejo",
      description: "Ejercicio avanzado con múltiples objetivos y patrones impredecibles.",
      duration: 90000,
      targetSize: 25,
      allowedDeviation: 30,
      headMovementRequired: true
    }
  },
  
  // Calibration settings
  CALIBRATION: {
    points: [
      [0.1,0.1],[0.3,0.1],[0.5,0.1],[0.7,0.1],[0.9,0.1],
      [0.1,0.3],[0.5,0.3],[0.9,0.3],
      [0.1,0.5],[0.5,0.5],[0.9,0.5],
      [0.1,0.7],[0.5,0.7],[0.9,0.7],
      [0.1,0.9],[0.3,0.9],[0.5,0.9],[0.7,0.9],[0.9,0.9]
    ],
    fixationTime: 2000,
    minSamples: 10
  },
  
  // Scoring system
  SCORING: {
    maxScore: 1000,
    timeBonus: 0.5,
    accuracyWeight: 0.7,
    stabilityWeight: 0.3
  }
};

// Global state
const STATE = {
  currentLevel: 1,
  isCalibrated: false,
  isRunning: false,
  isPaused: false,
  sessionData: [],
  currentScore: 0,
  startTime: null,
  eyeTracker: null
};