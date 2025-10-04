// WebGazer-based eye tracking with collision system and professional calibration
class EyeTracker {
  constructor() {
    this.smoothedGaze = {x: 0, y: 0};
    this.isInitialized = false;
    this.isRunning = false;
    this.precisionData = [];
    this.currentPrecision = null;
    this.collisionSystem = null;
  }

  async initialize() {
    try {
      console.log('Initializing WebGazer with collision system...');
      
      // Clear previous data
      if (!window.saveDataAcrossSessions) {
        await localforage.setItem('webgazerGlobalData', null);
        await localforage.setItem('webgazerGlobalSettings', null);
      }

      // Initialize WebGazer
      const webgazerInstance = await webgazer
        .setRegression('ridge')
        .setTracker('TFFacemesh')
        .begin();

      webgazerInstance
        .showVideoPreview(true)
        .showPredictionPoints(true)
        .applyKalmanFilter(true);

      // Configure for collision experience
      webgazer.params.videoViewerWidth = 240;
      webgazer.params.videoViewerHeight = 180;
      webgazer.params.faceFeedbackBoxRatio = 0.66;
      webgazer.params.showFaceOverlay = true;
      webgazer.params.showFaceFeedbackBox = true;

      // Position camera in bottom right
      setTimeout(() => this.positionCamera(), 1000);

      // Setup collision system
      this.setupCollisionSystem();

      webgazer.setGazeListener(this.onGazeData.bind(this));
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Eye tracker initialization failed:', error);
      return false;
    }
  }

  positionCamera() {
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

  setupCollisionSystem() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const numberOfNodes = 100;

    // Create nodes for collision system
    this.nodes = d3.range(numberOfNodes).map(() => ({
      radius: Math.random() * 12 + 4
    }));
    this.nodes[0].radius = 0;
    this.nodes[0].fixed = true;

    // Setup D3 force layout
    this.force = d3.layout.force()
      .gravity(0.05)
      .charge((d, i) => i ? 0 : -2000)
      .nodes(this.nodes)
      .size([width, height])
      .start();

    // Create SVG for collision visualization
    const svg = d3.select('body').append('svg')
      .attr('id', 'collisionSVG')
      .attr('width', width)
      .attr('height', height)
      .style('position', 'absolute')
      .style('top', '0px')
      .style('left', '0px')
      .style('z-index', '100000')
      .style('pointer-events', 'none');

    const color = d3.scale.category10();

    // Add circles
    svg.selectAll('circle')
      .data(this.nodes.slice(1))
      .enter().append('circle')
      .attr('r', d => d.radius)
      .style('fill', (d, i) => i === this.nodes.length - 2 ? 'orange' : color(0));

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

    // Force simulation tick
    this.force.on('tick', (e) => {
      const q = d3.geom.quadtree(this.nodes);
      let i = 0;
      const n = this.nodes.length;

      while (++i < n) q.visit(this.collide(this.nodes[i]));

      svg.selectAll('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    });

    this.collisionSystem = { svg, force: this.force, nodes: this.nodes };
  }

  collide(node) {
    const r = node.radius + 16;
    const nx1 = node.x - r;
    const nx2 = node.x + r;
    const ny1 = node.y - r;
    const ny2 = node.y + r;
    
    return (quad, x1, y1, x2, y2) => {
      if (quad.point && (quad.point !== node)) {
        let x = node.x - quad.point.x;
        let y = node.y - quad.point.y;
        let l = Math.sqrt(x * x + y * y);
        const r = node.radius + quad.point.radius;
        if (l < r) {
          l = (l - r) / l * 0.5;
          node.x -= x *= l;
          node.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
  }

  async onGazeData(data, clock) {
    if (!data) return;

    // Update collision system
    if (this.nodes) {
      this.nodes[0].px = data.x;
      this.nodes[0].py = data.y;
      this.force.resume();
    }

    // Update prediction square
    d3.select('#predictionSquare')
      .attr('x', data.x)
      .attr('y', data.y);

    // Get face mesh positions for eye lines
    try {
      const fmPositions = await webgazer.getTracker().getPositions();
      if (fmPositions) {
        const whr = webgazer.getVideoPreviewToCameraResolutionRatio();
        const previewWidth = webgazer.params.videoViewerWidth || 240;

        const leftEye = fmPositions[145];
        const rightEye = fmPositions[374];

        if (leftEye && rightEye) {
          const leftX = previewWidth - leftEye[0] * whr[0];
          const leftY = leftEye[1] * whr[1];
          const rightX = previewWidth - rightEye[0] * whr[0];
          const rightY = rightEye[1] * whr[1];

          d3.select('#eyeline1')
            .attr('x1', data.x)
            .attr('y1', data.y)
            .attr('x2', leftX)
            .attr('y2', leftY);

          d3.select('#eyeline2')
            .attr('x1', data.x)
            .attr('y1', data.y)
            .attr('x2', rightX)
            .attr('y2', rightY);
        }
      }
    } catch (e) {
      // Ignore errors in eye line calculation
    }

    // Process gaze data
    this.processGazeData(data);
  }

  processGazeData(gaze) {
    // Simple smoothing
    if (this.smoothedGaze.x === 0 && this.smoothedGaze.y === 0) {
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
      
      title.textContent = 'Calibración WebGazer';
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
          
          // Record calibration point multiple times
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
        const pred = await webgazer.getCurrentPrediction();
        if (pred) {
          samples.push({ x: pred.x, y: pred.y });
        }
        await new Promise(r => setTimeout(r, 50));
      }
      
      if (samples.length > 20) {
        const targetX = point[0] * window.innerWidth;
        const targetY = point[1] * window.innerHeight;
        
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
    
    const avgPrecision = this.precisionData.reduce((a, b) => a + b, 0) / this.precisionData.length;
    this.currentPrecision = avgPrecision;
    
    status.style.display = 'none';
    resultsDiv.style.display = 'block';
    avgPrecisionSpan.textContent = Math.round(avgPrecision) + ' px';
    
    if (avgPrecision < 50) {
      avgPrecisionSpan.style.color = '#4CAF50';
    } else if (avgPrecision < 100) {
      avgPrecisionSpan.style.color = '#FF9800';
    } else {
      avgPrecisionSpan.style.color = '#f44336';
    }
    
    // Setup button handlers
    const acceptBtn = document.getElementById('btnAcceptCalibration');
    const recalibrateBtn = document.getElementById('btnRecalibrate');
    
    acceptBtn.onclick = () => this.acceptCalibration(resolve);
    recalibrateBtn.onclick = () => this.recalibrate(resolve);
  }

  acceptCalibration(resolve) {
    const overlay = document.getElementById('calibrationOverlay');
    overlay.style.display = 'none';
    
    document.getElementById('calibrationState').textContent = 'Calibrado';
    document.getElementById('currentPrecision').textContent = Math.round(this.currentPrecision) + ' px';
    
    STATE.isCalibrated = true;
    resolve(true);
  }

  recalibrate(resolve) {
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
    const current = webgazer.params.showVideoPreview;
    webgazer.showVideoPreview(!current);
  }

  destroy() {
    this.isRunning = false;
    if (this.isInitialized) {
      webgazer.end();
      this.isInitialized = false;
    }
    
    // Remove collision SVG
    d3.select('#collisionSVG').remove();
  }
}