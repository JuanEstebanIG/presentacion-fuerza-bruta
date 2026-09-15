/**
 * main.js
 * Archivo principal que orquesta la inicializacion y navegacion
 * de la presentacion interactiva sobre probabilidad y fuerza bruta.
 *
 * Responsabilidades:
 *   - Inicializar el controlador de UI y el DOM
 *   - Configurar event listeners para navegacion
 *   - Conectar inputs del usuario con los modulos de calculo
 *   - Gestionar la simulacion de fuerza bruta
 *   - Coordinar actualizaciones en tiempo real
 *
 * Arquitectura:
 *   main.js (este archivo) -> orquestador
 *   js/modules/probabilityMath.js -> logica matematica pura
 *   js/modules/bruteForceSim.js -> simulacion async
 *   js/modules/uiController.js -> manipulacion del DOM
 */

import {
  initDOM,
  goToSlide,
  nextSlide,
  prevSlide,
  restartPresentation,
  evaluateDemoPasswords,
  updateVocabDisplay,
  updateFormulaDisplay,
  syncLengthInputs,
  updateAccumulatedDisplay,
  syncAttemptInputs,
  addTerminalLine,
  updateSimStats,
  updateSimStatus,
  showComparison,
  clearTerminal,
  setSimButtonsState,
  injectAnimations,
  getDom,
} from './modules/uiController.js';

import { BruteForceSim } from './modules/bruteForceSim.js';
import { formatBigInt, totalCombinations, expectedAttempts } from './modules/probabilityMath.js';

// ==================== INSTANCIA DE SIMULACION ====================

let simulation = null;

// ==================== INICIALIZACION ====================

/**
 * Inicializa toda la aplicacion cuando el DOM esta listo.
 */
const init = () => {
  console.log('[Main] Inicializando presentacion...');

  // Inyectar animaciones CSS
  injectAnimations();

  // Inicializar referencias DOM
  initDOM();
  const dom = getDom();

  // ==================== EVENT LISTENERS: NAVEGACION ====================

  // Flechas de navegacion entre slides
  dom.arrowNext.forEach((arrow) => {
    arrow.addEventListener('click', nextSlide);
  });

  dom.arrowPrev.forEach((arrow) => {
    arrow.addEventListener('click', prevSlide);
  });

  // Links de navegacion superior
  dom.navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionIndex = parseInt(link.dataset.section, 10);
      goToSlide(sectionIndex);
    });
  });

  // Teclado para navegacion
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prevSlide();
    }
  });

  // ==================== EVENT LISTENERS: SECCION 1 (INTRO) ====================

  dom.btnEvaluate.addEventListener('click', () => {
    evaluateDemoPasswords();
  });

  // ==================== EVENT LISTENERS: SECCION 2 (VOCABULARIO) ====================

  dom.pinLength.addEventListener('input', updateVocabDisplay);

  // ==================== EVENT LISTENERS: SECCION 3 (FORMULA) ====================

  // Checkboxes de alfabeto
  [dom.chkNumbers, dom.chkLower, dom.chkUpper, dom.chkSymbols].forEach((chk) => {
    chk.addEventListener('change', updateFormulaDisplay);
  });

  // Slider y input de longitud
  dom.passwordLength.addEventListener('input', () => syncLengthInputs('input'));
  dom.lengthSlider.addEventListener('input', () => syncLengthInputs('slider'));

  // Botones +/- de longitud
  dom.btnLengthMinus.addEventListener('click', () => {
    const current = parseInt(dom.passwordLength.value, 10);
    if (current > 1) {
      dom.passwordLength.value = current - 1;
      syncLengthInputs('input');
    }
  });

  dom.btnLengthPlus.addEventListener('click', () => {
    const current = parseInt(dom.passwordLength.value, 10);
    if (current < 64) {
      dom.passwordLength.value = current + 1;
      syncLengthInputs('input');
    }
  });

  // ==================== EVENT LISTENERS: SECCION 4 (REGLAS) ====================

  dom.attemptsInput.addEventListener('input', () => syncAttemptInputs('input'));
  dom.attemptSlider.addEventListener('input', () => syncAttemptInputs('slider'));
  dom.selectR.addEventListener('change', updateAccumulatedDisplay);
  dom.lengthForAccum.addEventListener('input', updateAccumulatedDisplay);

  // ==================== EVENT LISTENERS: SECCION 5 (SIMULADOR) ====================

  // Boton iniciar simulacion
  dom.btnStartSim.addEventListener('click', startSimulation);

  // Boton detener simulacion
  dom.btnStopSim.addEventListener('click', stopSimulation);

  // ==================== EVENT LISTENERS: SECCION 6 (CONCLUSION) ====================

  dom.btnRestart.addEventListener('click', () => {
    restartPresentation();
  });

  // ==================== INICIALIZAR DISPLAYS ====================

  // Actualizar todas las secciones con valores iniciales
  updateVocabDisplay();
  updateFormulaDisplay();
  updateAccumulatedDisplay();

  console.log('[Main] Presentacion inicializada correctamente');
};

// ==================== SIMULACION ====================

/**
 * Inicia la simulacion de fuerza bruta.
 */
function startSimulation() {
  const dom = getDom();

  // Obtener parametros
  const target = dom.targetPassword.value.trim();
  const alphabetSize = parseInt(dom.attackAlphabet.value, 10);

  // Validar contrasena
  if (!target) {
    addTerminalLine('Error: Ingrese una contrasena objetivo', 'error');
    return;
  }

  if (target.length > 4) {
    addTerminalLine('Advertencia: Contrasenas mayores a 4 caracteres pueden ser lentas', 'error');
  }

  // Verificar caracteres validos
  const allChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?';
  const validChars = allChars.slice(0, alphabetSize);
  for (const char of target) {
    if (!validChars.includes(char)) {
      addTerminalLine(
        `Error: El caracter "${char}" no esta en el alfabeto seleccionado`,
        'error'
      );
      return;
    }
  }

  // Limpiar terminal
  clearTerminal();
  addTerminalLine(`Iniciando ataque de fuerza bruta...`, 'system');
  addTerminalLine(`Objetivo: <span class="terminal__highlight">${target}</span>`, 'system');
  addTerminalLine(`Alfabeto: ${alphabetSize} caracteres`, 'system');
  addTerminalLine(
    `Combinaciones totales: ${formatBigInt(totalCombinations(alphabetSize, target.length))}`,
    'system'
  );
  addTerminalLine(
    `Intentos esperados (teorico): ${formatBigInt(expectedAttempts(alphabetSize, target.length))}`,
    'system'
  );
  addTerminalLine('---', 'system');

  // Configurar UI
  setSimButtonsState(true);
  updateSimStatus('running');
  dom.comparisonPanel.style.display = 'none';

  // Crear instancia de simulacion
  simulation = new BruteForceSim({
    target,
    alphabetSize,
    chunkSize: 5000,

    // Callback cada 100 intentos
    onAttempt: (data) => {
      updateSimStats(data);
      // Mostrar algunos intentos en la terminal (no todos para no saturar)
      if (data.attempts % 1000 === 0) {
        addTerminalLine(
          `Intento #${data.attempts.toLocaleString('es-ES')}: probando "${data.currentGuess}"`,
          'attempt'
        );
      }
    },

    // Callback cuando encuentra la contrasena
    onFound: (data) => {
      addTerminalLine('---', 'system');
      addTerminalLine(
        `Contrasena encontrada: <span class="terminal__highlight">${data.password}</span>`,
        'success'
      );
      addTerminalLine(`Intentos necesarios: ${data.attempts.toLocaleString('es-ES')}`, 'success');
      addTerminalLine(`Tiempo: ${(data.elapsed / 1000).toFixed(2)}s`, 'success');
      addTerminalLine(`Velocidad promedio: ${data.speed.toLocaleString('es-ES')} intentos/s`, 'success');

      updateSimStatus('found');
      setSimButtonsState(false);
      updateSimStats(data);
      showComparison(data);
    },

    // Callback al completar
    onComplete: (stats) => {
      if (!stats.found) {
        addTerminalLine('Simulacion detenida', 'error');
        updateSimStatus('stopped');
      }
      setSimButtonsState(false);
    },

    // Callback de error
    onError: (error) => {
      addTerminalLine(`Error: ${error.message}`, 'error');
      updateSimStatus('inactive');
      setSimButtonsState(false);
    },
  });

  // Iniciar (async)
  simulation.start().catch((err) => {
    console.error('[Main] Error en simulacion:', err);
  });
}

/**
 * Detiene la simulacion actual.
 */
function stopSimulation() {
  if (simulation && simulation.isRunning) {
    const stats = simulation.stop();
    addTerminalLine(`Simulacion detenida manualmente`, 'error');
    addTerminalLine(`Intentos realizados: ${stats.attempts.toLocaleString('es-ES')}`, 'system');
    updateSimStatus('stopped');
    setSimButtonsState(false);
  }
}

// ==================== ARRANQUE ====================

// Esperar a que el DOM este completamente cargado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
