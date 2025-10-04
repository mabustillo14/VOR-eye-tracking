// Level definitions for VOR training
const LEVELS = {
  1: {
    name: "Basic Fixation",
    description: "Keep your gaze fixed on the center target while slowly moving your head left and right",
    duration: 30000,
    targetPattern: "static",
    headMovement: "horizontal_slow",
    difficulty: 1
  },
  2: {
    name: "Horizontal Movement", 
    description: "Follow the target with your eyes while keeping your head still, then reverse - keep gaze fixed while moving head",
    duration: 45000,
    targetPattern: "horizontal",
    headMovement: "horizontal_medium",
    difficulty: 2
  },
  3: {
    name: "Vertical Movement",
    description: "Vertical head movements while maintaining gaze fixation on target",
    duration: 45000,
    targetPattern: "vertical", 
    headMovement: "vertical_medium",
    difficulty: 3
  },
  4: {
    name: "Diagonal Movement",
    description: "Diagonal head movements with gaze stabilization",
    duration: 60000,
    targetPattern: "diagonal",
    headMovement: "diagonal",
    difficulty: 4
  },
  5: {
    name: "Complex Patterns",
    description: "Advanced VOR training with unpredictable target and head movement patterns",
    duration: 90000,
    targetPattern: "complex",
    headMovement: "complex",
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
    
    this.showLevelInfo();
  }

  showLevelInfo() {
    const info = document.getElementById('levelInfo');
    if (this.currentLevel) {
      info.innerHTML = `
        <strong>${this.currentLevel.name}</strong><br>
        ${this.currentLevel.description}<br>
        <small>Duration: ${this.currentLevel.duration/1000}s | Difficulty: ${this.currentLevel.difficulty}/5</small>
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
      <p>${this.currentLevel.description}</p>
      <button onclick="levelManager.hideInstructions()">Start Exercise</button>
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
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = (elapsed % 4000) / 4000; // 4 second cycle
      
      let x = 50, y = 50; // center position (%)
      
      switch (pattern) {
        case 'static':
          // Target stays in center
          break;
        case 'horizontal':
          x = 50 + 20 * Math.sin(progress * Math.PI * 2);
          break;
        case 'vertical':
          y = 50 + 15 * Math.sin(progress * Math.PI * 2);
          break;
        case 'diagonal':
          x = 50 + 15 * Math.sin(progress * Math.PI * 2);
          y = 50 + 15 * Math.cos(progress * Math.PI * 2);
          break;
        case 'complex':
          x = 50 + 20 * Math.sin(progress * Math.PI * 3) + 10 * Math.cos(progress * Math.PI * 5);
          y = 50 + 15 * Math.cos(progress * Math.PI * 2) + 8 * Math.sin(progress * Math.PI * 7);
          break;
      }
      
      this.targetElement.style.left = x + '%';
      this.targetElement.style.top = y + '%';
      
      // Continue animation if level is still active
      if (elapsed < this.currentLevel.duration && STATE.sessionActive) {
        requestAnimationFrame(animate);
      } else if (STATE.sessionActive) {
        this.completeLevel();
      }
    };
    
    requestAnimationFrame(animate);
  }

  completeLevel() {
    if (this.targetElement) {
      this.targetElement.remove();
      this.targetElement = null;
    }
    
    // Show completion message
    const completion = document.createElement('div');
    completion.className = 'instruction-overlay';
    completion.innerHTML = `
      <h3>Level Complete!</h3>
      <p>${this.currentLevel.name} finished successfully.</p>
      <button onclick="this.parentElement.remove()">Continue</button>
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
  }
}

// Global level manager instance
const levelManager = new LevelManager();