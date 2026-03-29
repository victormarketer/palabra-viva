export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 🔐 Obtener API Key desde Vercel
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'Falta la variable ANTHROPIC_API_KEY en Vercel'
      });
    }

    // 📥 Leer prompt
    const { prompt } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        error: 'Debes escribir un prompt'
      });
    }

    // ⏱ Timeout de seguridad (25 segundos)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response;
    let data;

    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', // ✅ modelo correcto
          max_tokens: 1200,
          messages: [
            {
              role: 'user',
              content: String(prompt)
            }
          ]
        }),
        signal: controller.signal
      });

      data = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    // ❌ Si Anthropic devuelve error
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Error al conectar con Anthropic',
        details: data
      });
    }

    // ✅ Extraer respuesta
    const text =
      data?.content?.map(block => block.text || '').join('') || '';

    return res.status(200).json({
      result: text
    });

  } catch (error) {
    // ⏱ Timeout
    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'La solicitud tardó demasiado. Intenta nuevamente.'
      });
    }

    // ❌ Error general
    return res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}
