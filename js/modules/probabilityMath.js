/**
 * probabilityMath.js
 * Funciones puras para calculos de probabilidad relacionados con
 * fuerza bruta y espacio de contrasenas.
 *
 * Todas las funciones son puras: no mutan estado externo ni dependen
 * de ningun objeto global. Cada una recibe sus argumentos y retorna
 * un resultado determinista.
 *
 * Notacion matematica usada:
 *   R = tamano del alfabeto (cantidad de caracteres posibles)
 *   L = longitud de la contrasena
 *   p = probabilidad de acertar en un intento = 1 / R^L
 *   n = numero de intentos
 */

// ==================== CONSTANTES ====================

/** Alfabetos predefinidos para diferentes tipos de caracteres */
export const ALPHABETS = {
  digits: 10,       // 0-9
  lowercase: 26,    // a-z
  uppercase: 26,    // A-Z
  symbols: 33,      // !@#$%^&*... (ASCII imprimibles no alphanumericos)
};

/** Mapa de contrasenas para demostracion de dificultad */
export const DEMO_PASSWORDS = {
  weak: '123456',
  strong: 'T7$mK9!qL2',
};

// ==================== FUNCIONES DE BASE ====================

/**
 * Calcula R^L (total de combinaciones posibles).
 * Usa BigInt para evitar overflow con valores grandes.
 *
 * @param {number} R - Tamano del alfabeto
 * @param {number} L - Longitud de la contrasena
 * @returns {bigint} Total de combinaciones posibles
 *
 * @example
 *   totalCombinations(10, 4)  // 10000n
 *   totalCombinations(95, 8)  // 6634204312890625n
 */
export const totalCombinations = (R, L) => {
  if (R < 1 || L < 1) return 0n;
  return BigInt(R) ** BigInt(L);
};

/**
 * Calcula 1 / R^L (probabilidad de acertar en un solo intento).
 *
 * @param {number} R - Tamano del alfabeto
 * @param {number} L - Longitud de la contrasena
 * @returns {number} Probabilidad entre 0 y 1
 *
 * @example
 *   singleAttemptProbability(10, 4)  // 0.0001
 *   singleAttemptProbability(95, 8)  // 1.507e-16
 */
export const singleAttemptProbability = (R, L) => {
  if (R < 1 || L < 1) return 0;
  // Usamos Math.pow para precision con floats
  return 1 / Math.pow(R, L);
};

/**
 * Calcula la probabilidad acumulada de acertar en <= n intentos.
 * Formula: P(acertar en <= n) = 1 - (1 - p)^n
 *
 * Cada intento es independiente, asi que la probabilidad de NO acertar
 * en n intentos consecutivos es (1-p)^n. El complemento es acertar
 * al menos una vez.
 *
 * @param {number} R - Tamano del alfabeto
 * @param {number} L - Longitud de la contrasena
 * @param {number} n - Numero de intentos
 * @returns {number} Probabilidad acumulada entre 0 y 1
 *
 * @example
 *   accumulatedProbability(10, 4, 10000)  // ~0.6321 (63.21%)
 *   accumulatedProbability(10, 4, 1)      // 0.0001
 */
export const accumulatedProbability = (R, L, n) => {
  if (R < 1 || L < 1 || n < 1) return 0;
  const p = singleAttemptProbability(R, L);
  return 1 - Math.pow(1 - p, n);
};

/**
 * Calcula el numero esperado de intentos para encontrar la contrasena.
 * En promedio, se necesitan R^L / 2 intentos (busqueda uniforme).
 *
 * @param {number} R - Tamano del alfabeto
 * @param {number} L - Longitud de la contrasena
 * @returns {bigint} Numero esperado de intentos
 *
 * @example
 *   expectedAttempts(10, 4)  // 5000n
 *   expectedAttempts(95, 8)  // 3317102156445312n
 */
export const expectedAttempts = (R, L) => {
  const total = totalCombinations(R, L);
  return total / 2n;
};

/**
 * Calcula el alfabeto efectivo dado un conjunto de checkboxes activados.
 *
 * @param {Object} options - Objeto con flags booleanas
 * @param {boolean} options.digits - Incluir numeros (R=10)
 * @param {boolean} options.lowercase - Incluir minusculas (R=26)
 * @param {boolean} options.uppercase - Incluir mayusculas (R=26)
 * @param {boolean} options.symbols - Incluir simbolos (R=33)
 * @returns {number} Suma del R de cada conjunto activo
 *
 * @example
 *   calculateR({ digits: true, lowercase: false, uppercase: false, symbols: false })
 *   // 10
 *   calculateR({ digits: true, lowercase: true, uppercase: true, symbols: true })
 *   // 95
 */
export const calculateR = ({ digits, lowercase, uppercase, symbols }) => {
  let R = 0;
  if (digits) R += ALPHABETS.digits;
  if (lowercase) R += ALPHABETS.lowercase;
  if (uppercase) R += ALPHABETS.uppercase;
  if (symbols) R += ALPHABETS.symbols;
  return R || 1; // Minimo 1 para evitar division por cero
};

/**
 * Estima el tiempo en segundos para agotar todas las combinaciones
 * a una velocidad dada (intentos por segundo).
 *
 * @param {bigint} combinations - Total de combinaciones
 * @param {number} attemptsPerSecond - Velocidad de ataque
 * @returns {number} Tiempo estimado en segundos
 *
 * @example
 *   estimatedTimeSeconds(10000n, 1000)  // 10
 *   estimatedTimeSeconds(100000000n, 1000)  // 100000
 */
export const estimatedTimeSeconds = (combinations, attemptsPerSecond) => {
  if (attemptsPerSecond <= 0) return Infinity;
  return Number(combinations) / attemptsPerSecond;
};

/**
 * Formatea un BigInt como string con separadores de miles.
 *
 * @param {bigint} value - Numero a formatear
 * @returns {string} String formateado (ej: "1,234,567")
 *
 * @example
 *   formatBigInt(1234567n)  // "1,234,567"
 *   formatBigInt(100n)      // "100"
 */
export const formatBigInt = (value) => {
  if (typeof value === 'bigint') {
    return value.toLocaleString('es-ES');
  }
  return Number(value).toLocaleString('es-ES');
};

/**
 * Convierte un numero a notacion cientifica legible.
 *
 * @param {number} value - Numero a formatear
 * @returns {string} String en notacion cientifica
 *
 * @example
 *   toScientific(0.0001)       // "1.00e-4"
 *   toScientific(1.5e-16)      // "1.50e-16"
 */
export const toScientific = (value) => {
  if (value === 0) return '0';
  return value.toExponential(2);
};

/**
 * Genera el texto de la cadena de multiplicacion para visualizar R^L.
 * Ejemplo: para R=10, L=4 retorna "10 x 10 x 10 x 10 = 10,000"
 *
 * @param {number} R - Tamano del alfabeto
 * @param {number} L - Longitud
 * @returns {Object} Objeto con factores y resultado formateado
 *
 * @example
 *   multiplicationChain(10, 4)
 *   // { factors: [10, 10, 10, 10], result: "10,000", formula: "10^4" }
 */
export const multiplicationChain = (R, L) => {
  const result = totalCombinations(R, L);
  const factors = Array(L).fill(R);
  return {
    factors,
    result: formatBigInt(result),
    formula: `${R}^${L}`,
  };
};

/**
 * Estima el tiempo formateado para una contrasena dada.
 * Muestra en formato legible (segundos, minutos, horas, dias, anios, etc.)
 *
 * @param {number} R - Tamano del alfabeto
 * @param {number} L - Longitud
 * @param {number} speed - Velocidad en intentos por segundo (default: 1000)
 * @returns {string} Tiempo estimado formateado
 *
 * @example
 *   estimatedTimeFormatted(10, 4, 1000)  // "10 segundos"
 *   estimatedTimeFormatted(95, 8, 1000)  // "~52.8 mil anios"
 */
export const estimatedTimeFormatted = (R, L, speed = 1000) => {
  const total = totalCombinations(R, L);
  const seconds = Number(total) / speed;

  if (seconds < 1) return 'Menos de 1 segundo';
  if (seconds < 60) return `${Math.round(seconds)} segundos`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutos`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} horas`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} dias`;

  const years = seconds / 31536000;
  if (years < 1000) return `~${Math.round(years)} anios`;
  if (years < 1e6) return `~${(years / 1000).toFixed(1)} mil anios`;
  if (years < 1e9) return `~${(years / 1e6).toFixed(1)} millones de anios`;
  return `~${(years / 1e9).toFixed(1)} mil millones de anios`;
};

/**
 * Analiza la fortaleza de una contrasena dada.
 * Retorna un objeto con metricas de seguridad.
 *
 * @param {string} password - La contrasena a analizar
 * @returns {Object} Analisis de fortaleza
 *
 * @example
 *   analyzePassword("123456")
 *   // { length: 6, R: 10, combinations: 1000000n, ... }
 */
export const analyzePassword = (password) => {
  const L = password.length;
  let R = 0;

  // Determinar el alfabeto basado en los caracteres presentes
  if (/[0-9]/.test(password)) R += ALPHABETS.digits;
  if (/[a-z]/.test(password)) R += ALPHABETS.lowercase;
  if (/[A-Z]/.test(password)) R += ALPHABETS.uppercase;
  if (/[^0-9a-zA-Z]/.test(password)) R += ALPHABETS.symbols;

  // Evitar R=0 si la contrasena esta vacia
  if (R === 0) R = 1;

  const combinations = totalCombinations(R, L);
  const prob = singleAttemptProbability(R, L);
  const expected = expectedAttempts(R, L);
  const timeStr = estimatedTimeFormatted(R, L);

  return {
    length: L,
    alphabetSize: R,
    combinations,
    probability: prob,
    expectedAttempts: expected,
    timeFormatted: timeStr,
  };
};

/**
 * Genera la cadena de multiplicacion visual para el slider de PIN.
 * Ejemplo: "10 x 10 x 10 x 10" para R=10, L=4
 *
 * @param {number} R - Tamano del alfabeto
 * @param {number} L - Longitud
 * @returns {string} HTML de la cadena de multiplicacion
 */
export const multiplicationHTML = (R, L) => {
  const parts = [];
  for (let i = 0; i < L; i++) {
    parts.push(`<span class="multiplication-chain__factor" style="animation-delay: ${i * 0.08}s">${R}</span>`);
    if (i < L - 1) {
      parts.push(`<span class="multiplication-chain__operator">&times;</span>`);
    }
  }
  parts.push(`<span class="multiplication-chain__equals">=</span>`);
  parts.push(`<span class="multiplication-chain__result">${formatBigInt(totalCombinations(R, L))}</span>`);
  return parts.join('');
};
