const { generateCompletion } = require('./deepseekClient');

/**
 * Genera mensajes de engagement motivacionales personalizados para prevenir abandono.
 * @param {Object} engagementContext - Datos del cliente: abandono_risk, racha, estado anímico.
 * @returns {Object} - Mensaje motivacional con tono y canal recomendado
 */
const generateEngagementMessage = async (engagementContext) => {
  const {
    nombre = 'amigo/a',
    abandono_risk = 0.3,
    streak_current = 0,
    streak_longest = 0,
    adherencia_ultima_semana = 0.75,
    fatiga_percibida = 5,
    semanas_activo = 4,
    ultimo_milestone = null,
    motivo_alerta = 'adherencia_baja',
    canal = 'push', // 'push' | 'email' | 'whatsapp'
  } = engagementContext;

  // Determinar tono según el riesgo de abandono
  let tono = 'motivacional_suave';
  if (abandono_risk > 0.6) tono = 'empatico_urgente';
  else if (abandono_risk > 0.4) tono = 'motivacional_directo';
  else if (streak_current >= 4) tono = 'celebratorio';

  const systemPrompt = `Eres un psicólogo deportivo especializado en motivación y retención de usuarios fitness. 
Tu comunicación es empática, directa y nunca genérica ni robótica. Conoces el nombre del cliente y su historia.
Adaptas el tono según el estado emocional y el riesgo de abandono.
SIEMPRE responde ÚNICAMENTE con JSON válido, sin texto extra.`;

  const userMessage = `Genera un mensaje de engagement personalizado con estos datos:

CLIENTE: ${nombre}
- Riesgo de abandono: ${Math.round(abandono_risk * 100)}%
- Racha actual: ${streak_current} semanas
- Mejor racha: ${streak_longest} semanas
- Adherencia última semana: ${Math.round(adherencia_ultima_semana * 100)}%
- Fatiga percibida: ${fatiga_percibida}/10
- Semanas activo en total: ${semanas_activo}
- Motivo de alerta: ${motivo_alerta}
- Tono requerido: ${tono}
- Canal de destino: ${canal}
${ultimo_milestone ? `- Último milestone alcanzado: ${ultimo_milestone}` : ''}

INSTRUCCIONES:
1. El mensaje debe sentirse PERSONAL, no automatizado.
2. Para canal "push": máximo 120 caracteres en el título, 200 en el cuerpo.
3. Para canal "email": tono más elaborado, hasta 3 párrafos.
4. Para canal "whatsapp": informal, usa emojis con moderación.
5. Si el riesgo > 60%, incluye una llamada a acción (CTA) clara.

Responde EXACTAMENTE con este JSON:
{
  "canal": "${canal}",
  "tono": "${tono}",
  "titulo": "Título del mensaje (para push) o asunto (para email)",
  "cuerpo": "Texto principal del mensaje personalizado con nombre del cliente",
  "cta": "Texto del botón de acción o null si no aplica",
  "cta_link": "/dashboard o null",
  "emoji_principal": "un emoji representativo o null",
  "urgencia": "alta | media | baja"
}`;

  try {
    const raw = await generateCompletion(userMessage, systemPrompt, 'llama3');
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('DeepSeek no retornó JSON válido');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[engagementAgent] Error generando mensaje:', error.message);
    return generateFallbackMessage(nombre, abandono_risk, streak_current, canal);
  }
};

const generateFallbackMessage = (nombre, riesgo, racha, canal) => {
  const mensajes = {
    alta: { titulo: `${nombre}, te extrañamos 💙`, cuerpo: `Llevas unos días sin check-in. Tu plan sigue aquí esperándote. Un pequeño paso de vuelta es todo lo que necesitas.`, cta: 'Volver ahora', urgencia: 'alta' },
    media: { titulo: `¡Sigue así, ${nombre}!`, cuerpo: `Notamos que la semana fue difícil. La constancia supera a la perfección. ¡Vamos por esta semana!`, cta: 'Ver mi plan', urgencia: 'media' },
    baja: { titulo: `🔥 ${racha} semanas seguidas, ${nombre}!`, cuerpo: `Eso es dedicación real. Tu cuerpo está respondiendo. Sigue construyendo ese hábito de acero.`, cta: null, urgencia: 'baja' },
  };
  const tipo = riesgo > 0.6 ? 'alta' : riesgo > 0.4 ? 'media' : 'baja';
  return { canal, tono: 'fallback', ...mensajes[tipo], cta_link: '/dashboard', emoji_principal: '💪' };
};

module.exports = { generateEngagementMessage };
