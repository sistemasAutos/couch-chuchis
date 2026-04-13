const { generateCompletion } = require('./deepseekClient');

/**
 * Genera una rutina de entrenamiento semanal personalizada usando DeepSeek.
 * @param {Object} clientState - Estado actual del cliente (fatiga, experiencia, objetivo, etc.)
 * @returns {Object} - Plan de entrenamiento estructurado en JSON
 */
const generateWorkoutPlan = async (clientState) => {
  const {
    objetivo = 'hipertrofia',
    experiencia = 'intermedio',
    dias_disponibles = 4,
    equipamiento = 'gimnasio',
    peso = 80,
    fatiga_percibida = 5,
    adherencia = 0.85,
    limitaciones = [],
    max_estimates = {},
    week_on_block = 1,
  } = clientState;

  const limitacionesStr = limitaciones.length > 0
    ? `El cliente tiene las siguientes limitaciones físicas: ${limitaciones.join(', ')}.`
    : 'El cliente no tiene lesiones ni limitaciones.';

  const estimadosStr = Object.keys(max_estimates).length > 0
    ? `Sus estimados de 1RM actuales son: ${JSON.stringify(max_estimates)}.`
    : '';

  const systemPrompt = `Eres un entrenador personal experto en kinesiología y programación de entrenamiento con +15 años de experiencia. 
Tu especialidad es crear rutinas de entrenamiento altamente personalizadas, biomecánicamente correctas y adaptadas al estado fisiológico actual del cliente.
IMPORTANTE: NO ALUCINES NI INVENTES DATOS. Basate SOLAMENTE en los hechos proveídos.
REGLA ESTRICTA: SIEMPRE responde ÚNICAMENTE con un JSON válido estructurado exactamente como se te solicita, sin markdown, sin introducciones, sin texto extra.`;

  const prompt = `Genera una rutina de entrenamiento semanal para un cliente con las siguientes características:

- Objetivo: ${objetivo}
- Nivel de experiencia: ${experiencia}
- Días disponibles: ${dias_disponibles} días/semana
- Equipamiento: ${equipamiento}
- Peso actual: ${peso}kg
- Fatiga percibida (1-10): ${fatiga_percibida}
- Adherencia reciente: ${Math.round(adherencia * 100)}%
- Semana en el bloque actual: ${week_on_block}
- ${limitacionesStr}
- ${estimadosStr}

INSTRUCCIONES:
1. Si fatiga > 7, reduce el volumen total un 20% y prioriza ejercicios compuestos básicos.
2. Si adherencia < 0.70, simplifica el split y reduce días totales en 1.
3. Genera ejercicios específicos con series, repeticiones y peso sugerido (basado en los 1RM si disponibles).
4. Adapta el split al número de días (2=FullBody, 3=PPL, 4=Upper/Lower, 5-6=PPL, 7=PPL+Cardio).

Responde EXACTAMENTE con este JSON:
{
  "split_name": "nombre del split",
  "dias_totales": numero,
  "volumen_ajustado": true/false,
  "razon_ajuste": "explicacion si aplica",
  "dias": [
    {
      "dia": 1,
      "nombre": "Nombre del día (ej. Upper A o Push)",
      "musculos_foco": ["lista de músculos"],
      "ejercicios": [
        {
          "nombre": "nombre del ejercicio",
          "series": numero,
          "repeticiones": "rango (ej. 8-12)",
          "peso_sugerido_kg": numero_o_null,
          "rpe_objetivo": numero,
          "nota": "clave técnica"
        }
      ]
    }
  ],
  "notas_generales": "Observaciones generales del bloque"
}`;

  try {
    const raw = await generateCompletion(prompt, systemPrompt, 'deepseek-chat');
    // Extraer JSON desde la respuesta (por si el modelo agrega texto)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('DeepSeek no retornó JSON válido');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[workoutAgent] Error generando rutina:', error.message);
    // Fallback determinístico si DeepSeek falla
    return generateFallbackWorkout(dias_disponibles, objetivo, fatiga_percibida);
  }
};

// Fallback seguro si DeepSeek no está disponible
const generateFallbackWorkout = (dias, objetivo, fatiga) => {
  const splits = { 2: 'Full Body', 3: 'PPL', 4: 'Upper/Lower', 5: 'PPL', 6: 'PPL Doble' };
  const volumenReducido = fatiga >= 7;
  return {
    split_name: splits[Math.min(dias, 6)] || 'Upper/Lower',
    dias_totales: dias,
    volumen_ajustado: volumenReducido,
    razon_ajuste: volumenReducido ? 'Fatiga alta detectada. Volumen reducido 20%.' : null,
    dias: [{ dia: 1, nombre: 'Sesión Base', musculos_foco: ['Full Body'], ejercicios: [
      { nombre: 'Sentadilla', series: volumenReducido ? 3 : 4, repeticiones: '8-10', peso_sugerido_kg: null, rpe_objetivo: 7, nota: 'Mantén la espalda recta' },
      { nombre: 'Press de Banca', series: volumenReducido ? 3 : 4, repeticiones: '8-10', peso_sugerido_kg: null, rpe_objetivo: 7, nota: 'Agarre a la anchura de hombros' },
      { nombre: 'Remo con Barra', series: 3, repeticiones: '10-12', peso_sugerido_kg: null, rpe_objetivo: 7, nota: 'Enfoca la retracción escapular' },
    ]}],
    notas_generales: `[FALLBACK] Plan base generado. DeepSeek no disponible. Objetivo: ${objetivo}.`,
  };
};

module.exports = { generateWorkoutPlan };
