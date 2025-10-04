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

      // Configure like collision.html for better accuracy
      webgazerInstance
        .showVideoPreview(true)
        .showPredictionPoints(true)
        .showFaceOverlay(true)
        .showFaceFeedbackBox(true)
        .applyKalmanFilter(true);
      
      // collision.html parameters
      webgazerInstance.params.imgWidth = 320;
      webgazerInstance.params.imgHeight = 240;
      webgazerInstance.params.faceFeedbackBoxRatio = 0.66;
      webgazerInstance.params.videoViewerWidth = 200;
      webgazerInstance.params.videoViewerHeight = 150;
      
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

    // Get face mesh positions - using collision.html approach
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
            // Fix mirroring issue - collision.html style calculation
            const previewWidth = videoRect.width;
            const leftX = videoRect.left + (previewWidth - leftEye[0] * whr[0]);
            const leftY = videoRect.top + (leftEye[1] * whr[1]);
            const rightX = videoRect.left + (previewWidth - rightEye[0] * whr[0]);
            const rightY = videoRect.top + (rightEye[1] * whr[1]);

            // Draw lines from eyes to gaze point
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
      
      // Reduced calibration points - 9 points like collision.html
      const points = [
        [10, 10], [50, 10], [90, 10],
        [10, 50], [50, 50], [90, 50],
        [10, 90], [50, 90], [90, 90]
      ];
      
      let currentPoint = 0;
      status.textContent = `Calibración: punto ${currentPoint + 1} de ${points.length}`;

      const showNextPoint = () => {
        if (currentPoint >= points.length) {
          overlay.style.display = 'none';
          STATE.isCalibrated = true;
          this.currentPrecision = 75; // Default precision
          resolve(true);
          return;
        }

        const point = points[currentPoint];
        const element = document.createElement('div');
        element.className = 'cal-point';
        element.style.left = point[0] + '%';
        element.style.top = point[1] + '%';
        element.textContent = currentPoint + 1;
        
        grid.appendChild(element);

        const calibratePoint = async () => {
          element.classList.add('active');
          status.textContent = `Calibrando punto ${currentPoint + 1}...`;
          
          const screenX = (point[0] / 100) * window.innerWidth;
          const screenY = (point[1] / 100) * window.innerHeight;
          
          // Record calibration data
          for (let i = 0; i < 20; i++) {
            webgazer.recordScreenPosition(screenX, screenY, 'click');
            await new Promise(r => setTimeout(r, 50));
          }
          
          element.remove();
          currentPoint++;
          
          if (currentPoint < points.length) {
            status.textContent = `Calibración: punto ${currentPoint + 1} de ${points.length}`;
          }
          
          setTimeout(showNextPoint, 200);
        };

        element.onclick = calibratePoint;
        setTimeout(calibratePoint, 1500);
      };

      showNextPoint();
    });
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
    // Position face overlay to match camera (below header)
    const faceOverlay = document.getElementById('webgazerFaceOverlay');
    const faceFeedback = document.getElementById('webgazerFaceFeedbackBox');
    
    if (faceOverlay) {
      faceOverlay.style.position = 'fixed';
      faceOverlay.style.top = '120px';
      faceOverlay.style.left = '20px';
      faceOverlay.style.width = '200px';
      faceOverlay.style.height = '150px';
      faceOverlay.style.zIndex = '150002';
    }
    
    if (faceFeedback) {
      faceFeedback.style.position = 'fixed';
      faceFeedback.style.top = '120px';
      faceFeedback.style.left = '20px';
      faceFeedback.style.width = '200px';
      faceFeedback.style.height = '150px';
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