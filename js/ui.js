// UI management for VOR rehabilitation system
class UIManager {
  constructor() {
    this.currentLevel = 1;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Exercise level buttons
    for (let i = 1; i <= 5; i++) {
      const btn = document.getElementById(`btnLevel${i}`);
      if (btn) {
        btn.addEventListener('click', () => this.selectLevel(i));
      }
    }

    // Control buttons
    document.getElementById('btnCalibrate')?.addEventListener('click', () => this.calibrate());
    document.getElementById('btnStart')?.addEventListener('click', () => this.startExercise());
    document.getElementById('btnPause')?.addEventListener('click', () => this.pauseExercise());
    document.getElementById('btnStop')?.addEventListener('click', () => this.stopExercise());
    
    // Modal buttons
    document.getElementById('btnExport')?.addEventListener('click', () => this.exportData());
    document.getElementById('btnNewSession')?.addEventListener('click', () => this.newSession());
    
    // Calibration precision buttons (added dynamically)
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btnAcceptCalibration' || e.target.id === 'btnRecalibrate') {
        // Handled by eye tracker
      }
    });

    // Close modal when clicking outside
    document.getElementById('resultsModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'resultsModal') {
        this.closeModal();
      }
    });
  }

  selectLevel(level) {
    this.currentLevel = level;
    
    // Update button states
    document.querySelectorAll('.exercise-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`btnLevel${level}`)?.classList.add('active');
    
    // Update level indicator
    document.getElementById('currentLevel').textContent = level;
    
    // Update instructions
    const config = CONFIG.LEVELS[level];
    if (config) {
      const instructions = document.getElementById('exerciseInstructions');
      instructions.innerHTML = `
        <h3>${config.name}</h3>
        <p>${config.description}</p>
        <p><strong>Duración:</strong> ${config.duration / 1000} segundos</p>
        <p><strong>Dificultad:</strong> ${this.getDifficultyText(level)}</p>
      `;
    }
    
    // Enable start button if calibrated
    this.updateButtonStates();
  }

  getDifficultyText(level) {
    const difficulties = ['Muy Fácil', 'Fácil', 'Medio', 'Difícil', 'Muy Difícil'];
    return difficulties[level - 1] || 'Desconocido';
  }

  async calibrate() {
    if (!STATE.eyeTracker) {
      this.showMessage('Error: Sistema de seguimiento ocular no inicializado', 'error');
      return;
    }

    this.setButtonState('btnCalibrate', false, 'Calibrando...');
    
    try {
      const success = await STATE.eyeTracker.calibrate();
      if (success) {
        this.showMessage('Calibración completada exitosamente', 'success');
        STATE.isCalibrated = true;
      } else {
        this.showMessage('Error en la calibración', 'error');
      }
    } catch (error) {
      this.showMessage('Error durante la calibración: ' + error.message, 'error');
    }
    
    this.setButtonState('btnCalibrate', true, 'Calibrar Sistema');
    this.updateButtonStates();
  }

  startExercise() {
    if (!STATE.isCalibrated) {
      this.showMessage('Debe calibrar el sistema antes de comenzar', 'warning');
      return;
    }

    if (!window.exerciseSystem) {
      this.showMessage('Error: Sistema de ejercicios no disponible', 'error');
      return;
    }

    // Start eye tracker session
    if (STATE.eyeTracker) {
      STATE.eyeTracker.startSession();
    }

    const success = window.exerciseSystem.startExercise(this.currentLevel);
    if (success) {
      STATE.isRunning = true;
      this.updateButtonStates();
      this.showMessage(`Ejercicio Nivel ${this.currentLevel} iniciado`, 'success');
    } else {
      this.showMessage('Error al iniciar el ejercicio', 'error');
    }
  }

  pauseExercise() {
    if (window.exerciseSystem && STATE.isRunning) {
      if (STATE.isPaused) {
        window.exerciseSystem.resumeExercise();
        this.setButtonState('btnPause', true, 'Pausar');
        this.showMessage('Ejercicio reanudado', 'info');
      } else {
        window.exerciseSystem.pauseExercise();
        this.setButtonState('btnPause', true, 'Reanudar');
        this.showMessage('Ejercicio pausado', 'info');
      }
      this.updateButtonStates();
    }
  }

  stopExercise() {
    if (window.exerciseSystem && STATE.isRunning) {
      window.exerciseSystem.stopExercise();
      
      // Stop eye tracker session
      if (STATE.eyeTracker) {
        STATE.eyeTracker.stopSession();
      }
      
      STATE.isRunning = false;
      STATE.isPaused = false;
      this.updateButtonStates();
      this.resetMetrics();
      this.showMessage('Ejercicio detenido', 'info');
    }
  }

  exportData() {
    if (STATE.eyeTracker) {
      STATE.eyeTracker.exportData();
      this.showMessage('Datos exportados exitosamente', 'success');
    } else if (window.exerciseSystem) {
      window.exerciseSystem.exportData();
      this.showMessage('Datos exportados exitosamente', 'success');
    }
  }

  newSession() {
    this.closeModal();
    this.resetMetrics();
    this.resetProgress();
    STATE.isRunning = false;
    STATE.isPaused = false;
    this.updateButtonStates();
  }

  closeModal() {
    document.getElementById('resultsModal').style.display = 'none';
  }

  updateButtonStates() {
    const isCalibrated = STATE.isCalibrated;
    const isRunning = STATE.isRunning;
    const isPaused = STATE.isPaused;

    // Start button
    this.setButtonState('btnStart', isCalibrated && !isRunning, 'Iniciar Ejercicio');
    
    // Pause button
    this.setButtonState('btnPause', isRunning, isPaused ? 'Reanudar' : 'Pausar');
    
    // Stop button
    this.setButtonState('btnStop', isRunning, 'Detener');
    
    // Exercise level buttons
    document.querySelectorAll('.exercise-btn').forEach(btn => {
      btn.disabled = isRunning;
    });
    
    // Update calibration status
    this.updateCalibrationStatus();
  }

  updateCalibrationStatus() {
    const stateElement = document.getElementById('calibrationState');
    const precisionElement = document.getElementById('currentPrecision');
    
    if (STATE.isCalibrated) {
      stateElement.textContent = 'Calibrado';
      stateElement.style.color = '#4CAF50';
      precisionElement.textContent = '75 px';
      precisionElement.style.color = '#FF9800';
    } else {
      stateElement.textContent = 'No calibrado';
      stateElement.style.color = '#f44336';
      precisionElement.textContent = '-';
      precisionElement.style.color = '#B0BEC5';
    }
  }

  setButtonState(buttonId, enabled, text = null) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = !enabled;
      if (text) {
        button.textContent = text;
      }
    }
  }

  resetMetrics() {
    document.getElementById('fixationStability').textContent = '-';
    document.getElementById('vorAccuracy').textContent = '-';
    document.getElementById('timeOnTarget').textContent = '-';
    document.getElementById('currentScore').textContent = '0';
  }

  resetProgress() {
    document.getElementById('progressFill').style.width = '0%';
  }

  showMessage(message, type = 'info') {
    // Create temporary message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      opacity: 0;
      transition: all 0.3s ease;
    `;

    // Set background color based on type
    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      warning: '#FF9800',
      info: '#2196F3'
    };
    messageEl.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(messageEl);

    // Animate in
    setTimeout(() => {
      messageEl.style.opacity = '1';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
      messageEl.style.opacity = '0';
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 300);
    }, 3000);
  }

  updateLevelProgress(progress) {
    document.getElementById('progressFill').style.width = progress + '%';
  }

  showCalibrationStatus(status) {
    document.getElementById('calibrationStatus').textContent = status;
  }
}