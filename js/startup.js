// Startup system checks and project introduction
class StartupManager {
  constructor() {
    this.modal = document.getElementById('startupModal');
    this.content = document.getElementById('startupContent');
  }

  async initialize() {
    this.showSystemChecks();
  }

  async showSystemChecks() {
    this.content.innerHTML = `
      <h2>Verificación del Sistema</h2>
      <div id="checks"></div>
      <button id="continueBtn" disabled>Verificando...</button>
    `;

    const checksDiv = document.getElementById('checks');
    const continueBtn = document.getElementById('continueBtn');
    let allPassed = true;

    // Check browser compatibility
    const browserCheck = this.checkBrowser();
    checksDiv.appendChild(this.createCheckElement('Navegador Compatible', browserCheck.status, browserCheck.message));
    if (!browserCheck.status) allPassed = false;

    // Check camera access
    const cameraCheck = await this.checkCamera();
    checksDiv.appendChild(this.createCheckElement('Acceso a Cámara', cameraCheck.status, cameraCheck.message));
    if (!cameraCheck.status) allPassed = false;

    // Check screen size
    const screenCheck = this.checkScreen();
    checksDiv.appendChild(this.createCheckElement('Resolución de Pantalla', screenCheck.status, screenCheck.message));

    if (allPassed) {
      continueBtn.textContent = 'Continuar';
      continueBtn.disabled = false;
      continueBtn.onclick = () => this.showProjectInfo();
    } else {
      continueBtn.textContent = 'Continuar de todos modos';
      continueBtn.disabled = false;
      continueBtn.onclick = () => this.showProjectInfo();
    }
  }

  checkBrowser() {
    const userAgent = navigator.userAgent;
    const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');
    const isFirefox = userAgent.includes('Firefox');
    const isEdge = userAgent.includes('Edg');

    if (isChrome) {
      return { status: true, message: 'Chrome detectado - Óptimo para WebGazer' };
    } else if (isFirefox) {
      return { status: true, message: 'Firefox detectado - Compatible' };
    } else if (isEdge) {
      return { status: true, message: 'Edge detectado - Compatible' };
    } else {
      return { status: false, message: 'Navegador no recomendado. Use Chrome, Firefox o Edge' };
    }
  }

  async checkCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return { status: true, message: 'Cámara disponible y accesible' };
    } catch (error) {
      return { status: false, message: 'No se puede acceder a la cámara. Verifique permisos' };
    }
  }

  checkScreen() {
    const width = window.screen.width;
    const height = window.screen.height;
    
    if (width >= 1024 && height >= 768) {
      return { status: true, message: `Resolución adecuada: ${width}x${height}` };
    } else {
      return { status: false, message: `Resolución baja: ${width}x${height}. Recomendado: 1024x768+` };
    }
  }

  createCheckElement(title, status, message) {
    const div = document.createElement('div');
    div.className = `status-check ${status ? 'status-ok' : 'status-error'}`;
    div.innerHTML = `
      <strong>${status ? '✓' : '✗'} ${title}</strong><br>
      <small>${message}</small>
    `;
    return div;
  }

  showProjectInfo() {
    this.content.innerHTML = `
      <h2>Sistema de Entrenamiento VOR</h2>
      <p><strong>Reflejo Vestíbulo-Ocular (VOR)</strong></p>
      
      <div style="text-align: left; max-width: 500px; margin: 20px auto;">
        <h3>¿Qué es el VOR?</h3>
        <p>El VOR es un reflejo que estabiliza la mirada durante movimientos de cabeza, permitiendo mantener la fijación visual en un objetivo.</p>
        
        <h3>Objetivo del Entrenamiento</h3>
        <p>Mejorar la coordinación entre movimientos de cabeza y control ocular a través de 5 niveles progresivos.</p>
        
        <h3>Instrucciones</h3>
        <ul>
          <li>Mantenga una distancia de 60-80cm de la pantalla</li>
          <li>Asegúrese de tener buena iluminación</li>
          <li>Calibre el sistema antes de comenzar</li>
          <li>Siga las instrucciones de cada nivel</li>
        </ul>
        
        <h3>Datos Recopilados</h3>
        <p>El sistema registra métricas de coordinación ojo-cabeza para análisis posterior.</p>
      </div>
      
      <button onclick="startupManager.closeModal()">Comenzar</button>
    `;
  }

  closeModal() {
    this.modal.style.display = 'none';
  }
}

// Global startup manager instance
const startupManager = new StartupManager();