// Main application initialization and coordination
class VORRehabilitationApp {
  constructor() {
    this.eyeTracker = null;
    this.exerciseSystem = null;
    this.uiManager = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('Initializing VOR Rehabilitation System with AI...');
      
      // Show loading message
      this.showLoadingMessage('Cargando modelo de IA para seguimiento ocular...');
      
      // Initialize AI-based eye tracker
      this.eyeTracker = new EyeTracker();
      const eyeTrackerReady = await this.eyeTracker.initialize();
      
      if (!eyeTrackerReady) {
        throw new Error('Failed to initialize AI eye tracking system');
      }
      
      this.hideLoadingMessage();

      // Initialize exercise system
      this.exerciseSystem = new ExerciseSystem();
      
      // Initialize UI manager
      this.uiManager = new UIManager();
      
      // Make systems globally available
      STATE.eyeTracker = this.eyeTracker;
      window.exerciseSystem = this.exerciseSystem;
      window.uiManager = this.uiManager;
      
      // Set initial UI state
      this.uiManager.selectLevel(1);
      this.uiManager.updateButtonStates();
      
      this.isInitialized = true;
      console.log('VOR Rehabilitation System initialized successfully');
      
      // Show welcome message
      this.uiManager.showMessage('Sistema VOR con IA inicializado. Calibre el sistema para comenzar.', 'success');
      
    } catch (error) {
      console.error('Failed to initialize VOR Rehabilitation System:', error);
      this.showInitializationError(error.message);
    }
  }

  showLoadingMessage(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingMessage';
    loadingDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2196F3;
        color: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        z-index: 10000;
        max-width: 400px;
      ">
        <h3>Cargando Sistema IA</h3>
        <p>${message}</p>
        <div style="margin: 20px 0;">
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255,255,255,0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          "></div>
        </div>
        <p style="font-size: 14px; opacity: 0.8;">Esto puede tomar unos segundos...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(loadingDiv);
  }

  hideLoadingMessage() {
    const loadingDiv = document.getElementById('loadingMessage');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  showInitializationError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f44336;
        color: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        z-index: 10000;
        max-width: 400px;
      ">
        <h3>Error de Inicialización IA</h3>
        <p>${message}</p>
        <p>Por favor, recargue la página y asegúrese de que:</p>
        <ul style="text-align: left; margin: 15px 0;">
          <li>Su cámara esté conectada y funcionando</li>
          <li>Haya otorgado permisos de cámara al navegador</li>
          <li>Esté usando un navegador compatible (Chrome, Firefox, Edge)</li>
          <li>Tenga una conexión a internet estable</li>
        </ul>
        <button onclick="location.reload()" style="
          background: white;
          color: #f44336;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        ">Recargar Página</button>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }

  destroy() {
    if (this.eyeTracker) {
      this.eyeTracker.destroy();
    }
    
    if (this.exerciseSystem && STATE.isRunning) {
      this.exerciseSystem.stopExercise();
    }
    
    this.isInitialized = false;
  }
}

// Global app instance
let vorApp = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  vorApp = new VORRehabilitationApp();
  await vorApp.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (vorApp) {
    vorApp.destroy();
  }
});

// Handle visibility change (pause when tab is hidden)
document.addEventListener('visibilitychange', () => {
  if (STATE.isRunning && !STATE.isPaused) {
    if (document.hidden) {
      // Tab is hidden, pause exercise
      if (window.exerciseSystem) {
        window.exerciseSystem.pauseExercise();
        window.uiManager?.showMessage('Ejercicio pausado - pestaña oculta', 'warning');
      }
    }
  }
});

// Error handling
window.addEventListener('error', (event) => {
  console.error('Application error:', event.error);
  if (window.uiManager) {
    window.uiManager.showMessage('Error en la aplicación. Consulte la consola para más detalles.', 'error');
  }
});

// Prevent accidental page refresh during exercises
window.addEventListener('beforeunload', (event) => {
  if (STATE.isRunning) {
    event.preventDefault();
    event.returnValue = '¿Está seguro de que desea salir? Se perderá el progreso del ejercicio actual.';
    return event.returnValue;
  }
});