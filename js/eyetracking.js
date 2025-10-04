// Working eye tracking system from commit d5df81c integrated with modern UI
class EyeTracker {
  constructor() {
    this.smoothedGaze = {x: 0, y: 0};
    this.isInitialized = false;
    this.isRunning = false;
    this.currentPrecision = null;
    
    // VOR tracking variables
    this.sessionActive = false;
    this.recorded = [];
    this.frameCount = 0;
    this.saccCount = 0;
    this.lastHeadAngle = null;
    this.lastGaze = null;
    this.lastTimestamp = null;
    this.latencyEstimates = [];
    this.fixPositions = [];
    
    // Collision system
    this.force = null;
    this.nodes = [];
    
    // Parameters
    this.SACCADE_VEL_THRESHOLD = 1500;
    this.SAMPLE_WINDOW_MS = 100;
  }

  async initialize() {
    try {
      console.log('Initializing improved WebGazer system...');
      
      // Clear previous data for fresh start
      if (!window.saveDataAcrossSessions) {
        await localforage.setItem('webgazerGlobalData', null);
        await localforage.setItem('webgazerGlobalSettings', null);
      }

      // Initialize WebGazer with improved configuration based on documentation
      const webgazerInstance = await webgazer
        .setRegression('ridge') // Ridge regression for better accuracy
        .setTracker('TFFacemesh') // TensorFlow face mesh tracker
        .begin();

      // Configure for improved accuracy based on WebGazer best practices
      webgazerInstance
        .showVideoPreview(true)
        .showPredictionPoints(true) // Show prediction points for debugging
        .showFaceOverlay(true) // Enable face mesh overlay
        .showFaceFeedbackBox(true) // Show face feedback
        .applyKalmanFilter(true); // Smooth predictions
      
      // Optimal parameters for accuracy
      webgazerInstance.params.imgWidth = 320;
      webgazerInstance.params.imgHeight = 240;
      webgazerInstance.params.faceFeedbackBoxRatio = 0.66;
      
      // Additional accuracy improvements
      webgazerInstance.params.moveTickSize = 50;
      webgazerInstance.params.videoViewerWidth = 240;
      webgazerInstance.params.videoViewerHeight = 180;
      
      // Setup collision system without particles
      this.setupCollisionSystem();

      webgazer.setGazeListener(this.collisionEyeListener.bind(this));
      
      // Position face overlay correctly
      setTimeout(() => this.positionFaceOverlay(), 1000);
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Eye tracker initialization failed:', error);
      return false;
    }
  }

  setupCollisionSystem() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create SVG for gaze tracking lines only (no particles)
    const svg = d3.select('body').append('svg')
      .attr('id', 'collisionSVG')
      .attr('width', width)
      .attr('height', height)
      .style('position', 'absolute')
      .style('top', '0px')
      .style('left', '0px')
      .style('z-index', '100000')
      .style('pointer-events', 'none');

    // Add gaze tracking lines
    svg.append('line')
      .attr('id', 'eyeline1')
      .attr('stroke-width', 2)
      .attr('stroke', 'red');

    svg.append('line')
      .attr('id', 'eyeline2')
      .attr('stroke-width', 2)
      .attr('stroke', 'red');

    // Add prediction square
    svg.append('rect')
      .attr('id', 'predictionSquare')
      .attr('width', 6)
      .attr('height', 6)
      .attr('fill', 'red');
  }

  async collisionEyeListener(data, clock) {
    if (!data) return;

    // Update prediction square
    d3.select('#predictionSquare')
      .attr('x', data.x - 3)
      .attr('y', data.y - 3);

    // Get face mesh positions for eye lines with corrected alignment
    try {
      const fmPositions = await webgazer.getTracker().getPositions();
      if (fmPositions) {
        const videoElement = document.getElementById('webgazerVideoFeed');
        if (videoElement) {
          const videoRect = videoElement.getBoundingClientRect();
          const whr = webgazer.getVideoPreviewToCameraResolutionRatio();
          
          const leftEye = fmPositions[145];
          const rightEye = fmPositions[374];

          if (leftEye && rightEye) {
            // Calculate eye positions relative to screen coordinates with corrected alignment
            const leftX = videoRect.left + (leftEye[0] * whr[0]);
            const leftY = videoRect.top + (leftEye[1] * whr[1]);
            const rightX = videoRect.left + (rightEye[0] * whr[0]);
            const rightY = videoRect.top + (rightEye[1] * whr[1]);

            // Draw lines from eyes to gaze point (corrected direction)
            d3.select('#eyeline1')
              .attr('x1', leftX)
              .attr('y1', leftY)
              .attr('x2', data.x)
              .attr('y2', data.y);

            d3.select('#eyeline2')
              .attr('x1', rightX)
              .attr('y1', rightY)
              .attr('x2', data.x)
              .attr('y2', data.y);
          }
        }
      }
    } catch (e) {
      // Ignore errors in eye line calculation
    }

    // Process gaze data for modern UI
    this.processGazeData(data, clock);
  }

  processGazeData(data, clock) {
    // Update gaze indicator for modern UI
    this.smoothedGaze = { x: data.x, y: data.y };
    this.updateGazeIndicator();

    // VOR metrics calculation (from working version)
    const t = clock || performance.now();
    this.frameCount++;
    
    const gaze = { x: data.x, y: data.y, t: t };

    // Head orientation calculation
    this.calculateVORMetrics(gaze, t);

    // Notify exercise system
    if (window.exerciseSystem) {
      window.exerciseSystem.onGazeUpdate(this.smoothedGaze);
    }
  }

  async calculateVORMetrics(gaze, t) {
    try {
      const fmPositions = await webgazer.getTracker().getPositions();
      if (!fmPositions) return;

      const whr = webgazer.getVideoPreviewToCameraResolutionRatio();
      const previewWidth = webgazer.params && webgazer.params.videoViewerWidth ? webgazer.params.videoViewerWidth : 320;

      // Head orientation calculation
      let headAngle = null;
      const nosePt = fmPositions[1] || fmPositions[4];
      const left = fmPositions[33] || fmPositions[145];
      const right = fmPositions[263] || fmPositions[374];
      
      if (nosePt && left && right) {
        const nx = previewWidth - nosePt[0] * whr[0];
        const ny = nosePt[1] * whr[1];
        const lx = previewWidth - left[0] * whr[0];
        const rx = previewWidth - right[0] * whr[0];
        const midEyesX = (lx + rx) / 2;
        const midEyesY = ((left[1] + right[1]) / 2) * whr[1];
        const vx = nx - midEyesX;
        const vy = ny - midEyesY;
        headAngle = Math.atan2(vx, vy) * 180 / Math.PI;
      }

      // Velocity calculations
      let headVel = 0;
      let eyeVel = 0;
      if (this.lastTimestamp !== null) {
        const dt = (t - this.lastTimestamp) / 1000.0;
        if (headAngle !== null && this.lastHeadAngle !== null && dt > 0) {
          headVel = (headAngle - this.lastHeadAngle) / dt;
        }
        if (this.lastGaze !== null) {
          const dx = (gaze.x - this.lastGaze.x);
          const dy = (gaze.y - this.lastGaze.y);
          eyeVel = Math.sqrt(dx * dx + dy * dy) / dt;
        }
      }

      // Latency estimation
      if (Math.abs(headVel) > 50 && this.lastTimestamp !== null) {
        this.latencyEstimates.push({ tHead: t, headVel: headVel, responded: false });
      }
      
      for (let ev of this.latencyEstimates) {
        if (!ev.responded && Math.abs(eyeVel) > 200) {
          ev.responded = true;
          ev.tRespond = t;
          ev.latencyMs = ev.tRespond - ev.tHead;
        }
      }

      // Saccade counting
      if (eyeVel > this.SACCADE_VEL_THRESHOLD) {
        this.saccCount++;
      }

      // Fixation stability
      this.fixPositions.push({ x: gaze.x, y: gaze.y, t: t });
      const cutoff = t - this.SAMPLE_WINDOW_MS;
      this.fixPositions = this.fixPositions.filter(p => p.t >= cutoff);
      
      const xs = this.fixPositions.map(p => p.x - this.mean(this.fixPositions.map(q => q.x)));
      const ys = this.fixPositions.map(p => p.y - this.mean(this.fixPositions.map(q => q.y)));
      const rmsVal = this.rms(xs.concat(ys));

      // VOR gain
      let vorGain = null;
      if (Math.abs(headVel) > 5) {
        vorGain = Math.abs(eyeVel) / Math.abs(headVel);
      }

      // Update modern UI metrics
      this.updateModernMetrics(headVel, eyeVel, vorGain, rmsVal);

      // Store data if session active
      if (this.sessionActive) {
        this.recorded.push({
          t: t,
          gazeX: gaze.x,
          gazeY: gaze.y,
          headAngle: headAngle,
          headVel: headVel,
          eyeVel: eyeVel,
          vorGain: vorGain
        });
      }

      // Update references
      this.lastHeadAngle = headAngle;
      this.lastGaze = gaze;
      this.lastTimestamp = t;
    } catch (e) {
      // Ignore calculation errors
    }
  }

  updateModernMetrics(headVel, eyeVel, vorGain, rmsVal) {
    // Map to modern UI elements
    const fixationStability = rmsVal ? Math.max(0, 100 - (rmsVal / 50) * 100) : 0;
    const vorAccuracy = vorGain ? Math.max(0, 100 - Math.abs(vorGain - 1) * 100) : 0;
    
    document.getElementById('fixationStability').textContent = fixationStability.toFixed(1) + '%';
    document.getElementById('vorAccuracy').textContent = vorAccuracy.toFixed(1) + '%';
  }

  updateGazeIndicator() {
    const indicator = document.getElementById('gazeIndicator');
    if (indicator) {
      indicator.style.left = this.smoothedGaze.x + 'px';
      indicator.style.top = this.smoothedGaze.y + 'px';
      indicator.style.display = 'block';
      indicator.style.opacity = '1';
    }
  }

  mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1);
  }

  rms(arr) {
    return Math.sqrt(this.mean(arr.map(v => v * v)));
  }

  async calibrate() {
    return new Promise((resolve) => {
      const overlay = document.getElementById('calibrationOverlay');
      const grid = document.getElementById('calibrationGrid');
      const status = document.getElementById('calibrationStatus');
      const precisionResults = document.getElementById('precisionResults');
      
      overlay.style.display = 'block';
      grid.innerHTML = '';
      precisionResults.style.display = 'none';
      
      // WebGazer calibration.html style points for optimal accuracy
      const points = [
        [10, 10], [10, 50], [10, 90],
        [20, 10], [20, 50], [20, 90],
        [30, 10], [30, 50], [30, 90],
        [40, 10], [40, 50], [40, 90],
        [50, 10], [50, 50], [50, 90],
        [60, 10], [60, 50], [60, 90],
        [70, 10], [70, 50], [70, 90],
        [80, 10], [80, 50], [80, 90],
        [90, 10], [90, 50], [90, 90]
      ];
      
      let currentPoint = 0;
      let calibrationData = [];
      status.textContent = `Calibración: punto ${currentPoint + 1} de ${points.length}`;

      const showNextPoint = () => {
        if (currentPoint >= points.length) {
          // Run precision test like WebGazer calibration.html
          this.runPrecisionTest(calibrationData).then((results) => {
            this.showPrecisionResults(results, resolve);
          });
          return;
        }

        const point = points[currentPoint];
        const element = document.createElement('div');
        element.className = 'cal-point';
        element.style.left = point[0] + '%';
        element.style.top = point[1] + '%';
        element.textContent = currentPoint + 1;
        
        grid.appendChild(element);

        // Auto-advance after 2 seconds or click
        let clicked = false;
        const calibratePoint = async () => {
          if (clicked) return;
          clicked = true;
          
          element.classList.add('active');
          status.textContent = `Calibrando punto ${currentPoint + 1}... mantén la mirada fija`;
          
          const screenX = (point[0] / 100) * window.innerWidth;
          const screenY = (point[1] / 100) * window.innerHeight;
          
          // Collect samples for 1 second
          const samples = [];
          const startTime = performance.now();
          while (performance.now() - startTime < 1000) {
            webgazer.recordScreenPosition(screenX, screenY, 'click');
            const pred = await webgazer.getCurrentPrediction();
            if (pred) samples.push(pred);
            await new Promise(r => setTimeout(r, 50));
          }
          
          calibrationData.push({ point: [screenX, screenY], samples });
          element.remove();
          currentPoint++;
          
          if (currentPoint < points.length) {
            status.textContent = `Calibración: punto ${currentPoint + 1} de ${points.length}`;
          }
          
          setTimeout(showNextPoint, 200);
        };

        element.onclick = calibratePoint;
        setTimeout(calibratePoint, 2000); // Auto-advance
      };

      showNextPoint();
    });
  }

  async runPrecisionTest(calibrationData) {
    const status = document.getElementById('calibrationStatus');
    status.textContent = 'Ejecutando prueba de precisión...';
    
    // Test points similar to WebGazer calibration.html
    const testPoints = [
      [25, 25], [75, 25], [25, 75], [75, 75], [50, 50]
    ];
    
    const results = [];
    
    for (let i = 0; i < testPoints.length; i++) {
      const point = testPoints[i];
      const screenX = (point[0] / 100) * window.innerWidth;
      const screenY = (point[1] / 100) * window.innerHeight;
      
      // Show test point
      const testElement = document.createElement('div');
      testElement.className = 'precision-test-point';
      testElement.style.left = point[0] + '%';
      testElement.style.top = point[1] + '%';
      testElement.textContent = i + 1;
      document.getElementById('calibrationGrid').appendChild(testElement);
      
      status.textContent = `Prueba de precisión: punto ${i + 1} de ${testPoints.length}`;
      
      // Collect predictions for 1 second
      const predictions = [];
      const startTime = performance.now();
      while (performance.now() - startTime < 1000) {
        const pred = await webgazer.getCurrentPrediction();
        if (pred) predictions.push(pred);
        await new Promise(r => setTimeout(r, 50));
      }
      
      // Calculate accuracy for this point
      if (predictions.length > 0) {
        const errors = predictions.map(pred => 
          Math.sqrt(Math.pow(pred.x - screenX, 2) + Math.pow(pred.y - screenY, 2))
        );
        const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
        results.push({ point: [screenX, screenY], error: avgError, predictions });
      }
      
      testElement.remove();
    }
    
    return results;
  }
  
  showPrecisionResults(results, resolve) {
    const status = document.getElementById('calibrationStatus');
    const precisionResults = document.getElementById('precisionResults');
    const avgPrecision = document.getElementById('avgPrecision');
    
    if (results.length === 0) {
      status.textContent = 'Error en la prueba de precisión';
      resolve(false);
      return;
    }
    
    const totalError = results.reduce((sum, r) => sum + r.error, 0) / results.length;
    const precisionPx = Math.round(totalError);
    
    status.textContent = 'Calibración completada';
    avgPrecision.textContent = `${precisionPx} px`;
    precisionResults.style.display = 'block';
    
    // Setup result buttons
    document.getElementById('btnAcceptCalibration').onclick = () => {
      document.getElementById('calibrationOverlay').style.display = 'none';
      STATE.isCalibrated = true;
      this.currentPrecision = precisionPx;
      resolve(true);
    };
    
    document.getElementById('btnRecalibrate').onclick = () => {
      this.calibrate().then(resolve);
    };
  }

  startSession() {
    this.sessionActive = true;
    this.recorded = [];
    this.frameCount = 0;
    this.saccCount = 0;
    
    // Ensure face overlay is positioned correctly when session starts
    setTimeout(() => this.positionFaceOverlay(), 500);
  }

  stopSession() {
    this.sessionActive = false;
  }

  exportData() {
    if (!this.recorded || this.recorded.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    
    const header = Object.keys(this.recorded[0]);
    const csv = [header.join(',')].concat(
      this.recorded.map(r => header.map(h => JSON.stringify(r[h] === undefined ? '' : r[h])).join(','))
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vor_session_' + (new Date()).toISOString().replace(/[:.]/g, '_') + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  getCurrentGaze() {
    return this.smoothedGaze;
  }

  togglePreview() {
    const current = webgazer.params.showVideoPreview;
    webgazer.showVideoPreview(!current);
  }

  positionFaceOverlay() {
    // Ensure face overlay is positioned correctly with camera (moved to top-left)
    const faceOverlay = document.getElementById('webgazerFaceOverlay');
    const faceFeedback = document.getElementById('webgazerFaceFeedbackBox');
    
    if (faceOverlay) {
      faceOverlay.style.position = 'fixed';
      faceOverlay.style.top = '80px';
      faceOverlay.style.left = '20px';
      faceOverlay.style.width = '240px';
      faceOverlay.style.height = '180px';
      faceOverlay.style.zIndex = '150002';
    }
    
    if (faceFeedback) {
      faceFeedback.style.position = 'fixed';
      faceFeedback.style.top = '80px';
      faceFeedback.style.left = '20px';
      faceFeedback.style.width = '240px';
      faceFeedback.style.height = '180px';
      faceFeedback.style.zIndex = '150002';
    }
  }

  destroy() {
    this.isRunning = false;
    if (this.isInitialized) {
      webgazer.end();
      this.isInitialized = false;
    }
    
    d3.select('#collisionSVG').remove();
  }
}