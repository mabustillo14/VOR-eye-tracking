// Simple gaze visualization
class VisualizationManager {
  constructor() {
    this.gazeIndicator = null;
  }

  setupVisualization() {
    this.gazeIndicator = document.createElement('div');
    this.gazeIndicator.className = 'gaze-indicator';
    this.gazeIndicator.style.display = 'none';
    document.getElementById('gameArea').appendChild(this.gazeIndicator);
  }

  updateGazeVisualization(data) {
    if (this.gazeIndicator && STATE.sessionActive) {
      this.gazeIndicator.style.display = 'block';
      this.gazeIndicator.style.left = data.x + 'px';
      this.gazeIndicator.style.top = data.y + 'px';
    } else if (this.gazeIndicator) {
      this.gazeIndicator.style.display = 'none';
    }
  }
}

// Global visualization manager instance
const visualizationManager = new VisualizationManager();