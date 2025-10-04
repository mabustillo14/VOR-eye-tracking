// Metrics calculation and tracking
class MetricsCalculator {
  constructor() {
    this.initializeMetricsUI();
  }

  initializeMetricsUI() {
    const metricsDiv = document.getElementById('metrics');
    metricsDiv.innerHTML = `
      <div><strong>Real-time Metrics</strong></div>
      <div class="small">Head angular vel: <span id="headVel">-</span> °/s</div>
      <div class="small">Eye (gaze) vel: <span id="eyeVel">-</span> px/s</div>
      <div class="small">VOR gain (approx): <span id="vorGain">-</span></div>
      <div class="small">Latency est.: <span id="latency">-</span> ms</div>
      <div class="small">Fixation stability (RMS): <span id="fixRMS">-</span></div>
      <div class="small">Saccades counted: <span id="saccCount">0</span></div>
      <div class="small">Frames recorded: <span id="frames">0</span></div>
    `;
  }

  calculateHeadAngle(fmPositions, whr) {
    try {
      const nosePt = fmPositions[1] || fmPositions[4];
      const left = fmPositions[33] || fmPositions[145];
      const right = fmPositions[263] || fmPositions[374];
      
      if (nosePt && left && right) {
        const nx = CONFIG.PREVIEW_WIDTH - nosePt[0] * whr[0];
        const ny = nosePt[1] * whr[1];
        const lx = CONFIG.PREVIEW_WIDTH - left[0] * whr[0];
        const rx = CONFIG.PREVIEW_WIDTH - right[0] * whr[0];
        
        const midEyesX = (lx + rx) / 2;
        const midEyesY = ((left[1] + right[1]) / 2) * whr[1];
        
        const vx = nx - midEyesX;
        const vy = ny - midEyesY;
        
        return Math.atan2(vx, vy) * 180 / Math.PI;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  calculateVelocities(gaze, headAngle, t) {
    let headVel = 0;
    let eyeVel = 0;

    if (STATE.lastTimestamp !== null) {
      const dt = (t - STATE.lastTimestamp) / 1000.0;
      
      if (headAngle !== null && STATE.lastHeadAngle !== null && dt > 0) {
        headVel = (headAngle - STATE.lastHeadAngle) / dt;
      }
      
      if (STATE.lastGaze !== null) {
        const dx = gaze.x - STATE.lastGaze.x;
        const dy = gaze.y - STATE.lastGaze.y;
        eyeVel = Math.sqrt(dx * dx + dy * dy) / dt;
      }
    }

    return { headVel, eyeVel };
  }

  updateLatencyEstimates(headVel, eyeVel, t) {
    // Record head movement events
    if (Math.abs(headVel) > CONFIG.HEAD_VEL_THRESHOLD && STATE.lastTimestamp !== null) {
      STATE.latencyEstimates.push({
        tHead: t,
        headVel: headVel,
        responded: false
      });
    }

    // Check for eye movement responses
    for (let ev of STATE.latencyEstimates) {
      if (!ev.responded && Math.abs(eyeVel) > CONFIG.EYE_VEL_THRESHOLD) {
        ev.responded = true;
        ev.tRespond = t;
        ev.latencyMs = ev.tRespond - ev.tHead;
      }
    }
  }

  updateSaccadeCount(eyeVel) {
    if (eyeVel > CONFIG.SACCADE_VEL_THRESHOLD) {
      STATE.saccCount++;
      document.getElementById('saccCount').innerText = STATE.saccCount;
    }
  }

  calculateFixationStability(gaze, t) {
    STATE.fixPositions.push({ x: gaze.x, y: gaze.y, t: t });
    
    const cutoff = t - CONFIG.SAMPLE_WINDOW_MS;
    STATE.fixPositions = STATE.fixPositions.filter(p => p.t >= cutoff);
    
    const xs = STATE.fixPositions.map(p => p.x - UTILS.mean(STATE.fixPositions.map(q => q.x)));
    const ys = STATE.fixPositions.map(p => p.y - UTILS.mean(STATE.fixPositions.map(q => q.y)));
    
    return UTILS.rms(xs.concat(ys));
  }

  calculateVORGain(eyeVel, headVel) {
    if (Math.abs(headVel) > CONFIG.MIN_HEAD_VEL_FOR_GAIN) {
      return Math.abs(eyeVel) / Math.abs(headVel);
    }
    return null;
  }

  updateUI(headVel, eyeVel, vorGain, rmsVal) {
    document.getElementById('headVel').innerText = headVel ? headVel.toFixed(1) : '-';
    document.getElementById('eyeVel').innerText = eyeVel ? Math.round(eyeVel) : '-';
    document.getElementById('vorGain').innerText = vorGain ? vorGain.toFixed(2) : '-';
    
    const latSamples = STATE.latencyEstimates.filter(e => e.latencyMs).map(e => e.latencyMs);
    document.getElementById('latency').innerText = latSamples.length ? Math.round(UTILS.mean(latSamples)) + ' ms' : '-';
    document.getElementById('fixRMS').innerText = rmsVal ? Math.round(rmsVal) + ' px' : '-';
  }

  recordData(t, gaze, headAngle, headVel, eyeVel, vorGain) {
    if (STATE.sessionActive) {
      const latSamples = STATE.latencyEstimates.filter(e => e.latencyMs).map(e => e.latencyMs);
      
      STATE.recorded.push({
        t: t,
        level: STATE.currentLevel,
        gazeX: gaze.x,
        gazeY: gaze.y,
        headAngle: headAngle,
        headVel: headVel,
        eyeVel: eyeVel,
        vorGain: vorGain,
        latencySamples: latSamples.slice(-5)
      });
      
      document.getElementById('btnExport').disabled = false;
    }
  }
}

// Global metrics calculator instance
const metricsCalculator = new MetricsCalculator();