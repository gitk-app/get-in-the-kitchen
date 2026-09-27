// GET IN THE KITCHEN - AI helper
// The app sends its request here. This function adds the private
// Anthropic key and passes the request along, so testers never need a key.
const { codeIsValid, readBody } = require('./_shared');

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_CAP = 4000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!codeIsValid(req)) {
    res.status(401).json({ error: 'bad_code' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'not_configured' });
    return;
  }

  const body = readBody(req);
  const messages = Array.isArray(body.messages) ? body.messages.slice(0, 6) : null;
  if (!messages || !messages.length) {
    res.status(400).json({ error: 'no_messages' });
    return;
  }
  const maxTokens = Math.min(Math.max(Number(body.max_tokens) || 1000, 1), MAX_TOKENS_CAP);

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'upstream_failed' });
  }
};
