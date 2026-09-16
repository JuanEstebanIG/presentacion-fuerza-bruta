/**
 * bruteForceSim.js
 * Simulador de ataque por fuerza bruta con asincronia no bloqueante.
 *
 * Utiliza async/await con yield periods para mantener la UI responsiva
 * durante la simulacion. El algoritmo prueba combinaciones aleatorias
 * hasta encontrar la contrasena objetivo.
 *
 * Caracteristicas:
 *   - Ejecucion no bloqueante via requestAnimationFrame + chunked processing
 *   - Callbacks en tiempo real para actualizar la UI
 *   - Control de velocidad (intentos por frame)
 *   - Soporte para detener la simulacion en cualquier momento
 *   - Estadisticas en vivo: intentos, velocidad, progreso
 */

import {
  totalCombinations,
  expectedAttempts,
  formatBigInt,
  calculateR,
} from './probabilityMath.js';

// ==================== CONSTANTES ====================

/** Velocidad por defecto: intentos procesados por frame */
const DEFAULT_CHUNK_SIZE = 5000;

/** Tiempo maximo entre yields para mantener UI responsiva (ms) */
const YIELD_INTERVAL_MS = 16; // ~60fps

// ==================== GENERADOR DE CARACTERES ====================

/**
 * Retorna el string de caracteres disponibles segun el tipo de alfabeto.
 *
 * @param {number} alphabetSize - Tamano del alfabeto (10, 26, 36, 62, 95)
 * @returns {string} String con todos los caracteres posibles
 *
 * @example
 *   getAlphabetChars(10)  // "0123456789"
 *   getAlphabetChars(26)  // "abcdefghijklmnopqrstuvwxyz"
 */
const getAlphabetChars = (alphabetSize) => {
  const allChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?';
  return allChars.slice(0, alphabetSize);
};

// ==================== GENERADOR ALEATORIO ====================

/**
 * Genera una contrasena aleatoria de longitud L usando el alfabeto dado.
 *
 * @param {string} alphabet - String con los caracteres disponibles
 * @param {number} L - Longitud de la contrasena a generar
 * @returns {string} Contrasena aleatoria
 */
const generateRandomPassword = (alphabet, L) => {
  let result = '';
  const len = alphabet.length;
  for (let i = 0; i < L; i++) {
    result += alphabet[Math.floor(Math.random() * len)];
  }
  return result;
};

// ==================== UTILIDADES DE ASINCRONIA ====================

/**
 * Yield al event loop para mantener la UI responsiva.
 * Usa requestAnimationFrame cuando esta disponible, fallback a setTimeout.
 *
 * @returns {Promise<void>}
 */
const yieldToUI = () => {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, YIELD_INTERVAL_MS);
    }
  });
};

/**
 * Espera un numero especifico de milisegundos.
 *
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==================== CLASE PRINCIPAL ====================

/**
 * BruteForceSim - Simulador de fuerza bruta
 *
 * @class
 * @example
 *   const sim = new BruteForceSim({
 *     target: 'abc',
 *     alphabetSize: 26,
 *     onAttempt: (data) => console.log(data),
 *     onFound: (data) => console.log('Found!', data),
 *   });
 *   await sim.start();
 */
export class BruteForceSim {
  /**
   * @param {Object} config - Configuracion de la simulacion
   * @param {string} config.target - Contrasena objetivo a encontrar
   * @param {number} config.alphabetSize - Tamano del alfabeto de ataque
   * @param {Function} [config.onAttempt] - Callback en cada intento
   * @param {Function} [config.onFound] - Callback cuando encuentra la contrasena
   * @param {Function} [config.onComplete] - Callback al finalizar
   * @param {Function} [config.onError] - Callback en caso de error
   * @param {number} [config.chunkSize] - Intentos por frame (velocidad)
   */
  constructor(config) {
    this.target = config.target;
    this.alphabetSize = config.alphabetSize || 26;
    this.onAttempt = config.onAttempt || (() => {});
    this.onFound = config.onFound || (() => {});
    this.onComplete = config.onComplete || (() => {});
    this.onError = config.onError || (() => {});

    // Chunk size controla la velocidad: mas alto = mas rapido pero menos responsivo
    this.chunkSize = config.chunkSize || DEFAULT_CHUNK_SIZE;

    // Estado interno
    this._isRunning = false;
    this._isPaused = false;
    this._abortController = null;
    this._attempts = 0;
    this._startTime = 0;
    this._alphabet = getAlphabetChars(this.alphabetSize);
    this._found = false;
    this._foundPassword = null;

    // Calculos teoricos pre-computados
    this._theoreticalTotal = totalCombinations(this.alphabetSize, this.target.length);
    this._theoreticalExpected = this._theoreticalTotal;
  }

  /**
   * Retorna si la simulacion esta corriendo actualmente.
   * @returns {boolean}
   */
  get isRunning() {
    return this._isRunning;
  }

  /**
   * Retorna el numero actual de intentos realizados.
   * @returns {number}
   */
  get attempts() {
    return this._attempts;
  }

  /**
   * Retorna el tiempo transcurrido en milisegundos.
   * @returns {number}
   */
  get elapsed() {
    if (!this._startTime) return 0;
    return Date.now() - this._startTime;
  }

  /**
   * Retorna la velocidad actual en intentos por segundo.
   * @returns {number}
   */
  get speed() {
    const elapsed = this.elapsed;
    if (elapsed === 0) return 0;
    return Math.round((this._attempts / elapsed) * 1000);
  }

  /**
   * Retorna un objeto con todas las estadisticas actuales.
   * @returns {Object}
   */
  get stats() {
    return {
      attempts: this._attempts,
      elapsed: this.elapsed,
      speed: this.speed,
      theoreticalTotal: this._theoreticalTotal,
      theoreticalExpected: this._theoreticalExpected,
      found: this._found,
      foundPassword: this._foundPassword,
      isRunning: this._isRunning,
    };
  }

  /**
   * Inicia la simulacion de fuerza bruta.
   * Prueba combinaciones aleatorias hasta encontrar la contrasena.
   *
   * @returns {Promise<Object>} Estadisticas finales cuando encuentra o se detiene
   */
  async start() {
    if (this._isRunning) {
      console.warn('La simulacion ya esta corriendo');
      return this.stats;
    }

    // Resetear estado
    this._isRunning = true;
    this._isPaused = false;
    this._attempts = 0;
    this._found = false;
    this._foundPassword = null;
    this._startTime = Date.now();
    this._abortController = new AbortController();

    const { signal } = this._abortController;

    try {
      // Verificar que la contrasena objetivo sea alcanzable
      const targetChars = new Set(this.target);
      const alphabetChars = new Set(this._alphabet);
      for (const char of targetChars) {
        if (!alphabetChars.has(char)) {
          throw new Error(
            `El caracter "${char}" no esta en el alfabeto seleccionado (tamano: ${this.alphabetSize})`
          );
        }
      }

      console.log(`[BruteForce] Iniciando simulacion:`);
      console.log(`  Objetivo: "${this.target}" (${this.target.length} caracteres)`);
      console.log(`  Alfabeto: ${this.alphabetSize} caracteres`);
      console.log(`  Combinaciones totales: ${formatBigInt(this._theoreticalTotal)}`);
      console.log(`  Intentos esperados: ${formatBigInt(this._theoreticalExpected)}`);

      // Bucle principal de simulacion
      while (!this._found && !signal.aborted) {
        // Procesar un chunk de intentos antes de yield
        for (let i = 0; i < this.chunkSize && !this._found && !signal.aborted; i++) {
          this._attempts++;

          // Generar intento aleatorio
          const guess = generateRandomPassword(this._alphabet, this.target.length);

          // Verificar si encontro la contrasena
          if (guess === this.target) {
            this._found = true;
            this._foundPassword = guess;

            // Calcular estadisticas finales
            const elapsed = this.elapsed;
            const speed = this.speed;

            console.log(`[BruteForce] Contrasena encontrada!`);
            console.log(`  Intentos: ${this._attempts}`);
            console.log(`  Tiempo: ${(elapsed / 1000).toFixed(2)}s`);
            console.log(`  Velocidad promedio: ${speed} intentos/s`);

            // Notificar hallazgo
            this.onFound({
              password: this.target,
              attempts: this._attempts,
              elapsed,
              speed,
              theoreticalExpected: this._theoreticalExpected,
              difference: Math.abs(this._attempts - Number(this._theoreticalExpected)),
            });

            break;
          }

          // Notificar progreso (cada cierto numero de intentos para no saturar)
          if (this._attempts % 100 === 0) {
            this.onAttempt({
              attempts: this._attempts,
              elapsed: this.elapsed,
              speed: this.speed,
              currentGuess: guess,
              theoreticalExpected: this._theoreticalExpected,
            });
          }
        }

        // Yield al event loop para mantener UI responsiva
        await yieldToUI();
      }

      // Finalizar
      this._isRunning = false;

      const finalStats = this.stats;
      this.onComplete(finalStats);

      return finalStats;

    } catch (error) {
      this._isRunning = false;
      this.onError(error);
      throw error;
    }
  }

  /**
   * Detiene la simulacion actual.
   * Puede ser llamado en cualquier momento durante la ejecucion.
   *
   * @returns {Object} Estadisticas al momento de detener
   */
  stop() {
    if (!this._isRunning) return this.stats;

    this._abortController?.abort();
    this._isRunning = false;

    const stats = this.stats;
    console.log(`[BruteForce] Simulacion detenida手动mente`);
    console.log(`  Intentos realizados: ${stats.attempts}`);

    return stats;
  }

  /**
   * Pausa la simulacion (usa busy-wait, solo para demostracion).
   * En produccion se usaria un mecanismo mas elegante.
   */
  pause() {
    this._isPaused = true;
  }

  /**
   * Reanuda la simulacion pausada.
   */
  resume() {
    this._isPaused = false;
  }

  /**
   * Reinicia la simulacion con nuevos parametros.
   *
   * @param {Object} newConfig - Nuevos parametros opcionales
   */
  reset(newConfig = {}) {
    if (this._isRunning) {
      this.stop();
    }

    if (newConfig.target) this.target = newConfig.target;
    if (newConfig.alphabetSize) {
      this.alphabetSize = newConfig.alphabetSize;
      this._alphabet = getAlphabetChars(this.alphabetSize);
    }
    if (newConfig.chunkSize) this.chunkSize = newConfig.chunkSize;

    // Recalcular teoria
    this._theoreticalTotal = totalCombinations(this.alphabetSize, this.target.length);
    this._theoreticalExpected = this._theoreticalTotal;

    // Resetear contadores
    this._attempts = 0;
    this._found = false;
    this._foundPassword = null;
    this._startTime = 0;
  }
}

// ==================== FUNCION DE UTILIDAD ====================

/**
 * Analiza una contrasena y retorna su fortaleza basada en el alfabeto detectado.
 *
 * @param {string} password - Contrasena a analizar
 * @returns {Object} Analisis con R, L, y combinaciones
 */
export const analyzeBruteForce = (password) => {
  const L = password.length;
  let R = 0;

  if (/[0-9]/.test(password)) R += 10;
  if (/[a-z]/.test(password)) R += 26;
  if (/[A-Z]/.test(password)) R += 26;
  if (/[^0-9a-zA-Z]/.test(password)) R += 33;

  if (R === 0) R = 1;

  const combinations = totalCombinations(R, L);
  const expected = expectedAttempts(R, L);

  return {
    length: L,
    alphabetSize: R,
    combinations,
    expectedAttempts: expected,
    expectedFormatted: formatBigInt(expected),
  };
};
