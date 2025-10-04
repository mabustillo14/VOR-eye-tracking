// Gaze visualization with laser lines
class VisualizationManager {
  constructor() {
    this.svg = null;
  }

  setupVisualization() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', width);
    this.svg.setAttribute('height', height);
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0px';
    this.svg.style.left = '0px';
    this.svg.style.zIndex = '50000';
    this.svg.style.pointerEvents = 'none';
    
    document.getElementById('gameArea').appendChild(this.svg);
    this.addGazeVisualization();
  }

  addGazeVisualization() {
    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.id = 'eyeline1';
    line1.setAttribute('stroke-width', '2');
    line1.setAttribute('stroke', 'red');
    this.svg.appendChild(line1);

    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.id = 'eyeline2';
    line2.setAttribute('stroke-width', '2');
    line2.setAttribute('stroke', 'red');
    this.svg.appendChild(line2);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.id = 'predictionSquare';
    rect.setAttribute('width', '6');
    rect.setAttribute('height', '6');
    rect.setAttribute('fill', 'red');
    this.svg.appendChild(rect);
  }

  updateGazeVisualization(data, fmPositions, whr) {
    // Update eye lines
    try {
      const leftEye = fmPositions[145];
      const rightEye = fmPositions[374];

      if (leftEye && rightEye) {
        const leftX = CONFIG.PREVIEW_WIDTH - leftEye[0] * whr[0];
        const leftY = leftEye[1] * whr[1];
        const rightX = CONFIG.PREVIEW_WIDTH - rightEye[0] * whr[0];
        const rightY = rightEye[1] * whr[1];

        const line1 = document.getElementById('eyeline1');
        line1.setAttribute('x1', data.x);
        line1.setAttribute('y1', data.y);
        line1.setAttribute('x2', leftX);
        line1.setAttribute('y2', leftY);

        const line2 = document.getElementById('eyeline2');
        line2.setAttribute('x1', data.x);
        line2.setAttribute('y1', data.y);
        line2.setAttribute('x2', rightX);
        line2.setAttribute('y2', rightY);
      }
    } catch (e) {
      // Ignore if indices don't exist
    }

    const rect = document.getElementById('predictionSquare');
    rect.setAttribute('x', data.x);
    rect.setAttribute('y', data.y);
  }
}

// Global visualization manager instance
const visualizationManager = new VisualizationManager();