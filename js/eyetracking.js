// Enhanced AI-based eye tracking using TensorFlow.js and MediaPipe
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
  }

  async initialize() {
    try {
      console.log('Initializing AI-based eye tracking...');
      
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

      // Create canvas for processing
      this.canvas = document.createElement('canvas');
      this.canvas.width = 240;
      this.canvas.height = 180;
      this.ctx = this.canvas.getContext('2d');

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
      this.model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
        { maxFaces: 1 }
      );

      console.log('AI model loaded successfully');
      
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
    this.trackLoop();
  }

  async trackLoop() {
    if (!this.isRunning) return;

    try {
      // Get predictions from the model
      const predictions = await this.model.estimateFaces({
        input: this.video,
        returnTensors: false,
        flipHorizontal: false,
        predictIrises: true
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
      const keypoints = face.scaledMesh;
      
      // Eye landmarks (MediaPipe indices)
      const leftEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
      const rightEyeIndices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
      
      // Get eye centers
      const leftEyeCenter = this.getEyeCenter(keypoints, leftEyeIndices);
      const rightEyeCenter = this.getEyeCenter(keypoints, rightEyeIndices);
      
      // Get iris positions if available
      let leftIris = null, rightIris = null;
      if (face.annotations && face.annotations.leftEyeIris && face.annotations.rightEyeIris) {
        leftIris = this.getCenter(face.annotations.leftEyeIris);
        rightIris = this.getCenter(face.annotations.rightEyeIris);
      }

      // Calculate gaze direction
      const gazeVector = this.calculateGazeVector(
        leftEyeCenter, rightEyeCenter, 
        leftIris, rightIris,
        keypoints
      );

      // Apply calibration if available
      if (this.calibrationData.length > 0) {
        return this.applyCalibration(gazeVector);
      }

      // Basic mapping to screen coordinates
      return {
        x: window.innerWidth * (0.5 + gazeVector.x * 0.8),
        y: window.innerHeight * (0.5 + gazeVector.y * 0.8)
      };
    } catch (error) {
      console.error('Gaze calculation error:', error);
      return null;
    }
  }

  getEyeCenter(keypoints, indices) {
    let x = 0, y = 0;
    for (const idx of indices) {
      x += keypoints[idx][0];
      y += keypoints[idx][1];
    }
    return { x: x / indices.length, y: y / indices.length };
  }

  getCenter(points) {
    let x = 0, y = 0;
    for (const point of points) {
      x += point[0];
      y += point[1];
    }
    return { x: x / points.length, y: y / points.length };
  }

  calculateGazeVector(leftEye, rightEye, leftIris, rightIris, keypoints) {
    // Use iris positions if available for higher accuracy
    if (leftIris && rightIris) {
      const leftGazeX = (leftIris.x - leftEye.x) / 20; // Normalize
      const leftGazeY = (leftIris.y - leftEye.y) / 20;
      const rightGazeX = (rightIris.x - rightEye.x) / 20;
      const rightGazeY = (rightIris.y - rightEye.y) / 20;
      
      return {
        x: (leftGazeX + rightGazeX) / 2,
        y: (leftGazeY + rightGazeY) / 2
      };
    }

    // Fallback to basic eye center calculation
    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    };

    // Use nose tip for reference
    const noseTip = keypoints[1];
    const faceCenter = keypoints[9]; // Forehead center

    // Calculate relative gaze direction
    const faceWidth = Math.abs(keypoints[234][0] - keypoints[454][0]); // Face width
    const faceHeight = Math.abs(keypoints[10][1] - keypoints[152][1]); // Face height

    return {
      x: (eyeCenter.x - noseTip[0]) / (faceWidth / 4),
      y: (eyeCenter.y - noseTip[1]) / (faceHeight / 4)
    };
  }

  applyCalibration(gazeVector) {
    // Simple linear interpolation based on calibration data
    if (this.calibrationData.length < 4) {
      return {
        x: window.innerWidth * (0.5 + gazeVector.x * 0.8),
        y: window.innerHeight * (0.5 + gazeVector.y * 0.8)
      };
    }

    // Find closest calibration points and interpolate
    let minDist = Infinity;
    let closestPoint = this.calibrationData[0];
    
    for (const calPoint of this.calibrationData) {
      const dist = Math.sqrt(
        Math.pow(gazeVector.x - calPoint.gazeVector.x, 2) +
        Math.pow(gazeVector.y - calPoint.gazeVector.y, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closestPoint = calPoint;
      }
    }

    // Apply transformation based on closest calibration point
    const scale = 1.2; // Adjust sensitivity
    return {
      x: closestPoint.screenPoint.x + (gazeVector.x - closestPoint.gazeVector.x) * window.innerWidth * scale,
      y: closestPoint.screenPoint.y + (gazeVector.y - closestPoint.gazeVector.y) * window.innerHeight * scale
    };
  }

  processGazeData(gaze) {
    // Smooth the gaze data
    if (this.smoothedGaze.x === 0) {
      this.smoothedGaze = { x: gaze.x, y: gaze.y };
    } else {
      const factor = 0.3;
      this.smoothedGaze.x = factor * gaze.x + (1 - factor) * this.smoothedGaze.x;
      this.smoothedGaze.y = factor * gaze.y + (1 - factor) * this.smoothedGaze.y;
    }

    // Update gaze indicator
    this.updateGazeIndicator();

    // Notify exercise system
    if (window.exerciseSystem) {
      window.exerciseSystem.onGazeUpdate(this.smoothedGaze);
    }
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
      this.calibrationData = [];
      
      const points = [
        [0.1, 0.1], [0.5, 0.1], [0.9, 0.1],
        [0.1, 0.5], [0.5, 0.5], [0.9, 0.5],
        [0.1, 0.9], [0.5, 0.9], [0.9, 0.9]
      ];
      
      let currentPoint = 0;
      status.textContent = `Calibración AI: punto ${currentPoint + 1} de ${points.length}`;

      const showNextPoint = () => {
        if (currentPoint >= points.length) {
          status.textContent = 'Calibración AI completada';
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

        element.onclick = async () => {
          element.classList.add('active');
          status.textContent = `Calibrando punto ${currentPoint + 1}... mira fijamente`;
          
          // Collect gaze data for this point
          const samples = [];
          const startTime = performance.now();
          
          while (performance.now() - startTime < 2000) {
            if (this.smoothedGaze.x > 0) {
              samples.push({
                x: this.smoothedGaze.x,
                y: this.smoothedGaze.y
              });
            }
            await new Promise(r => setTimeout(r, 100));
          }

          if (samples.length > 5) {
            // Calculate average gaze vector for this screen point
            const avgGaze = {
              x: samples.reduce((sum, s) => sum + s.x, 0) / samples.length,
              y: samples.reduce((sum, s) => sum + s.y, 0) / samples.length
            };

            this.calibrationData.push({
              screenPoint: {
                x: point[0] * window.innerWidth,
                y: point[1] * window.innerHeight
              },
              gazeVector: {
                x: (avgGaze.x / window.innerWidth - 0.5) * 2,
                y: (avgGaze.y / window.innerHeight - 0.5) * 2
              }
            });
          }

          element.remove();
          currentPoint++;
          
          if (currentPoint < points.length) {
            status.textContent = `Calibración AI: punto ${currentPoint + 1} de ${points.length}`;
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
    // Camera stays visible in bottom right
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