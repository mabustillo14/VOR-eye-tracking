# Sistema de Entrenamiento VOR con Eye Tracking

Sistema web para entrenamiento y análisis del Reflejo Vestíbulo-Ocular (VOR) utilizando tecnología de seguimiento ocular.

Desarrollado por [**Mario Bustillo**](https://www.linkedin.com/in/mario-bustillo/)

## Descripción

El Reflejo Vestíbulo-Ocular (VOR) es un mecanismo neurológico que estabiliza la mirada durante movimientos de cabeza, permitiendo mantener la fijación visual en un objetivo. Este sistema proporciona un entorno de entrenamiento progresivo con 5 niveles de dificultad y análisis de métricas en tiempo real. 

## Características Principales

- **5 Niveles Progresivos**: Desde fijación básica hasta patrones complejos
- **Calibración Precisa**: Sistema de 9 puntos con cálculo de precisión
- **Métricas en Tiempo Real**: Análisis de coordinación ojo-cabeza
- **Exportación de Datos**: Formato CSV para análisis posterior
- **Interfaz Responsiva**: Compatible con diferentes dispositivos
- **Verificación de Sistema**: Comprobación automática de compatibilidad

## Arquitectura Técnica

### Estructura del Proyecto

```
VOR-eye-tracking/
├── index.html              # Interfaz principal
├── styles/
│   └── main.css           # Estilos y animaciones
├── js/
│   ├── main.js            # Controlador principal
│   ├── config.js          # Configuración y estado global
│   ├── startup.js         # Verificación de sistema
│   ├── calibration.js     # Sistema de calibración
│   ├── levels.js          # Gestión de niveles
│   ├── metrics.js         # Cálculo de métricas VOR
│   ├── visualization.js   # Visualización de mirada
│   └── audio.js           # Sistema de audio
└── README.md
```

### Tecnologías Utilizadas

- **EyeGestures**: Biblioteca de eye tracking moderna y eficiente
- **Web Audio API**: Efectos sonoros y retroalimentación
- **Canvas API**: Visualización de datos de mirada
- **LocalForage**: Almacenamiento local de configuraciones
- **CSS3**: Animaciones y diseño responsivo

## Funcionamiento del Eye Tracking

### EyeGestures

EyeGestures utiliza la cámara web del usuario para realizar seguimiento ocular sin hardware especializado:

#### 1. Detección Facial
- **Algoritmos avanzados**: Detecta puntos faciales clave
- **MediaPipe**: Identifica landmarks oculares específicos
- **468 puntos faciales**: Mapeo detallado de características

#### 2. Estimación de Mirada
- **Algoritmos de ML**: Aprendizaje automático optimizado
- **Calibración**: Mapeo entre posición ocular y coordenadas de pantalla
- **Suavizado**: Filtrado de predicciones

#### 3. Proceso de Calibración
```javascript
// Registro de posición durante calibración
await eyeGestures.addCalibrationPoint(targetX, targetY);

// Obtención de predicción
const prediction = eyeGestures.getGazePrediction();
// Retorna: { x: number, y: number }
```

#### 4. Cálculo de Precisión
```javascript
// Distancia euclidiana entre objetivo y predicción
const distance = Math.sqrt(
  Math.pow(prediction.x - targetX, 2) + 
  Math.pow(prediction.y - targetY, 2)
);

// Precisión normalizada por diagonal de pantalla
const precision = (1 - (avgDistance / screenDiagonal)) * 100;
```

## Métricas VOR Calculadas

### 1. Velocidad Angular de Cabeza
```javascript
headVel = (currentAngle - lastAngle) / deltaTime; // °/s
```

### 2. Velocidad de Mirada
```javascript
eyeVel = Math.sqrt(dx² + dy²) / deltaTime; // px/s
```

### 3. Ganancia VOR
```javascript
vorGain = Math.abs(eyeVel) / Math.abs(headVel);
// Valor ideal ≈ 1.0 (compensación perfecta)
```

### 4. Latencia VOR
- Tiempo entre movimiento de cabeza y respuesta ocular
- Detección de picos de velocidad
- Correlación temporal

### 5. Estabilidad de Fijación
```javascript
// RMS de desviaciones en ventana temporal
rms = Math.sqrt(mean(deviations.map(d => d²)));
```

### 6. Coeficiente de Precisión
```javascript
// Basado en distancia al objetivo
accuracy = (1 - (distance / screenDiagonal)) * 100;
```

## Niveles de Entrenamiento

### Nivel 1: Fijación Básica
- **Objetivo**: Estático en centro
- **Tarea**: Mantener mirada fija con movimiento lento de cabeza
- **Duración**: 30 segundos

### Nivel 2: Movimiento Horizontal
- **Objetivo**: Movimiento sinusoidal horizontal
- **Tarea**: Seguimiento ocular y estabilización
- **Duración**: 45 segundos

### Nivel 3: Movimiento Vertical
- **Objetivo**: Movimiento sinusoidal vertical
- **Tarea**: Coordinación vertical ojo-cabeza
- **Duración**: 45 segundos

### Nivel 4: Movimiento Diagonal
- **Objetivo**: Patrón circular/elíptico
- **Tarea**: Coordinación multi-eje
- **Duración**: 60 segundos

### Nivel 5: Patrones Complejos
- **Objetivo**: Movimientos impredecibles
- **Tarea**: Adaptación avanzada VOR
- **Duración**: 90 segundos

## Formato de Datos Exportados

### Estructura CSV
```csv
timestamp,nivel,nombreNivel,objetivoX,objetivoY,miradaX,miradaY,
distanciaObjetivo,coeficientePrecision,anguloCabeza,velocidadCabeza,
velocidadOjo,gananciaVOR,latenciaPromedio,estabilidadRMS,conteoSacadas
```

### Descripción de Campos
- **timestamp**: Tiempo en milisegundos
- **nivel**: Número de nivel (1-5)
- **objetivoX/Y**: Posición del objetivo en píxeles
- **miradaX/Y**: Posición estimada de mirada
- **distanciaObjetivo**: Distancia euclidiana al objetivo
- **coeficientePrecision**: Precisión normalizada (0-100)
- **anguloCabeza**: Ángulo estimado de cabeza en grados
- **velocidadCabeza**: Velocidad angular en °/s
- **velocidadOjo**: Velocidad de mirada en px/s
- **gananciaVOR**: Ratio eyeVel/headVel
- **latenciaPromedio**: Latencia VOR en ms
- **estabilidadRMS**: RMS de fijación en píxeles

## Requisitos del Sistema

### Navegadores Compatibles
- **Chrome**: Recomendado (mejor rendimiento)
- **Firefox**: Compatible
- **Edge**: Compatible
- **Safari**: Limitado

### Hardware Mínimo
- **Cámara web**: 720p o superior
- **Resolución**: 1024x768 mínimo

### Condiciones Ambientales
- **Iluminación**: Uniforme, sin sombras en rostro
- **Distancia**: 60-80cm de la pantalla
- **Posición**: Rostro centrado en cámara
- **Estabilidad**: Evitar movimientos bruscos

## Instalación y Uso

### Flujo de Uso
1. **Verificación**: Sistema comprueba compatibilidad
2. **Introducción**: Explicación del proyecto
3. **Calibración**: 9 puntos + cálculo de precisión
4. **Selección**: Elegir nivel de entrenamiento
5. **Entrenamiento**: Realizar ejercicio
6. **Análisis**: Exportar datos para estudio

## Consideraciones Técnicas

### Precisión del Eye Tracking
- **Precisión típica**: 60-80% en condiciones óptimas
- **Factores limitantes**: Iluminación, calibración, hardware
- **Mejoras**: Recalibración periódica, condiciones controladas

### Limitaciones
- **Dependiente de cámara**: Calidad afecta precisión
- **Procesamiento local**: Requiere recursos computacionales
- **Calibración individual**: Necesaria para cada usuario
- **Condiciones ambientales**: Sensible a cambios de luz

### Optimizaciones
- **Filtro Kalman**: Suavizado de predicciones
- **Muestreo adaptativo**: Ajuste según rendimiento
- **Caché de modelos**: Reutilización de calibraciones
- **Detección de calidad**: Validación automática

## Aplicaciones Clínicas

### Evaluación VOR
- **Ganancia**: Eficiencia del reflejo
- **Latencia**: Tiempo de respuesta
- **Estabilidad**: Calidad de fijación

### Rehabilitación
- **Entrenamiento progresivo**: Niveles adaptativos
- **Seguimiento**: Métricas longitudinales
- **Personalización**: Ajuste por condición

### Investigación
- **Datos cuantitativos**: Análisis estadístico
- **Protocolos estandarizados**: Reproducibilidad
- **Exportación**: Integración con herramientas
