// Exercise system for VOR rehabilitation
class ExerciseSystem {
  constructor() {
    this.currentExercise = null;
    this.startTime = null;
    this.sessionData = [];
    this.score = 0;
    this.timeOnTarget = 0;
    this.totalTime = 0;
  }

  startExercise(level) {
    const config = CONFIG.LEVELS[level];
    if (!config) return false;

    this.currentExercise = {
      level: level,
      config: config,
      startTime: performance.now(),
      targetPosition: {x: window.innerWidth / 2, y: window.innerHeight / 2},
      isActive: true
    };

    STATE.isRunning = true;
    STATE.currentLevel = level;
    this.score = 0;
    this.timeOnTarget = 0;
    this.totalTime = 0;
    this.sessionData = [];

    this.updateInstructions(config);
    this.showTarget();
    this.startTargetMovement();
    this.startMetricsUpdate();

    return true;
  }

  updateInstructions(config) {
    const instructions = document.getElementById('exerciseInstructions');
    instructions.innerHTML = `
      <h3>${config.name}</h3>
      <p>${config.description}</p>
      <p><strong>Duración:</strong> ${config.duration / 1000} segundos</p>
      <p><strong>Objetivo:</strong> Mantén la mirada en el objetivo rojo</p>
    `;
  }

  showTarget() {
    const target = document.getElementById('fixationTarget');
    target.classList.add('active');
    target.style.width = this.currentExercise.config.targetSize + 'px';
    target.style.height = this.currentExercise.config.targetSize + 'px';
    this.updateTargetPosition();
  }

  updateTargetPosition() {
    const target = document.getElementById('fixationTarget');
    target.style.left = this.currentExercise.targetPosition.x + 'px';
    target.style.top = this.currentExercise.targetPosition.y + 'px';
  }

  startTargetMovement() {
    const level = this.currentExercise.level;
    
    switch(level) {
      case 1:
        // Static center target
        this.currentExercise.targetPosition = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        };
        break;
        
      case 2:
        // Horizontal movement
        this.startHorizontalMovement();
        break;
        
      case 3:
        // Vertical movement
        this.startVerticalMovement();
        break;
        
      case 4:
        // Diagonal movement
        this.startDiagonalMovement();
        break;
        
      case 5:
        // Complex pattern
        this.startComplexMovement();
        break;
    }
  }

  startHorizontalMovement() {
    const amplitude = window.innerWidth * 0.3;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const frequency = 0.5; // Hz
    
    const animate = () => {
      if (!this.currentExercise?.isActive) return;
      
      const elapsed = (performance.now() - this.currentExercise.startTime) / 1000;
      const x = centerX + amplitude * Math.sin(2 * Math.PI * frequency * elapsed);
      
      this.currentExercise.targetPosition = {x, y: centerY};
      this.updateTargetPosition();
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  startVerticalMovement() {
    const amplitude = window.innerHeight * 0.3;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const frequency = 0.4; // Hz
    
    const animate = () => {
      if (!this.currentExercise?.isActive) return;
      
      const elapsed = (performance.now() - this.currentExercise.startTime) / 1000;
      const y = centerY + amplitude * Math.sin(2 * Math.PI * frequency * elapsed);
      
      this.currentExercise.targetPosition = {x: centerX, y};
      this.updateTargetPosition();
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  startDiagonalMovement() {
    const amplitudeX = window.innerWidth * 0.25;
    const amplitudeY = window.innerHeight * 0.25;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const frequency = 0.3; // Hz
    
    const animate = () => {
      if (!this.currentExercise?.isActive) return;
      
      const elapsed = (performance.now() - this.currentExercise.startTime) / 1000;
      const x = centerX + amplitudeX * Math.sin(2 * Math.PI * frequency * elapsed);
      const y = centerY + amplitudeY * Math.cos(2 * Math.PI * frequency * elapsed * 1.5);
      
      this.currentExercise.targetPosition = {x, y};
      this.updateTargetPosition();
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  startComplexMovement() {
    const animate = () => {
      if (!this.currentExercise?.isActive) return;
      
      const elapsed = (performance.now() - this.currentExercise.startTime) / 1000;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // Complex Lissajous curve
      const x = centerX + 200 * Math.sin(2 * Math.PI * 0.3 * elapsed) * Math.cos(2 * Math.PI * 0.1 * elapsed);
      const y = centerY + 150 * Math.sin(2 * Math.PI * 0.4 * elapsed) * Math.sin(2 * Math.PI * 0.15 * elapsed);
      
      this.currentExercise.targetPosition = {x, y};
      this.updateTargetPosition();
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  startMetricsUpdate() {
    const updateInterval = setInterval(() => {
      if (!this.currentExercise?.isActive) {
        clearInterval(updateInterval);
        return;
      }

      this.updateMetrics();
      
      // Check if exercise is complete
      const elapsed = performance.now() - this.currentExercise.startTime;
      if (elapsed >= this.currentExercise.config.duration) {
        this.stopExercise();
        clearInterval(updateInterval);
      }
    }, 100);
  }

  updateMetrics() {
    if (!STATE.eyeTracker) return;

    const gaze = STATE.eyeTracker.getCurrentGaze();
    const target = this.currentExercise.targetPosition;
    const config = this.currentExercise.config;

    // Calculate distance from target
    const distance = Math.sqrt(
      Math.pow(gaze.x - target.x, 2) + 
      Math.pow(gaze.y - target.y, 2)
    );

    // Update time on target
    if (distance <= config.allowedDeviation) {
      this.timeOnTarget += 100; // 100ms interval
    }
    this.totalTime += 100;

    // Calculate metrics
    const timeOnTargetPercent = (this.timeOnTarget / this.totalTime) * 100;
    const fixationStability = Math.max(0, 100 - (distance / config.allowedDeviation) * 100);
    const vorAccuracy = Math.max(0, 100 - (distance / 100) * 50);

    // Update score
    this.score = Math.round(
      (timeOnTargetPercent * CONFIG.SCORING.accuracyWeight + 
       fixationStability * CONFIG.SCORING.stabilityWeight) * 
      (CONFIG.SCORING.maxScore / 100)
    );

    // Update UI
    document.getElementById('fixationStability').textContent = fixationStability.toFixed(1) + '%';
    document.getElementById('vorAccuracy').textContent = vorAccuracy.toFixed(1) + '%';
    document.getElementById('timeOnTarget').textContent = timeOnTargetPercent.toFixed(1) + '%';
    document.getElementById('currentScore').textContent = this.score;

    // Update progress bar
    const progress = (this.totalTime / this.currentExercise.config.duration) * 100;
    document.getElementById('progressFill').style.width = progress + '%';

    // Store data
    this.sessionData.push({
      timestamp: performance.now(),
      gazeX: gaze.x,
      gazeY: gaze.y,
      targetX: target.x,
      targetY: target.y,
      distance: distance,
      onTarget: distance <= config.allowedDeviation
    });
  }

  onGazeUpdate(gaze) {
    // This method is called by the eye tracker
    // Additional gaze processing can be done here if needed
  }

  pauseExercise() {
    if (this.currentExercise) {
      this.currentExercise.isActive = false;
      STATE.isPaused = true;
    }
  }

  resumeExercise() {
    if (this.currentExercise) {
      this.currentExercise.isActive = true;
      STATE.isPaused = false;
      this.startTargetMovement();
      this.startMetricsUpdate();
    }
  }

  stopExercise() {
    if (this.currentExercise) {
      this.currentExercise.isActive = false;
      STATE.isRunning = false;
      STATE.isPaused = false;
      
      // Hide target
      document.getElementById('fixationTarget').classList.remove('active');
      
      // Show results
      this.showResults();
    }
  }

  showResults() {
    const modal = document.getElementById('resultsModal');
    const content = document.getElementById('resultsContent');
    
    const timeOnTargetPercent = (this.timeOnTarget / this.totalTime) * 100;
    const accuracy = this.sessionData.filter(d => d.onTarget).length / this.sessionData.length * 100;
    
    content.innerHTML = `
      <div class="result-item">
        <strong>Nivel Completado:</strong> ${this.currentExercise.level} - ${this.currentExercise.config.name}
      </div>
      <div class="result-item">
        <strong>Puntuación Final:</strong> ${this.score} / ${CONFIG.SCORING.maxScore}
      </div>
      <div class="result-item">
        <strong>Tiempo en Objetivo:</strong> ${timeOnTargetPercent.toFixed(1)}%
      </div>
      <div class="result-item">
        <strong>Precisión General:</strong> ${accuracy.toFixed(1)}%
      </div>
      <div class="result-item">
        <strong>Muestras Registradas:</strong> ${this.sessionData.length}
      </div>
    `;
    
    modal.style.display = 'block';
  }

  exportData() {
    if (this.sessionData.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = ['timestamp', 'gazeX', 'gazeY', 'targetX', 'targetY', 'distance', 'onTarget'];
    const csv = [headers.join(',')].concat(
      this.sessionData.map(row => 
        headers.map(header => JSON.stringify(row[header] || '')).join(',')
      )
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vor_exercise_level${this.currentExercise.level}_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}