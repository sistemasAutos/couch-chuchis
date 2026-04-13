const { generateCompletion } = require('./deepseekClient');

/**
 * Genera un plan de alimentación semanal personalizado (80% ciencia / 20% cultura).
 * @param {Object} nutritionProfile - Macros, región cultural, restricciones, etc.
 * @returns {Object} - Plan de alimentación estructurado en JSON
 */
const generateMealPlan = async (nutritionProfile) => {
  const {
    kcal_target = 2200,
    protein_g = 140,
    fat_percentage = 0.25,
    carbs_g = 220,
    region = 'mexico',
    restricciones = [],
    objetivo = 'perdida_grasa',
    nombre_cliente = 'el cliente',
    alimentos_disponibles = [],
  } = nutritionProfile;

  const restriccionesStr = restricciones.length > 0
    ? `Restricciones/alergias: ${restricciones.join(', ')}.`
    : 'Sin restricciones alimenticias.';

  const disponiblesStr = alimentos_disponibles.length > 0
    ? `Alimentos que el cliente tiene disponibles/prefiere: ${alimentos_disponibles.join(', ')}.`
    : '';

  const systemPrompt = `Eres un nutriólogo clínico con especialización en nutrición deportiva y gastronomía latinoamericana. 
Tu rol es prescribir planes de alimentación que sean científicamente rigurosos Y culturalmente viables para el cliente.
Regla 80/20: 80% de los macros deben cumplirse mediante estructura científica validada, 20% se adapta a preferencias culturales locales.
IMPORTANTE: NO ALUCINES NI INVENTES DATOS. NO agregues notas o explicaciones fuera del JSON.
REGLA ESTRICTA: SIEMPRE responde ÚNICAMENTE con un JSON válido estructurado exactamente como se solicita.`;

  const userMessage = `Diseña un plan de alimentación semanal para ${nombre_cliente} con estas especificaciones:

MACROS OBJETIVO (Base Científica - 80%):
- Calorías totales: ${kcal_target} kcal/día
- Proteína: ${protein_g}g/día
- Grasa: ${Math.round(kcal_target * fat_percentage / 9)}g/día (${Math.round(fat_percentage * 100)}%)
- Carbohidratos: ${carbs_g}g/día
- Objetivo de fitness: ${objetivo}

ADAPTACIÓN CULTURAL (20%):
- Región: ${region}
- ${restriccionesStr}
- ${disponiblesStr}

INSTRUCCIONES:
1. Genera opciones de DESAYUNO, ALMUERZO, CENA y 1-2 COLACIONES para 7 días.
2. Cada comida debe tener su desglose de macros aproximado.
3. Usa ingredientes típicos de la región (para México: tortilla de maíz, frijoles, chiles, aguacate, etc.).
4. Sugiere intercambios equivalentes si no consigue algún ingrediente.

Responde EXACTAMENTE con este JSON:
{
  "resumen_diario": {
    "kcal": numero,
    "proteina_g": numero,
    "carbs_g": numero,
    "grasa_g": numero
  },
  "estructura_comidas": {
    "desayuno": { "kcal": numero, "opciones": ["opcion A", "opcion B", "opcion C"] },
    "colacion_1": { "kcal": numero, "opciones": ["opcion A", "opcion B"] },
    "almuerzo": { "kcal": numero, "opciones": ["opcion A", "opcion B", "opcion C"] },
    "colacion_2": { "kcal": numero, "opciones": ["opcion A", "opcion B"] },
    "cena": { "kcal": numero, "opciones": ["opcion A", "opcion B", "opcion C"] }
  },
  "plan_semanal": [
    {
      "dia": "Lunes",
      "desayuno": "descripción detallada",
      "colacion_1": "descripción",
      "almuerzo": "descripción detallada",
      "colacion_2": "descripción",
      "cena": "descripción detallada",
      "total_kcal_estimado": numero
    }
  ],
  "intercambios_sugeridos": ["intercambio 1", "intercambio 2"],
  "notas_culturales": "Nota sobre adaptación regional",
  "nota_nutricionista": "Observación clínica relevante"
}`;

  try {
    const raw = await generateCompletion(userMessage, systemPrompt, 'deepseek-chat');
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Ollama no retornó JSON válido');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[nutritionAgent] Error generando plan nutricional:', error.message);
    return generateFallbackMealPlan(kcal_target, protein_g, region);
  }
};

const generateFallbackMealPlan = (kcal, proteina, region) => ({
  resumen_diario: { kcal, proteina_g: proteina, carbs_g: Math.round((kcal * 0.45) / 4), grasa_g: Math.round((kcal * 0.25) / 9) },
  estructura_comidas: {
    desayuno: { kcal: Math.round(kcal * 0.25), opciones: ['Huevos revueltos + tortilla de maíz + frijoles + aguacate'] },
    colacion_1: { kcal: Math.round(kcal * 0.10), opciones: ['Fruta + puño de nueces'] },
    almuerzo: { kcal: Math.round(kcal * 0.35), opciones: ['Pechuga de pollo + arroz + frijoles + ensalada'] },
    colacion_2: { kcal: Math.round(kcal * 0.10), opciones: ['Yogur natural + fruta'] },
    cena: { kcal: Math.round(kcal * 0.20), opciones: ['Pescado al limón + verduras al vapor + tortilla'] },
  },
  plan_semanal: [],
  intercambios_sugeridos: ['Tortilla de maíz > tortilla de harina', 'Frijoles negros > frijoles bayos (mejor perfil)'],
  notas_culturales: `Adaptado para región: ${region}`,
  nota_nutricionista: '[FALLBACK] Plan base generado. Ollama no disponible.',
});

module.exports = { generateMealPlan };
