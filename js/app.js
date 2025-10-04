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
      console.log('Initializing VOR Rehabilitation System...');
      
      // Initialize eye tracker
      this.eyeTracker = new EyeTracker();
      const eyeTrackerReady = await this.eyeTracker.initialize();
      
      if (!eyeTrackerReady) {
        throw new Error('Failed to initialize eye tracking system');
      }

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
      this.uiManager.showMessage('Sistema VOR inicializado. Calibre el sistema para comenzar.', 'success');
      
    } catch (error) {
      console.error('Failed to initialize VOR Rehabilitation System:', error);
      this.showInitializationError(error.message);
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
        <h3>Error de Inicialización</h3>
        <p>${message}</p>
        <p>Por favor, recargue la página y asegúrese de que:</p>
        <ul style="text-align: left; margin: 15px 0;">
          <li>Su cámara esté conectada y funcionando</li>
          <li>Haya otorgado permisos de cámara al navegador</li>
          <li>Esté usando un navegador compatible (Chrome, Firefox, Edge)</li>
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