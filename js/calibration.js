// Calibration system based on WebGazer's calibration.html
class CalibrationManager {
  constructor() {
    this.PointCalibrate = 0;
    this.CalibrationPoints = {};
    this.precision_measurement = new Array();
    this.accuracy_measurement = new Array();
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
            <li>Mantenga una distancia de 60-80cm</li>
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
    
    document.getElementById('statusText').innerText = 'calibrando: haz clic en cada punto y mira fijamente';
    
    this.PointCalibrate = 0;
    this.CalibrationPoints = {};
    
    this.ShowCalibrationPoint();
  }

  ShowCalibrationPoint() {
    const pointPositions = [
      [10, 10], [50, 10], [90, 10],
      [10, 50], [50, 50], [90, 50],
      [10, 90], [50, 90], [90, 90]
    ];
    
    if (this.PointCalibrate < 9) {
      const grid = document.getElementById('calibrationGrid');
      grid.innerHTML = '';
      
      const point = document.createElement('div');
      point.id = 'Pt' + this.PointCalibrate;
      point.className = 'calPoint';
      point.style.left = pointPositions[this.PointCalibrate][0] + '%';
      point.style.top = pointPositions[this.PointCalibrate][1] + '%';
      point.innerText = (this.PointCalibrate + 1);
      
      point.onclick = () => this.calPointClick(point);
      grid.appendChild(point);
    } else {
      this.calculatePrecision();
    }
  }

  async calPointClick(node) {
    node.style.background = 'yellow';
    node.style.opacity = '0.2';
    
    const id = node.id;
    this.CalibrationPoints[id] = node;
    
    // Collect data for 1 second
    const startTime = performance.now();
    while (performance.now() - startTime < 1000) {
      const prediction = await webgazer.getCurrentPrediction();
      if (prediction) {
        webgazer.recordScreenPosition(prediction.x, prediction.y, 'click');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    node.style.background = 'red';
    node.style.opacity = '1.0';
    
    audioManager.playSound('calibrationPoint');
    
    this.PointCalibrate++;
    setTimeout(() => this.ShowCalibrationPoint(), 500);
  }

  calculatePrecision() {
    webgazer.params.showVideoPreview = false;
    
    // Test precision on each calibration point
    this.PointCalibrate = 0;
    this.precision_measurement = [];
    this.accuracy_measurement = [];
    
    this.measurePrecision();
  }

  async measurePrecision() {
    if (this.PointCalibrate < 9) {
      const id = 'Pt' + this.PointCalibrate;
      const node = this.CalibrationPoints[id];
      
      if (node) {
        const rect = node.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        const precision_measurements = [];
        const accuracy_measurements = [];
        
        // Collect 50 measurements
        for (let i = 0; i < 50; i++) {
          const prediction = await webgazer.getCurrentPrediction();
          if (prediction) {
            const distance = Math.sqrt(Math.pow(prediction.x - x, 2) + Math.pow(prediction.y - y, 2));
            precision_measurements.push(distance);
            accuracy_measurements.push({ x: prediction.x, y: prediction.y });
          }
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        this.precision_measurement.push(precision_measurements);
        this.accuracy_measurement.push(accuracy_measurements);
      }
      
      this.PointCalibrate++;
      setTimeout(() => this.measurePrecision(), 100);
    } else {
      this.showResults();
    }
  }

  showResults() {
    const overlay = document.getElementById('calibrationOverlay');
    const grid = document.getElementById('calibrationGrid');
    
    // Calculate average precision
    let total_precision = 0;
    let precision_count = 0;
    
    for (let i = 0; i < this.precision_measurement.length; i++) {
      for (let j = 0; j < this.precision_measurement[i].length; j++) {
        total_precision += this.precision_measurement[i][j];
        precision_count++;
      }
    }
    
    const avg_precision = precision_count > 0 ? total_precision / precision_count : 0;
    const precision_percentage = Math.round((1 - (avg_precision / Math.sqrt(Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)))) * 100);
    
    grid.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px;">
        <h3>Calibración Completada</h3>
        <p>Precisión: ${precision_percentage}%</p>
        <p>Distancia promedio: ${Math.round(avg_precision)}px</p>
        <button onclick="calibrationManager.finishCalibration()">Continuar</button>
      </div>
    `;
  }

  finishCalibration() {
    document.getElementById('calibrationOverlay').style.display = 'none';
    document.getElementById('calibrationGrid').style.display = 'none';
    document.getElementById('statusText').innerText = 'calibración completada';
    webgazer.params.showVideoPreview = true;
  }
}

// Global calibration manager instance
const calibrationManager = new CalibrationManager();