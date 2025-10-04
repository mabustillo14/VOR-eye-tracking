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
    this.showCalibrationInstructions();
  }

  showCalibrationInstructions() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Instrucciones de Calibración</h2>
        <div style="text-align: left; max-width: 500px; margin: 20px auto;">
          <h3>Preparación:</h3>
          <ul>
            <li>Siéntese cómodamente frente a la pantalla</li>
            <li>Mantenga una distancia de 60 - 80 cm</li>
            <li>Asegúrese de que su rostro esté bien iluminado</li>
            <li>Evite movimientos bruscos durante la calibración</li>
          </ul>
          
          <h3>Proceso:</h3>
          <ul>
            <li>Aparecerán 9 puntos numerados en la pantalla</li>
            <li>Haga clic en cada punto en orden</li>
            <li>Mire fijamente el punto durante 1.5 segundos</li>
            <li>El punto cambiará de color cuando termine</li>
          </ul>
          
          <h3>Importante:</h3>
          <p><strong>Mantenga la cabeza quieta y solo mueva los ojos para mirar cada punto.</strong></p>
        </div>
        
        <button onclick="calibrationManager.beginCalibration()">Comenzar Calibración</button>
        <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  beginCalibration() {
    document.querySelector('.modal').remove();
    
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
      const targetX = point[0] * window.innerWidth;
      const targetY = point[1] * window.innerHeight;
      
      while (performance.now() - startTime < 1200) {
        webgazer.recordScreenPosition(targetX, targetY);
        await new Promise(resolve => setTimeout(resolve, 80));
      }
      
      element.style.background = '#0af';
      audioManager.playSound('calibrationPoint');
    };
    
    return element;
  }

  createFinishButton() {
    const button = document.createElement('button');
    button.innerText = 'Calcular Precisión';
    button.style.position = 'absolute';
    button.style.left = '50%';
    button.style.bottom = '6%';
    button.style.transform = 'translateX(-50%)';
    
    button.onclick = () => this.calculatePrecision();
    
    return button;
  }

  async calculatePrecision() {
    const grid = document.getElementById('calibrationGrid');
    grid.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center;">Calculando precisión...</div>';
    
    let precision_measurements = [];
    
    // Test precision on each calibration point
    for (let i = 0; i < this.calibrationPoints.length; i++) {
      const point = this.calibrationPoints[i];
      const targetX = point[0] * window.innerWidth;
      const targetY = point[1] * window.innerHeight;
      
      // Collect 50 measurements per point
      for (let j = 0; j < 50; j++) {
        const prediction = await webgazer.getCurrentPrediction();
        if (prediction) {
          const distance = Math.sqrt(
            Math.pow(prediction.x - targetX, 2) + 
            Math.pow(prediction.y - targetY, 2)
          );
          precision_measurements.push(distance);
        }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    
    // Calculate precision percentage like calibration.html
    const screenDiagonal = Math.sqrt(
      Math.pow(window.innerWidth, 2) + 
      Math.pow(window.innerHeight, 2)
    );
    
    const avgDistance = precision_measurements.reduce((a, b) => a + b, 0) / precision_measurements.length;
    const precisionPercentage = Math.round((1 - (avgDistance / screenDiagonal)) * 100);
    
    this.showPrecisionResults(precisionPercentage, avgDistance);
  }
  
  showPrecisionResults(precision, avgDistance) {
    const grid = document.getElementById('calibrationGrid');
    grid.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px;">
        <h3>Calibración Completada</h3>
        <p>Precisión: ${precision}%</p>
        <p>Distancia promedio: ${Math.round(avgDistance)}px</p>
        <button onclick="calibrationManager.finishCalibration()">Continuar</button>
      </div>
    `;
  }
  
  finishCalibration() {
    document.getElementById('calibrationOverlay').style.display = 'none';
    document.getElementById('calibrationGrid').style.display = 'none';
    document.getElementById('statusText').innerText = 'calibración completada';
  }
}

// Global calibration manager instance
const calibrationManager = new CalibrationManager();