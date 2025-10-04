// Definiciones de niveles para entrenamiento VOR
const LEVELS = {
  1: {
    name: "Fijación Básica",
    description: "Mantén tu mirada fija en el objetivo central mientras mueves lentamente la cabeza de izquierda a derecha",
    instruction: "Mira el punto rojo y mueve tu cabeza lentamente sin perder la fijación visual",
    duration: 30000,
    targetPattern: "static",
    difficulty: 1
  },
  2: {
    name: "Movimiento Horizontal", 
    description: "Sigue el objetivo con los ojos manteniendo la cabeza quieta, luego invierte - mantén la mirada fija mientras mueves la cabeza",
    instruction: "Fase 1: Sigue el objetivo con los ojos. Fase 2: Mantén la mirada fija mientras mueves la cabeza",
    duration: 45000,
    targetPattern: "horizontal",
    difficulty: 2
  },
  3: {
    name: "Movimiento Vertical",
    description: "Movimientos verticales de cabeza mientras mantienes la fijación visual en el objetivo",
    instruction: "Mantén la mirada en el objetivo mientras mueves la cabeza arriba y abajo",
    duration: 45000,
    targetPattern: "vertical", 
    difficulty: 3
  },
  4: {
    name: "Movimiento Diagonal",
    description: "Movimientos diagonales de cabeza con estabilización de la mirada",
    instruction: "Sigue el patrón diagonal manteniendo la coordinación ojo-cabeza",
    duration: 60000,
    targetPattern: "diagonal",
    difficulty: 4
  },
  5: {
    name: "Patrones Complejos",
    description: "Entrenamiento VOR avanzado con patrones impredecibles de objetivo y movimiento de cabeza",
    instruction: "Desafío avanzado: mantén la estabilidad visual con patrones complejos",
    duration: 90000,
    targetPattern: "complex",
    difficulty: 5
  }
};

class LevelManager {
  constructor() {
    this.currentLevel = null;
    this.levelStartTime = null;
    this.targetElement = null;
    this.instructionOverlay = null;
  }

  selectLevel(levelNum) {
    this.currentLevel = LEVELS[levelNum];
    STATE.currentLevel = levelNum;
    
    // Update UI
    document.querySelectorAll('.level-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-level="${levelNum}"]`).classList.add('active');
    
    // Enable start button
    document.getElementById('btnStart').disabled = false;
    
    this.showLevelInfo();
  }

  showLevelInfo() {
    const info = document.getElementById('levelInfo');
    if (this.currentLevel) {
      info.innerHTML = `
        <strong>${this.currentLevel.name}</strong><br>
        ${this.currentLevel.description}<br>
        <small>Duración: ${this.currentLevel.duration/1000}s | Dificultad: ${this.currentLevel.difficulty}/5</small>
      `;
      info.style.display = 'block';
    } else {
      info.style.display = 'none';
    }
  }

  startLevel() {
    if (!this.currentLevel) {
      alert('Please select a level first');
      return false;
    }

    this.levelStartTime = performance.now();
    this.createTarget();
    this.showInstructions();
    this.startTargetPattern();
    
    return true;
  }

  createTarget() {
    this.targetElement = document.createElement('div');
    this.targetElement.className = 'target active';
    this.targetElement.style.left = '50%';
    this.targetElement.style.top = '50%';
    document.getElementById('gameArea').appendChild(this.targetElement);
  }

  showInstructions() {
    this.instructionOverlay = document.createElement('div');
    this.instructionOverlay.className = 'instruction-overlay';
    this.instructionOverlay.innerHTML = `
      <h3>${this.currentLevel.name}</h3>
      <p>${this.currentLevel.instruction}</p>
      <button onclick="levelManager.hideInstructions()">Comenzar Ejercicio</button>
    `;
    document.body.appendChild(this.instructionOverlay);
  }

  hideInstructions() {
    if (this.instructionOverlay) {
      this.instructionOverlay.remove();
      this.instructionOverlay = null;
    }
  }

  startTargetPattern() {
    if (!this.targetElement) return;

    const pattern = this.currentLevel.targetPattern;
    const startTime = performance.now();
    const duration = this.currentLevel.duration;
    
    // Show progress bar
    this.showProgress();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = (elapsed % 4000) / 4000;
      const overallProgress = Math.min(elapsed / duration, 1);
      
      // Update progress bar
      this.updateProgress(overallProgress);
      
      let x = 50, y = 50;
      
      switch (pattern) {
        case 'static':
          break;
        case 'horizontal':
          x = 50 + 25 * Math.sin(progress * Math.PI * 2);
          break;
        case 'vertical':
          y = 50 + 20 * Math.sin(progress * Math.PI * 2);
          break;
        case 'diagonal':
          x = 50 + 20 * Math.sin(progress * Math.PI * 2);
          y = 50 + 20 * Math.cos(progress * Math.PI * 2);
          break;
        case 'complex':
          x = 50 + 25 * Math.sin(progress * Math.PI * 3) + 12 * Math.cos(progress * Math.PI * 5);
          y = 50 + 20 * Math.cos(progress * Math.PI * 2) + 10 * Math.sin(progress * Math.PI * 7);
          break;
      }
      
      this.targetElement.style.left = x + '%';
      this.targetElement.style.top = y + '%';
      
      // Update target position for analytics
      STATE.currentTargetPosition.x = (x / 100) * window.innerWidth;
      STATE.currentTargetPosition.y = (y / 100) * window.innerHeight;
      
      if (elapsed < duration && STATE.sessionActive) {
        requestAnimationFrame(animate);
      } else if (STATE.sessionActive) {
        this.completeLevel();
      }
    };
    
    requestAnimationFrame(animate);
  }

  showProgress() {
    const progressDiv = document.getElementById('progress');
    progressDiv.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="progress-text" id="progressText">0%</div>
    `;
    progressDiv.style.display = 'block';
  }
  
  updateProgress(progress) {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    if (fill && text) {
      fill.style.width = (progress * 100) + '%';
      text.textContent = Math.round(progress * 100) + '%';
    }
  }
  
  completeLevel() {
    if (this.targetElement) {
      this.targetElement.remove();
      this.targetElement = null;
    }
    
    document.getElementById('progress').style.display = 'none';
    
    // Mark level as completed
    STATE.completedLevels.add(STATE.currentLevel);
    const levelBtn = document.querySelector(`[data-level="${STATE.currentLevel}"]`);
    if (levelBtn) {
      levelBtn.classList.add('completed');
    }
    
    const completion = document.createElement('div');
    completion.className = 'instruction-overlay';
    completion.innerHTML = `
      <h3>¡Nivel Completado!</h3>
      <p>${this.currentLevel.name} finalizado exitosamente.</p>
      <p>Los datos han sido registrados para análisis.</p>
      <button onclick="this.parentElement.remove()">Continuar</button>
    `;
    document.body.appendChild(completion);
  }

  stopLevel() {
    if (this.targetElement) {
      this.targetElement.remove();
      this.targetElement = null;
    }
    if (this.instructionOverlay) {
      this.instructionOverlay.remove();
      this.instructionOverlay = null;
    }
    document.getElementById('progress').style.display = 'none';
  }
}

// Global level manager instance
const levelManager = new LevelManager();