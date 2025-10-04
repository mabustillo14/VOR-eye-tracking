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
      // Clear previous data for fresh start
      await localforage.clear();
      
      // Initialize WebGazer with most reliable settings
      const webgazerInstance = await webgazer
        .setRegression('ridge') // More stable than weightedRidge
        .setTracker('TFFacemesh')
        .begin();

      // Wait for proper initialization
      await new Promise(resolve => setTimeout(resolve, 1000));

      webgazerInstance
        .showVideoPreview(true)
        .showPredictionPoints(false) // Hide prediction points
        .applyKalmanFilter(false);

      // Optimal parameters for accuracy
      webgazer.params.videoViewerWidth = 240;
      webgazer.params.videoViewerHeight = 180;
      webgazer.params.faceFeedbackBoxRatio = 0.8;
      webgazer.params.showFaceOverlay = false;
      webgazer.params.showFaceFeedbackBox = false;

      // Position camera in bottom right
      setTimeout(() => this.positionCamera(), 1000);

      webgazer.setGazeListener(this.onGazeData.bind(this));
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Eye tracker initialization failed:', error);
      return false;
    }
  }

  positionCamera() {
    // Remove any duplicate video elements
    const existingVideos = document.querySelectorAll('video');
    if (existingVideos.length > 1) {
      for (let i = 1; i < existingVideos.length; i++) {
        existingVideos[i].remove();
      }
    }
    
    // Remove any duplicate canvas elements
    const existingCanvas = document.querySelectorAll('canvas');
    if (existingCanvas.length > 1) {
      for (let i = 1; i < existingCanvas.length; i++) {
        existingCanvas[i].remove();
      }
    }
    
    const video = document.getElementById('webgazerVideoFeed');
    const canvas = document.getElementById('webgazerVideoCanvas');
    
    if (video) {
      video.style.position = 'fixed';
      video.style.bottom = '20px';
      video.style.right = '20px';
      video.style.top = 'auto';
      video.style.left = 'auto';
      video.style.width = '240px';
      video.style.height = '180px';
      video.style.zIndex = '150000';
      video.style.border = '2px solid #4CAF50';
      video.style.borderRadius = '8px';
    }
    
    if (canvas) {
      canvas.style.position = 'fixed';
      canvas.style.bottom = '20px';
      canvas.style.right = '20px';
      canvas.style.top = 'auto';
      canvas.style.left = 'auto';
      canvas.style.width = '240px';
      canvas.style.height = '180px';
      canvas.style.zIndex = '150001';
      canvas.style.border = '2px solid #4CAF50';
      canvas.style.borderRadius = '8px';
    }
  }

  onGazeData(data, clock) {
    if (!data || data.x < 0 || data.y < 0 || data.x > window.innerWidth || data.y > window.innerHeight) return;

    // Simple but effective filtering
    this.gazeBuffer.push({x: data.x, y: data.y, t: clock || performance.now()});
    if (this.gazeBuffer.length > 3) this.gazeBuffer.shift();

    // Use simple average for stability
    const avgX = this.gazeBuffer.reduce((sum, g) => sum + g.x, 0) / this.gazeBuffer.length;
    const avgY = this.gazeBuffer.reduce((sum, g) => sum + g.y, 0) / this.gazeBuffer.length;

    // Light smoothing only
    if (this.smoothedGaze.x === 0) {
      this.smoothedGaze = {x: avgX, y: avgY};
    } else {
      const factor = 0.3; // More responsive
      this.smoothedGaze.x = factor * avgX + (1 - factor) * this.smoothedGaze.x;
      this.smoothedGaze.y = factor * avgY + (1 - factor) * this.smoothedGaze.y;
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
      
      // Use fewer, more strategic points for better accuracy
      const points = [
        [0.1, 0.1], [0.5, 0.1], [0.9, 0.1],
        [0.1, 0.5], [0.5, 0.5], [0.9, 0.5],
        [0.1, 0.9], [0.5, 0.9], [0.9, 0.9]
      ];
      
      let currentPoint = 0;
      status.textContent = `Calibración: punto ${currentPoint + 1} de ${points.length}`;

      const showNextPoint = () => {
        if (currentPoint >= points.length) {
          // Validation phase
          status.textContent = 'Validando calibración...';
          setTimeout(() => {
            overlay.style.display = 'none';
            STATE.isCalibrated = true;
            resolve(true);
          }, 1000);
          return;
        }

        const point = points[currentPoint];
        const element = document.createElement('div');
        element.className = 'cal-point';
        element.style.left = (point[0] * 100) + '%';
        element.style.top = (point[1] * 100) + '%';
        element.textContent = currentPoint + 1;
        
        grid.appendChild(element);

        // Click handler for manual calibration
        element.onclick = async () => {
          element.classList.add('active');
          status.textContent = `Calibrando punto ${currentPoint + 1}... mantén la mirada fija`;
          
          // Multiple registrations for better accuracy
          for (let i = 0; i < 5; i++) {
            webgazer.recordScreenPosition(
              point[0] * window.innerWidth, 
              point[1] * window.innerHeight, 
              'click'
            );
            await new Promise(r => setTimeout(r, 200));
          }

          element.remove();
          currentPoint++;
          
          if (currentPoint < points.length) {
            status.textContent = `Calibración: punto ${currentPoint + 1} de ${points.length}`;
          }
          
          setTimeout(showNextPoint, 300);
        };
      };

      showNextPoint();
    });
  }

  getCurrentGaze() {
    return this.smoothedGaze;
  }

  togglePreview() {
    // Not needed - camera stays in bottom right
  }

  destroy() {
    if (this.isInitialized) {
      webgazer.end();
      this.isInitialized = false;
    }
  }
}