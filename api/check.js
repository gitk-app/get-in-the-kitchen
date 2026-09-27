// GET IN THE KITCHEN - checks a beta access code
const { codeIsValid } = require('./_shared');

module.exports = async (req, res) => {
  if (!codeIsValid(req)) {
    res.status(401).json({ ok: false, error: 'bad_code' });
    return;
  }
  res.status(200).json({
    ok: true,
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    photos: Boolean(process.env.PEXELS_API_KEY),
  });
};
