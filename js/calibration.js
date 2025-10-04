// Calibration system
class CalibrationManager {
  constructor() {
    this.calibrationPoints = [
      [0.1, 0.1], [0.5, 0.1], [0.9, 0.1],
      [0.1, 0.5], [0.5, 0.5], [0.9, 0.5],
      [0.1, 0.9], [0.5, 0.9], [0.9, 0.9]
    ];
  }

  startCalibration() {
    const overlay = document.getElementById('calibrationOverlay');
    const grid = document.getElementById('calibrationGrid');
    
    overlay.style.display = 'block';
    grid.innerHTML = '';
    grid.style.display = 'block';
    
    document.getElementById('statusText').innerText = 'calibrando: haz clic en cada punto y mira fijamente por 1.5s';
    
    this.calibrationPoints.forEach((point, i) => {
      const element = this.createCalibrationPoint(point, i);
      grid.appendChild(element);
    });

    const finishButton = this.createFinishButton();
    grid.appendChild(finishButton);
  }

  createCalibrationPoint(point, index) {
    const element = document.createElement('div');
    element.className = 'calPoint';
    element.style.left = (point[0] * 100) + '%';
    element.style.top = (point[1] * 100) + '%';
    element.innerText = (index + 1);
    
    element.onclick = async () => {
      element.style.background = '#0f0';
      const startTime = performance.now();
      const samples = [];
      
      while (performance.now() - startTime < 1200) {
        const prediction = await webgazer.getCurrentPrediction();
        if (prediction) samples.push(prediction);
        await new Promise(resolve => setTimeout(resolve, 80));
      }
      
      element.style.background = '#0af';
    };
    
    return element;
  }

  createFinishButton() {
    const button = document.createElement('button');
    button.innerText = 'Finalizar Calibración';
    button.style.position = 'absolute';
    button.style.left = '50%';
    button.style.bottom = '6%';
    button.style.transform = 'translateX(-50%)';
    
    button.onclick = () => {
      document.getElementById('calibrationOverlay').style.display = 'none';
      document.getElementById('calibrationGrid').style.display = 'none';
      document.getElementById('statusText').innerText = 'calibración completada';
    };
    
    return button;
  }
}

// Global calibration manager instance
const calibrationManager = new CalibrationManager();