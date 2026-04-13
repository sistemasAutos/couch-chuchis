const { generateCompletion } = require('./deepseekClient');

/**
 * Genera borradores de publicaciones para redes sociales celebrando el progreso de clientes.
 * Diseñado para el Entrenador, para compartir éxitos de sus clientes en Instagram/TikTok.
 * @param {Object} milestoneData - Datos del logro, cliente y plataforma objetivo.
 * @returns {Object} - Copy, hashtags y sugerencias de contenido visual
 */
const generateSocialPost = async (milestoneData) => {
  const {
    nombre_entrenador = 'Tu entrenador',
    nombre_cliente_anonimo = null, // Si el cliente autorizó mostrarse
    tipo_milestone = 'perdida_peso',  // 'perdida_peso' | 'fuerza' | 'streak' | 'check_in' | 'transformacion'
    valor_logro = '',
    semanas_entrenando = 8,
    plataforma = 'instagram', // 'instagram' | 'tiktok' | 'facebook'
    gym_nombre = 'el gimnasio',
    estilo_coach = 'motivacional', // 'motivacional' | 'tecnico' | 'empatico' | 'humoristico'
  } = milestoneData;

  const clienteRef = nombre_cliente_anonimo
    ? `el cliente se llama ${nombre_cliente_anonimo} y autorizó mencionarse`
    : 'no menciones el nombre del cliente (usa "uno de mis atletas", "mi cliente" etc. por privacidad)';

  const systemPrompt = `Eres un experto en marketing digital para fitness coaches y entrenadores personales. 
Creas contenido viral auténtico para redes sociales que genera leads, engancha a la audiencia y posiciona al entrenador como experto.
El contenido debe sentirse genuino y humano, NUNCA corporativo o genérico.
SIEMPRE responde ÚNICAMENTE con JSON válido, sin texto extra.`;

  const userMessage = `Genera un borrador de publicación para redes sociales con estos datos:

ENTRENADOR: ${nombre_entrenador}
PLATAFORMA: ${plataforma}
ESTILO DEL COACH: ${estilo_coach}
GYM: ${gym_nombre}
LOGRO DEL CLIENTE:
- Tipo de milestone: ${tipo_milestone}
- Valor del logro: ${valor_logro}
- Semanas de entrenamiento: ${semanas_entrenando}
- Privacidad: ${clienteRef}

INSTRUCCIONES POR PLATAFORMA:
- Instagram: Copy en 3 párrafos + 20-30 hashtags variados (populares + nicho)
- TikTok: Copy corto gancho-historia-CTA + hashtags trending cortos
- Facebook: Tono más conversacional, historia larga con emoción, pocos hashtags

INSTRUCCIONES GENERALES:
1. Primera línea = GANCHO irresistible (que detenga el scroll)
2. Incluye storytelling breve del proceso
3. Termina con CTA que invite a la audiencia a contactar al entrenador
4. El tono debe reflejar el estilo del coach: ${estilo_coach}

Responde EXACTAMENTE con este JSON:
{
  "plataforma": "${plataforma}",
  "estilo": "${estilo_coach}",
  "copy_principal": "texto completo listo para pegar en la red social",
  "gancho_alternativo": "otra versión del primer párrafo como alternativa",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "sugerencia_visual": "Descripción de qué imagen/video usar (antes/después, video de ejercicio, etc.)",
  "mejor_hora_publicacion": "Ej: Martes 7pm o Sábado 10am",
  "tip_engagement": "Sugerencia para aumentar interacciones (pregunta, encuesta, etc.)"
}`;

  try {
    const raw = await generateCompletion(userMessage, systemPrompt, 'llama3');
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('DeepSeek no retornó JSON válido');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[socialAgent] Error generando post:', error.message);
    return generateFallbackPost(nombre_entrenador, tipo_milestone, valor_logro, plataforma);
  }
};

const generateFallbackPost = (entrenador, milestone, valor, plataforma) => ({
  plataforma,
  estilo: 'motivacional',
  copy_principal: `¡Lo logramos juntos! 💪\n\nUno de mis atletas acaba de alcanzar un hito increíble: ${valor}. ${milestone === 'perdida_peso' ? 'Esto no es suerte, es ciencia aplicada y disciplina real.' : 'Meses de trabajo, sudor y constancia que dan sus frutos.'}\n\n¿Estás listo para escribir tu propia historia? DM o link en bio 👇`,
  gancho_alternativo: `Esto es lo que pasa cuando la ciencia y el compromiso se juntan...`,
  hashtags: ['#FitnessCoach', '#TransformacionFisica', '#EntrenadorPersonal', '#Motivacion', '#Gym', '#Salud', '#Fitness', '#ResultadosReales'],
  sugerencia_visual: '[FALLBACK] Usa una foto de progreso del cliente o video de ejercicio en acción',
  mejor_hora_publicacion: 'Martes o Jueves 6-8pm',
  tip_engagement: 'Pregunta al final: "¿Cuál es tu próximo objetivo?" para generar comentarios',
});

module.exports = { generateSocialPost };
