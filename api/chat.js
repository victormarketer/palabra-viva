export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'Falta la variable ANTHROPIC_API_KEY en Vercel'
      });
    }

    const { prompt } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        error: 'Falta el prompt'
      });
    }

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
          model: 'claude-3-5-sonnet-20241022',
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

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Error al conectar con Anthropic',
        details: data
      });
    }

    const text =
      data?.content?.map(block => block.text || '').join('') || '';

    return res.status(200).json({ result: text });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'La solicitud tardó demasiado. Intenta con un prompt más corto.'
      });
    }

    return res.status(500).json({
      error: error.message || 'Error interno del servidor'
    });
  }
}
