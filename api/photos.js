// GET IN THE KITCHEN - food photo helper
// Looks up a food photo on Pexels using the private key stored in Vercel.
const { codeIsValid } = require('./_shared');

module.exports = async (req, res) => {
  if (!codeIsValid(req)) {
    res.status(401).json({ error: 'bad_code' });
    return;
  }
  if (!process.env.PEXELS_API_KEY) {
    res.status(500).json({ error: 'not_configured' });
    return;
  }
  const q = String((req.query && req.query.q) || '').slice(0, 100).trim();
  if (!q) {
    res.status(400).json({ error: 'no_query' });
    return;
  }
  try {
    const upstream = await fetch(
      'https://api.pexels.com/v1/search?query=' + encodeURIComponent(q) + '&per_page=5&orientation=landscape',
      { headers: { Authorization: process.env.PEXELS_API_KEY } }
    );
    const data = await upstream.json();
    const photos = (data.photos || []).slice(0, 3);
    if (!photos.length) {
      res.status(200).json({ url: null });
      return;
    }
    const pick = photos[Math.floor(Math.random() * photos.length)];
    // Cache the same search for a day to save calls
    res.setHeader('Cache-Control', 's-maxage=86400');
    res.status(200).json({ url: (pick.src && pick.src.medium) || null });
  } catch (err) {
    res.status(502).json({ error: 'upstream_failed' });
  }
};
