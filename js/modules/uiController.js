/**
 * uiController.js
 * Controlador de interfaz de usuario para la presentacion.
 *
 * Maneja:
 *   - Navegacion entre secciones (slides)
 *   - Actualizacion del DOM en tiempo real
 *   - Animaciones CSS personalizadas
 *   - Manejo de inputs del usuario
 *   - Terminal simulada
 *
 * No contiene logica de negocio; solo manipula el DOM y delega
 * calculos a probabilityMath.js y simulacion a bruteForceSim.js.
 */

import {
  formatBigInt,
  toScientific,
  multiplicationHTML,
  calculateR,
  totalCombinations,
  singleAttemptProbability,
  accumulatedProbability,
  estimatedTimeFormatted,
  formatTimeFromSeconds,
  analyzePassword,
} from './probabilityMath.js';

// ==================== REFERENCIAS DOM ====================

/** Cache de elementos DOM para evitar busquedas repetidas */
const dom = {};

/**
 * Inicializa las referencias DOM.
 * Llamar despues de que el DOM este listo.
 */
export const initDOM = () => {
  // Navegacion
  dom.navLinks = document.querySelectorAll('.nav__link');
  dom.slides = document.querySelectorAll('.slide');
  dom.arrowNext = document.querySelectorAll('.slide__arrow--next');
  dom.arrowPrev = document.querySelectorAll('.slide__arrow--prev');

  // Seccion 1: Intro
  dom.weakPassword = document.getElementById('weakPassword');
  dom.strongPassword = document.getElementById('strongPassword');
  dom.weakResult = document.getElementById('weakResult');
  dom.strongResult = document.getElementById('strongResult');
  dom.btnEvaluate = document.getElementById('btnEvaluate');

  // Seccion 2: Vocabulario
  dom.pinLength = document.getElementById('pinLength');
  dom.pinLengthValue = document.getElementById('pinLengthValue');
  dom.multiplicationDisplay = document.getElementById('multiplicationDisplay');
  dom.totalCombinations = document.getElementById('totalCombinations');
  dom.formulaDisplay = document.getElementById('formulaDisplay');

  // Seccion 3: Formula
  dom.chkNumbers = document.getElementById('chkNumbers');
  dom.chkLower = document.getElementById('chkLower');
  dom.chkUpper = document.getElementById('chkUpper');
  dom.chkSymbols = document.getElementById('chkSymbols');
  dom.passwordLength = document.getElementById('passwordLength');
  dom.lengthSlider = document.getElementById('lengthSlider');
  dom.btnLengthMinus = document.getElementById('btnLengthMinus');
  dom.btnLengthPlus = document.getElementById('btnLengthPlus');
  dom.totalCombinationsFormula = document.getElementById('totalCombinationsFormula');
  dom.singleAttemptProb = document.getElementById('singleAttemptProb');
  dom.formulaDetail = document.getElementById('formulaDetail');
  dom.probDetail = document.getElementById('probDetail');
  dom.liveFormula = document.getElementById('liveFormula');

  // Seccion 4: Reglas
  dom.attemptsInput = document.getElementById('attemptsInput');
  dom.attemptSlider = document.getElementById('attemptSlider');
  dom.selectR = document.getElementById('selectR');
  dom.lengthForAccum = document.getElementById('lengthForAccum');
  dom.accumProgressBar = document.getElementById('accumProgressBar');
  dom.singleP = document.getElementById('singleP');
  dom.accumProbability = document.getElementById('accumProbability');
  dom.estimatedTime = document.getElementById('estimatedTime');
  dom.attackVelocity = document.getElementById('attackVelocity');
  dom.timeDisplay = document.getElementById('timeDisplay');

  // Seccion 5: Terminal
  dom.terminalBody = document.getElementById('terminalBody');
  dom.targetPassword = document.getElementById('targetPassword');
  dom.attackAlphabet = document.getElementById('attackAlphabet');
  dom.btnStartSim = document.getElementById('btnStartSim');
  dom.btnStopSim = document.getElementById('btnStopSim');
  dom.currentAttempts = document.getElementById('currentAttempts');
  dom.attemptsPerSec = document.getElementById('attemptsPerSec');
  dom.theoreticalAttempts = document.getElementById('theoreticalAttempts');
  dom.simStatus = document.getElementById('simStatus');
  dom.comparisonPanel = document.getElementById('comparisonPanel');
  dom.foundPassword = document.getElementById('foundPassword');
  dom.experimentalAttempts = document.getElementById('experimentalAttempts');
  dom.theoreticalFinal = document.getElementById('theoreticalFinal');
  dom.differenceValue = document.getElementById('differenceValue');

  // Seccion 6: Conclusion
  dom.btnRestart = document.getElementById('btnRestart');
};

// ==================== NAVEGACION ENTRE SLIDES ====================

let currentSlide = 0;
const totalSlides = 6;

/**
 * Navega a un slide especifico.
 *
 * @param {number} index - Indice del slide destino (0-5)
 */
export const goToSlide = (index) => {
  if (index < 0 || index >= totalSlides) return;

  const prevIndex = currentSlide;
  currentSlide = index;

  // Actualizar slides
  dom.slides.forEach((slide, i) => {
    slide.classList.remove('slide--active', 'slide--exit-left');

    if (i === index) {
      slide.classList.add('slide--active');
    } else if (i === prevIndex) {
      slide.classList.add('slide--exit-left');
    }
  });

  // Actualizar navegacion activa
  dom.navLinks.forEach((link, i) => {
    link.classList.toggle('active', i === index);
  });

  // Scroll al inicio
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Avanza al siguiente slide.
 */
export const nextSlide = () => {
  if (currentSlide < totalSlides - 1) {
    goToSlide(currentSlide + 1);
  }
};

/**
 * Retrocede al slide anterior.
 */
export const prevSlide = () => {
  if (currentSlide > 0) {
    goToSlide(currentSlide - 1);
  }
};

/**
 * Reinicia la presentacion al primer slide.
 */
export const restartPresentation = () => {
  goToSlide(0);
};

// ==================== SECCION 1: INTRO ====================

/**
 * Evalua las contrasenas de demostracion y muestra los resultados.
 */
export const evaluateDemoPasswords = () => {
  const weakAnalysis = analyzePassword(dom.weakPassword.value);
  const strongAnalysis = analyzePassword(dom.strongPassword.value);

  // Animar resultado debil
  dom.weakResult.innerHTML = `
    <span class="card__result-time" style="color: var(--neon-red);">
      ~${weakAnalysis.timeFormatted}
    </span>
  `;

  // Animar resultado fuerte
  dom.strongResult.innerHTML = `
    <span class="card__result-time" style="color: var(--neon-green);">
      ~${strongAnalysis.timeFormatted}
    </span>
  `;

  // Efecto de parpadeo
  dom.weakResult.style.animation = 'none';
  dom.strongResult.style.animation = 'none';
  void dom.weakResult.offsetWidth; // Trigger reflow
  dom.weakResult.style.animation = 'fadeInUp 0.5s ease';
  dom.strongResult.style.animation = 'fadeInUp 0.5s ease';
};

// ==================== SECCION 2: VOCABULARIO ====================

/**
 * Actualiza la visualizacion del espacio muestral segun el slider.
 */
export const updateVocabDisplay = () => {
  const L = parseInt(dom.pinLength.value, 10);
  const R = 10; // PIN numerico siempre R=10

  // Actualizar valor del slider
  dom.pinLengthValue.textContent = L;

  // Actualizar cadena de multiplicacion
  dom.multiplicationDisplay.innerHTML = `
    <div class="formula-display__main">
      <div class="multiplication-chain">
        ${multiplicationHTML(R, L)}
      </div>
    </div>
  `;

  // Actualizar resultado
  const combinations = totalCombinations(R, L);
  dom.totalCombinations.textContent = formatBigInt(combinations);
  dom.formulaDisplay.innerHTML = `${R}<sup>${L}</sup> = ${formatBigInt(combinations)}`;

  // Animar el valor
  dom.totalCombinations.style.animation = 'none';
  void dom.totalCombinations.offsetWidth;
  dom.totalCombinations.style.animation = 'pulseGlow 0.3s ease';
};

// ==================== SECCION 3: FORMULA ====================

/**
 * Actualiza los resultados de probabilidad en la seccion de formula.
 */
export const updateFormulaDisplay = () => {
  // Leer checkboxes
  const R = calculateR({
    digits: dom.chkNumbers.checked,
    lowercase: dom.chkLower.checked,
    uppercase: dom.chkUpper.checked,
    symbols: dom.chkSymbols.checked,
  });

  const L = parseInt(dom.passwordLength.value, 10);

  // Calcular
  const combinations = totalCombinations(R, L);
  const prob = singleAttemptProbability(R, L);

  // Actualizar DOM
  dom.totalCombinationsFormula.textContent = formatBigInt(combinations);
  const percentage = (prob * 100).toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
  dom.singleAttemptProb.textContent = `${percentage}%`;
  dom.formulaDetail.textContent = `R=${R}, L=${L}`;
  dom.probDetail.innerHTML = `1 / ${R}<sup>${L}</sup>`;
  dom.liveFormula.innerHTML = `P(acertar) = 1 / ${R}<sup>${L}</sup> = ${toScientific(prob)}`;

  // Animar
  dom.totalCombinationsFormula.style.animation = 'none';
  dom.singleAttemptProb.style.animation = 'none';
  void dom.totalCombinationsFormula.offsetWidth;
  dom.totalCombinationsFormula.style.animation = 'pulseGlow 0.3s ease';
  dom.singleAttemptProb.style.animation = 'pulseGlow 0.3s ease';
};

/**
 * Sincroniza el slider de longitud con el input numerico.
 */
export const syncLengthInputs = (source) => {
  if (source === 'slider') {
    dom.passwordLength.value = dom.lengthSlider.value;
  } else {
    dom.lengthSlider.value = dom.passwordLength.value;
  }
  updateFormulaDisplay();
};

// ==================== SECCION 4: REGLAS ====================

/**
 * Actualiza la barra de progreso y estadisticas acumuladas.
 */
export const updateAccumulatedDisplay = () => {
  const R = parseInt(dom.selectR.value, 10);
  const L = parseInt(dom.lengthForAccum.value, 10);
  const n = parseInt(dom.attemptsInput.value, 10);
  const V = parseInt(dom.attackVelocity.value, 10) || 1000;

  // Validar
  if (isNaN(n) || n < 1) return;

  // Calcular probabilidad acumulada
  const prob = singleAttemptProbability(R, L);
  const accumProb = accumulatedProbability(R, L, n);
  const timeStr = estimatedTimeFormatted(R, L);

  // Actualizar barra de progreso (0-100%)
  const percentage = Math.min(accumProb * 100, 100);
  dom.accumProgressBar.style.width = `${percentage}%`;

  // Cambiar color segun probabilidad
  if (percentage < 10) {
    dom.accumProgressBar.style.background = 'linear-gradient(90deg, #ff3366, #ff6b6b)';
  } else if (percentage < 50) {
    dom.accumProgressBar.style.background = 'linear-gradient(90deg, #ffd600, #ffaa00)';
  } else {
    dom.accumProgressBar.style.background = 'linear-gradient(90deg, #00ff88, #00e5ff)';
  }

  // Actualizar estadisticas
  dom.singleP.textContent = toScientific(prob);
  dom.accumProbability.textContent = `${(accumProb * 100).toFixed(4)}%`;
  dom.estimatedTime.textContent = timeStr;

  // Calcular tiempo con velocidad de ataque personalizada
  const totalCombinationsBigInt = totalCombinations(R, L);
  const timeSeconds = Number(totalCombinationsBigInt) / V;
  dom.timeDisplay.innerHTML = `Tiempo estimado: <strong>${formatTimeFromSeconds(timeSeconds)}</strong>`;

  // Sincronizar slider
  dom.attemptSlider.value = Math.min(n, dom.attemptSlider.max);
};

/**
 * Sincroniza el input de intentos con el slider.
 */
export const syncAttemptInputs = (source) => {
  if (source === 'slider') {
    dom.attemptsInput.value = dom.attemptSlider.value;
  } else {
    const val = parseInt(dom.attemptsInput.value, 10);
    if (val <= parseInt(dom.attemptSlider.max, 10)) {
      dom.attemptSlider.value = val;
    }
  }
  updateAccumulatedDisplay();
};

// ==================== SECCION 5: TERMINAL ====================

/**
 * Agrega una linea a la terminal simulada.
 *
 * @param {string} text - Texto a mostrar
 * @param {string} type - Tipo de linea: 'system', 'attempt', 'success', 'error'
 */
export const addTerminalLine = (text, type = 'system') => {
  const line = document.createElement('div');
  line.className = `terminal__line terminal__line--${type}`;
  line.innerHTML = `<span class="terminal__prompt">$</span> ${text}`;
  dom.terminalBody.appendChild(line);

  // Auto-scroll al final
  dom.terminalBody.scrollTop = dom.terminalBody.scrollHeight;

  // Limitar lineas visibles (mantener ultimas 100)
  const lines = dom.terminalBody.querySelectorAll('.terminal__line');
  if (lines.length > 100) {
    lines[0].remove();
  }
};

/**
 * Actualiza las estadisticas en vivo de la simulacion.
 *
 * @param {Object} stats - Estadisticas actuales
 */
export const updateSimStats = (stats) => {
  dom.currentAttempts.textContent = formatBigInt(stats.attempts);
  dom.attemptsPerSec.textContent = stats.speed.toLocaleString('es-ES');
  dom.theoreticalAttempts.textContent = formatBigInt(stats.theoreticalExpected);
};

/**
 * Actualiza el estado de la simulacion en la UI.
 *
 * @param {string} status - 'inactive', 'running', 'found', 'stopped'
 */
export const updateSimStatus = (status) => {
  const statusText = {
    inactive: 'Inactivo',
    running: 'Ejecutando...',
    found: 'Encontrada!',
    stopped: 'Detenido',
  };

  dom.simStatus.textContent = statusText[status] || status;

  // Colores
  const colors = {
    inactive: 'var(--text-secondary)',
    running: 'var(--neon-yellow)',
    found: 'var(--neon-green)',
    stopped: 'var(--neon-red)',
  };

  dom.simStatus.style.color = colors[status] || 'var(--text-secondary)';
};

/**
 * Muestra el panel de comparacion final.
 *
 * @param {Object} result - Resultado de la simulacion
 */
export const showComparison = (result) => {
  dom.comparisonPanel.style.display = 'block';
  dom.foundPassword.textContent = result.password;
  dom.experimentalAttempts.textContent = result.attempts.toLocaleString('es-ES');
  dom.theoreticalFinal.textContent = Number(result.theoreticalExpected).toLocaleString('es-ES');
  dom.differenceValue.textContent = result.difference.toLocaleString('es-ES');

  // Animar entrada
  dom.comparisonPanel.style.animation = 'fadeInUp 0.5s ease';
};

/**
 * Limpia la terminal y muestra mensaje de inicio.
 */
export const clearTerminal = () => {
  dom.terminalBody.innerHTML = `
    <div class="terminal__line terminal__line--system">
      <span class="terminal__prompt">$</span> Terminal de fuerza bruta inicializada...
    </div>
    <div class="terminal__line terminal__line--system">
      <span class="terminal__prompt">$</span> Configure los parametros y presione "Iniciar Simulacion"
    </div>
  `;
};

/**
 * Configura el estado de los botones de simulacion.
 *
 * @param {boolean} running - Si la simulacion esta activa
 */
export const setSimButtonsState = (running) => {
  dom.btnStartSim.disabled = running;
  dom.btnStopSim.disabled = !running;
};

// ==================== ANIMACIONES ====================

/**
 * Inyecta estilos de animacion CSS dinamicamente.
 */
export const injectAnimations = () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulseGlow {
      0% {
        transform: scale(1);
        text-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
      }
      50% {
        transform: scale(1.02);
        text-shadow: 0 0 40px rgba(0, 255, 136, 0.6);
      }
      100% {
        transform: scale(1);
        text-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
      }
    }

    @keyframes terminalBlink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    .terminal__cursor {
      display: inline-block;
      width: 8px;
      height: 1em;
      background: var(--neon-green);
      margin-left: 2px;
      animation: terminalBlink 1s infinite;
    }
  `;
  document.head.appendChild(style);
};

// ==================== EXPORTACIONES DE DOM ====================

/**
 * Retorna las referencias DOM para uso externo.
 * @returns {Object}
 */
export const getDom = () => dom;
