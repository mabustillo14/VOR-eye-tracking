// Main application controller
class VORApp {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (!window.saveDataAcrossSessions) {
      await localforage.setItem('webgazerGlobalData', null);
      await localforage.setItem('webgazerGlobalSettings', null);
    }

    // Initialize WebGazer
    const webgazerInstance = await webgazer.setRegression('ridge')
      .setTracker('TFFacemesh')
      .begin();

    webgazerInstance.showVideoPreview(true)
      .showPredictionPoints(false)
      .applyKalmanFilter(true);

    // Setup UI event listeners
    this.setupEventListeners();
    
    // Initialize visualization
    visualizationManager.setupVisualization();
    
    // Set gaze listener
    webgazer.setGazeListener(this.gazeListener.bind(this));
    
    document.getElementById('statusText').innerText = 'listo para calibrar';
    this.initialized = true;
  }

  setupEventListeners() {
    // Level selection
    document.querySelectorAll('.level-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const level = parseInt(e.target.dataset.level);
        levelManager.selectLevel(level);
      });
    });

    // Control buttons
    document.getElementById('btnCalibrate').onclick = () => calibrationManager.startCalibration();
    document.getElementById('btnStart').onclick = () => this.startSession();
    document.getElementById('btnStop').onclick = () => this.stopSession();
    document.getElementById('btnExport').onclick = () => this.exportCSV();
  }

  async gazeListener(data, clock) {
    if (!data) return;

    const t = clock || performance.now();
    STATE.frameCount++;
    document.getElementById('frames').innerText = STATE.frameCount;

    // Get face mesh positions
    const fmPositions = await webgazer.getTracker().getPositions();
    if (!fmPositions) return;

    const whr = webgazer.getVideoPreviewToCameraResolutionRatio();
    
    // Update visualization
    visualizationManager.updateGazeVisualization(data, fmPositions, whr);

    // Calculate metrics
    const gaze = { x: data.x, y: data.y, t: t };
    const headAngle = metricsCalculator.calculateHeadAngle(fmPositions, whr);
    const { headVel, eyeVel } = metricsCalculator.calculateVelocities(gaze, headAngle, t);
    
    // Update latency estimates
    metricsCalculator.updateLatencyEstimates(headVel, eyeVel, t);
    
    // Update saccade count
    metricsCalculator.updateSaccadeCount(eyeVel);
    
    // Calculate fixation stability
    const rmsVal = metricsCalculator.calculateFixationStability(gaze, t);
    
    // Calculate VOR gain
    const vorGain = metricsCalculator.calculateVORGain(eyeVel, headVel);
    
    // Update UI
    metricsCalculator.updateUI(headVel, eyeVel, vorGain, rmsVal);
    
    // Record data
    metricsCalculator.recordData(t, gaze, headAngle, headVel, eyeVel, vorGain);
    
    // Update state
    STATE.lastHeadAngle = headAngle;
    STATE.lastGaze = gaze;
    STATE.lastTimestamp = t;
  }

  startSession() {
    if (!levelManager.startLevel()) {
      return;
    }

    STATE.sessionActive = true;
    STATE.recorded = [];
    STATE.frameCount = 0;
    STATE.saccCount = 0;
    STATE.lastHeadAngle = null;
    STATE.lastGaze = null;
    STATE.lastTimestamp = null;
    STATE.latencyEstimates = [];
    STATE.fixPositions = [];

    document.getElementById('btnStop').disabled = false;
    document.getElementById('btnStart').disabled = true;
    document.getElementById('statusText').innerText = 'sesión activa';
    document.getElementById('saccCount').innerText = '0';
  }

  stopSession() {
    STATE.sessionActive = false;
    levelManager.stopLevel();
    
    document.getElementById('btnStop').disabled = true;
    document.getElementById('btnStart').disabled = false;
    document.getElementById('statusText').innerText = 'sesión detenida';
    document.getElementById('btnExport').disabled = STATE.recorded.length === 0;
  }

  exportCSV() {
    if (!STATE.recorded || STATE.recorded.length === 0) {
      return alert('No hay datos para exportar.');
    }

    const header = Object.keys(STATE.recorded[0]);
    const csv = [header.join(',')].concat(
      STATE.recorded.map(r => 
        header.map(h => JSON.stringify(r[h] === undefined ? '' : r[h])).join(',')
      )
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.getElementById('downloadLink');
    
    link.href = url;
    link.download = 'datos_vor_' + (new Date()).toISOString().replace(/[:.]/g, '_') + '.csv';
    link.style.display = 'inline-block';
    link.click();
  }


}

// Initialize application when page loads
window.onload = async function() {
  // Show startup checks first
  await startupManager.initialize();
  
  // Then initialize the main app
  const app = new VORApp();
  await app.initialize();
};

window.onbeforeunload = function() {
  if (!window.saveDataAcrossSessions) {
    localforage.clear();
  }
};