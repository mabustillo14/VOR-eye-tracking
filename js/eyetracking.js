// Eye tracking module with enhanced precision
class EyeTracker {
  constructor() {
    this.smoothedGaze = {x: 0, y: 0};
    this.gazeBuffer = [];
    this.isInitialized = false;
    this.calibrationData = [];
  }

  async initialize() {
    try {
      // Clear previous data
      if (!window.saveDataAcrossSessions) {
        await localforage.setItem('webgazerGlobalData', null);
        await localforage.setItem('webgazerGlobalSettings', null);
      }

      // Initialize WebGazer with optimal settings
      const webgazerInstance = await webgazer
        .setRegression('weightedRidge')
        .setTracker('TFFacemesh')
        .begin();

      webgazerInstance
        .showVideoPreview(true)
        .showPredictionPoints(false)
        .applyKalmanFilter(true);

      // Configure parameters for precision
      webgazer.params.videoViewerWidth = 320;
      webgazer.params.videoViewerHeight = 240;
      webgazer.params.faceFeedbackBoxRatio = 0.66;

      webgazer.setGazeListener(this.onGazeData.bind(this));
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Eye tracker initialization failed:', error);
      return false;
    }
  }

  onGazeData(data, clock) {
    if (!data) return;

    // Advanced filtering
    this.gazeBuffer.push({x: data.x, y: data.y, t: clock || performance.now()});
    if (this.gazeBuffer.length > 5) this.gazeBuffer.shift();

    // Median filter for outlier removal
    const recentGazes = this.gazeBuffer.slice(-3);
    const medianX = this.getMedian(recentGazes.map(g => g.x));
    const medianY = this.getMedian(recentGazes.map(g => g.y));

    // Exponential smoothing
    if (this.smoothedGaze.x === 0) {
      this.smoothedGaze = {x: medianX, y: medianY};
    } else {
      this.smoothedGaze.x = CONFIG.SMOOTHING_FACTOR * medianX + (1 - CONFIG.SMOOTHING_FACTOR) * this.smoothedGaze.x;
      this.smoothedGaze.y = CONFIG.SMOOTHING_FACTOR * medianY + (1 - CONFIG.SMOOTHING_FACTOR) * this.smoothedGaze.y;
    }

    // Update gaze indicator
    this.updateGazeIndicator();

    // Notify exercise system
    if (window.exerciseSystem) {
      window.exerciseSystem.onGazeUpdate(this.smoothedGaze);
    }
  }

  getMedian(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  updateGazeIndicator() {
    const indicator = document.getElementById('gazeIndicator');
    if (indicator) {
      indicator.style.left = this.smoothedGaze.x + 'px';
      indicator.style.top = this.smoothedGaze.y + 'px';
    }
  }

  async calibrate() {
    return new Promise((resolve) => {
      const overlay = document.getElementById('calibrationOverlay');
      const grid = document.getElementById('calibrationGrid');
      const status = document.getElementById('calibrationStatus');
      
      overlay.style.display = 'block';
      grid.innerHTML = '';
      
      let currentPoint = 0;
      const points = CONFIG.CALIBRATION.points;
      
      status.textContent = `Calibración: punto ${currentPoint + 1} de ${points.length}`;

      const showNextPoint = () => {
        if (currentPoint >= points.length) {
          overlay.style.display = 'none';
          STATE.isCalibrated = true;
          resolve(true);
          return;
        }

        const point = points[currentPoint];
        const element = document.createElement('div');
        element.className = 'cal-point';
        element.style.left = (point[0] * 100) + '%';
        element.style.top = (point[1] * 100) + '%';
        element.textContent = currentPoint + 1;
        
        grid.appendChild(element);

        setTimeout(async () => {
          element.classList.add('active');
          status.textContent = `Mira fijamente el punto ${currentPoint + 1}`;
          
          // Collect samples
          const samples = [];
          const startTime = performance.now();
          
          while (performance.now() - startTime < CONFIG.CALIBRATION.fixationTime) {
            const pred = await webgazer.getCurrentPrediction();
            if (pred) samples.push(pred);
            await new Promise(r => setTimeout(r, 50));
          }

          // Register calibration point
          if (samples.length >= CONFIG.CALIBRATION.minSamples) {
            for (let i = 0; i < 3; i++) {
              webgazer.recordScreenPosition(
                point[0] * window.innerWidth, 
                point[1] * window.innerHeight, 
                'click'
              );
            }
          }

          element.remove();
          currentPoint++;
          status.textContent = `Calibración: punto ${currentPoint + 1} de ${points.length}`;
          setTimeout(showNextPoint, 500);
        }, 1000);
      };

      showNextPoint();
    });
  }

  getCurrentGaze() {
    return this.smoothedGaze;
  }

  togglePreview() {
    const current = webgazer.params.showVideoPreview;
    webgazer.showVideoPreview(!current);
  }

  destroy() {
    if (this.isInitialized) {
      webgazer.end();
      this.isInitialized = false;
    }
  }
}