/**
 * deepseekClient.js
 * Cliente LLM adaptado para usar SOLO Ollama local (Docker).
 * Mantiene la misma firma: generateCompletion(prompt, systemPrompt, model)
 */

const generateCompletion = async (prompt, systemPrompt = '', model = 'deepseek-chat') => {
  const ollamaUrl = process.env.OLLAMA_BASE_URL?.trim();
  const rawModel = process.env.OLLAMA_MODEL?.trim();
  const targetModel = rawModel ? rawModel : 'gemma2:9b';

  if (!ollamaUrl) {
    console.error("[LLM Client] OLLAMA_BASE_URL no está configurada en el archivo .env");
    throw new Error('OLLAMA_BASE_URL no configurada.');
  }

  // Timeout de 10 minutos para modelos locales que procesan prompts largos
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);

  try {
    console.log(`[LLM Client] Enviando petición a Ollama (${targetModel})...`);
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: targetModel,
        format: 'json',
        options: {
          temperature: 0.1,
          top_p: 0.5,
          num_predict: 2048,  // Limitar tokens generados para evitar timeouts
        },
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => 'sin detalle');
      console.error(`[LLM Client] Falla del servidor Ollama. HTTP ${response.status}: ${errBody}`);
      throw new Error(`Falla del servidor Ollama: HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.message?.content;
    if (!content) {
      throw new Error('Ollama retornó una respuesta vacía o incompleta');
    }
    console.log(`[LLM Client] Respuesta recibida correctamente (${content.length} chars)`);
    return content;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`[LLM Client] TIMEOUT: La petición a Ollama excedió 10 minutos. El modelo puede ser demasiado lento para este prompt.`);
      throw new Error('Timeout de conexión con Ollama (>10min)');
    }
    console.error(`[LLM Client] Falla de conexión con Ollama (${ollamaUrl}). Error: ${err.message}`);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { generateCompletion };

module.exports = { generateCompletion };
