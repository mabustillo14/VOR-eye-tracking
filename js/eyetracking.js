// Professional eye tracking system with WebGazer-level calibration
class EyeTracker {
  constructor() {
    this.smoothedGaze = {x: 0, y: 0};
    this.isInitialized = false;
    this.model = null;
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.calibrationData = [];
    this.isRunning = false;
    this.precisionData = [];
    this.currentPrecision = null;
  }

  async initialize() {
    try {
      console.log('Initializing professional eye tracking system...');
      
      // Create video element
      this.video = document.createElement('video');
      this.video.id = 'eyeTrackingVideo';
      this.video.width = 240;
      this.video.height = 180;
      this.video.autoplay = true;
      this.video.muted = true;
      this.video.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 240px;
        height: 180px;
        z-index: 150000;
        border: 2px solid #4CAF50;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      document.body.appendChild(this.video);

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        }
      });
      this.video.srcObject = stream;

      // Load MediaPipe FaceMesh model
      await tf.ready();
      this.model = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'tfjs',
          maxFaces: 1,
          refineLandmarks: true
        }
      );

      console.log('Professional eye tracking model loaded');
      
      this.isInitialized = true;
      this.startTracking();
      return true;
    } catch (error) {
      console.error('Eye tracker initialization failed:', error);
      return false;
    }
  }

  startTracking() {
    if (!this.isInitialized || this.isRunning) return;
    
    this.isRunning = true;
    
    // Initialize gaze indicator
    const indicator = document.getElementById('gazeIndicator');
    if (indicator) {
      indicator.style.display = 'block';
      indicator.style.left = (window.innerWidth / 2) + 'px';
      indicator.style.top = (window.innerHeight / 2) + 'px';
    }
    
    this.trackLoop();
  }

  async trackLoop() {
    if (!this.isRunning) return;

    try {
      const predictions = await this.model.estimateFaces(this.video, {
        flipHorizontal: false
      });

      if (predictions.length > 0) {
        const face = predictions[0];
        const gaze = this.calculateGazeFromLandmarks(face);
        
        if (gaze) {
          this.processGazeData(gaze);
        }
      }
    } catch (error) {
      console.error('Tracking error:', error);
    }

    requestAnimationFrame(() => this.trackLoop());
  }

  calculateGazeFromLandmarks(face) {
    try {
      const keypoints = face.keypoints;
      
      // Eye landmarks
      const leftEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
      const rightEyeIndices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
      
      const leftEyeCenter = this.getEyeCenter(keypoints, leftEyeIndices);
      const rightEyeCenter = this.getEyeCenter(keypoints, rightEyeIndices);
      
      const gazeVector = this.calculateGazeVector(leftEyeCenter, rightEyeCenter, keypoints);

      // Apply calibration transformation
      if (this.calibrationData.length >= 9) {
        return this.applyProfessionalCalibration(gazeVector);
      }

      // Basic mapping
      return {
        x: Math.max(0, Math.min(window.innerWidth, window.innerWidth * (0.5 + gazeVector.x * 1.2))),
        y: Math.max(0, Math.min(window.innerHeight, window.innerHeight * (0.5 + gazeVector.y * 1.2)))
      };
    } catch (error) {
      return null;
    }
  }

  getEyeCenter(keypoints, indices) {
    let x = 0, y = 0;
    for (const idx of indices) {
      if (keypoints[idx]) {
        x += keypoints[idx].x;
        y += keypoints[idx].y;
      }
    }
    return { x: x / indices.length, y: y / indices.length };
  }

  calculateGazeVector(leftEye, rightEye, keypoints) {
    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    };

    const noseTip = keypoints[1];
    const leftCheek = keypoints[234];
    const rightCheek = keypoints[454];
    const forehead = keypoints[9];
    const chin = keypoints[175];

    if (!noseTip || !leftCheek || !rightCheek || !forehead || !chin) {
      return { x: 0, y: 0 };
    }

    const faceCenter = {
      x: (leftCheek.x + rightCheek.x) / 2,
      y: (forehead.y + chin.y) / 2
    };

    const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
    const faceHeight = Math.abs(chin.y - forehead.y);

    return {
      x: (eyeCenter.x - faceCenter.x) / (faceWidth / 3),
      y: (eyeCenter.y - faceCenter.y) / (faceHeight / 3)
    };
  }

  applyProfessionalCalibration(gazeVector) {
    // Use bilinear interpolation for accurate mapping
    let closestPoints = this.calibrationData
      .map(point => ({
        ...point,
        distance: Math.sqrt(
          Math.pow(gazeVector.x - point.gazeVector.x, 2) +
          Math.pow(gazeVector.y - point.gazeVector.y, 2)
        )
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);

    if (closestPoints.length === 0) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // Weighted average based on inverse distance
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (const point of closestPoints) {
      const weight = point.distance > 0 ? 1 / (point.distance + 0.001) : 1000;
      totalWeight += weight;
      weightedX += point.screenPoint.x * weight;
      weightedY += point.screenPoint.y * weight;
    }

    return {
      x: Math.max(0, Math.min(window.innerWidth, weightedX / totalWeight)),
      y: Math.max(0, Math.min(window.innerHeight, weightedY / totalWeight))
    };
  }

  processGazeData(gaze) {
    if (this.smoothedGaze.x === 0 && this.smoothedGaze.y === 0) {
      this.smoothedGaze = { x: gaze.x, y: gaze.y };
    } else {
      const distance = Math.sqrt(
        Math.pow(gaze.x - this.smoothedGaze.x, 2) + 
        Math.pow(gaze.y - this.smoothedGaze.y, 2)
      );
      
      const factor = distance > 50 ? 0.6 : 0.2;
      
      this.smoothedGaze.x = factor * gaze.x + (1 - factor) * this.smoothedGaze.x;
      this.smoothedGaze.y = factor * gaze.y + (1 - factor) * this.smoothedGaze.y;
    }

    this.updateGazeIndicator();

    if (window.exerciseSystem) {
      window.exerciseSystem.onGazeUpdate(this.smoothedGaze);
    }
  }

  updateGazeIndicator() {
    const indicator = document.getElementById('gazeIndicator');
    if (indicator && this.smoothedGaze.x > 0 && this.smoothedGaze.y > 0) {
      indicator.style.left = this.smoothedGaze.x + 'px';
      indicator.style.top = this.smoothedGaze.y + 'px';
      indicator.style.display = 'block';
      indicator.style.opacity = '1';
    }
  }

  async calibrate() {
    return new Promise((resolve) => {
      const overlay = document.getElementById('calibrationOverlay');
      const grid = document.getElementById('calibrationGrid');
      const status = document.getElementById('calibrationStatus');
      const title = document.getElementById('calibrationTitle');
      const instructions = document.getElementById('calibrationInstructions');
      
      overlay.style.display = 'block';
      grid.innerHTML = '';
      this.calibrationData = [];
      
      title.textContent = 'Calibración Profesional';
      instructions.textContent = 'Haz clic en cada punto azul y mira fijamente durante 2 segundos.';
      
      const points = [
        [0.1, 0.1], [0.5, 0.1], [0.9, 0.1],
        [0.1, 0.5], [0.5, 0.5], [0.9, 0.5],
        [0.1, 0.9], [0.5, 0.9], [0.9, 0.9]
      ];
      
      let currentPoint = 0;
      status.textContent = `Calibración: punto ${currentPoint + 1} de ${points.length}`;

      const showNextPoint = () => {
        if (currentPoint >= points.length) {
          this.startPrecisionTest(resolve);
          return;
        }

        const point = points[currentPoint];
        const element = document.createElement('div');
        element.className = 'cal-point';
        element.style.left = (point[0] * 100) + '%';
        element.style.top = (point[1] * 100) + '%';
        element.textContent = currentPoint + 1;
        
        grid.appendChild(element);

        element.onclick = async () => {
          element.classList.add('active');
          status.textContent = `Calibrando punto ${currentPoint + 1}... mantén la mirada fija`;
          
          // Collect samples for 2 seconds
          const samples = [];
          const startTime = performance.now();
          
          while (performance.now() - startTime < 2000) {
            if (this.smoothedGaze.x > 0) {
              samples.push({
                x: this.smoothedGaze.x,
                y: this.smoothedGaze.y
              });
            }
            await new Promise(r => setTimeout(r, 50));
          }

          if (samples.length > 10) {
            // Remove outliers and calculate average
            const sortedX = samples.map(s => s.x).sort((a,b) => a-b);
            const sortedY = samples.map(s => s.y).sort((a,b) => a-b);
            const trim = Math.floor(samples.length * 0.1);
            const avgX = sortedX.slice(trim, -trim).reduce((a,b) => a+b, 0) / (sortedX.length - 2*trim);
            const avgY = sortedY.slice(trim, -trim).reduce((a,b) => a+b, 0) / (sortedY.length - 2*trim);

            this.calibrationData.push({
              screenPoint: {
                x: point[0] * window.innerWidth,
                y: point[1] * window.innerHeight
              },
              gazeVector: {
                x: (avgX / window.innerWidth - 0.5) * 2,
                y: (avgY / window.innerHeight - 0.5) * 2
              }
            });
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

  async startPrecisionTest(resolve) {
    const grid = document.getElementById('calibrationGrid');
    const status = document.getElementById('calibrationStatus');
    const title = document.getElementById('calibrationTitle');
    const instructions = document.getElementById('calibrationInstructions');
    
    title.textContent = 'Prueba de Precisión';
    instructions.textContent = 'Mira cada punto naranja. El sistema medirá la precisión automáticamente.';
    status.textContent = 'Midiendo precisión del modelo entrenado...';
    
    grid.innerHTML = '';
    this.precisionData = [];
    
    // Test points (different from calibration points)
    const testPoints = [
      [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8], [0.5, 0.5]
    ];
    
    for (let i = 0; i < testPoints.length; i++) {
      const point = testPoints[i];
      const element = document.createElement('div');
      element.className = 'precision-test-point';
      element.style.left = (point[0] * 100) + '%';
      element.style.top = (point[1] * 100) + '%';
      element.textContent = i + 1;
      
      grid.appendChild(element);
      
      status.textContent = `Midiendo precisión: punto ${i + 1} de ${testPoints.length}`;
      
      // Collect gaze data for 3 seconds
      const samples = [];
      const startTime = performance.now();
      
      while (performance.now() - startTime < 3000) {
        if (this.smoothedGaze.x > 0) {
          samples.push({
            x: this.smoothedGaze.x,
            y: this.smoothedGaze.y
          });
        }
        await new Promise(r => setTimeout(r, 50));
      }
      
      if (samples.length > 20) {
        const targetX = point[0] * window.innerWidth;
        const targetY = point[1] * window.innerHeight;
        
        // Calculate precision (average distance from target)
        const distances = samples.map(sample => 
          Math.sqrt(Math.pow(sample.x - targetX, 2) + Math.pow(sample.y - targetY, 2))
        );
        
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        this.precisionData.push(avgDistance);
      }
      
      element.remove();
      await new Promise(r => setTimeout(r, 500));
    }
    
    this.showPrecisionResults(resolve);
  }

  showPrecisionResults(resolve) {
    const status = document.getElementById('calibrationStatus');
    const resultsDiv = document.getElementById('precisionResults');
    const avgPrecisionSpan = document.getElementById('avgPrecision');
    
    // Calculate average precision
    const avgPrecision = this.precisionData.reduce((a, b) => a + b, 0) / this.precisionData.length;
    this.currentPrecision = avgPrecision;
    
    // Show results
    status.style.display = 'none';
    resultsDiv.style.display = 'block';
    avgPrecisionSpan.textContent = Math.round(avgPrecision) + ' px';
    
    // Color code precision
    if (avgPrecision < 50) {
      avgPrecisionSpan.style.color = '#4CAF50'; // Green - Excellent
    } else if (avgPrecision < 100) {
      avgPrecisionSpan.style.color = '#FF9800'; // Orange - Good
    } else {
      avgPrecisionSpan.style.color = '#f44336'; // Red - Poor
    }
    
    // Setup buttons
    document.getElementById('btnAcceptCalibration').onclick = () => {
      this.acceptCalibration(resolve);
    };
    
    document.getElementById('btnRecalibrate').onclick = () => {
      this.recalibrate(resolve);
    };
  }

  acceptCalibration(resolve) {
    const overlay = document.getElementById('calibrationOverlay');
    overlay.style.display = 'none';
    
    // Update UI status
    document.getElementById('calibrationState').textContent = 'Calibrado';
    document.getElementById('currentPrecision').textContent = Math.round(this.currentPrecision) + ' px';
    
    STATE.isCalibrated = true;
    resolve(true);
  }

  recalibrate(resolve) {
    // Reset and start over
    this.calibrationData = [];
    this.precisionData = [];
    this.currentPrecision = null;
    
    document.getElementById('precisionResults').style.display = 'none';
    document.getElementById('calibrationStatus').style.display = 'block';
    
    setTimeout(() => this.calibrate().then(resolve), 500);
  }

  getCurrentGaze() {
    return this.smoothedGaze;
  }

  togglePreview() {
    // Camera stays visible
  }

  destroy() {
    this.isRunning = false;
    if (this.video && this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    if (this.video && this.video.parentNode) {
      this.video.parentNode.removeChild(this.video);
    }
    this.isInitialized = false;
  }
}