// Shared helpers for the GITK server functions. Keys live in Vercel
// environment variables and never reach the browser.

// BETA_PASSCODE can hold one code or several separated by commas,
// for example: KITCHEN2026,MOM2026
function codeIsValid(req) {
  const allowed = String(process.env.BETA_PASSCODE || '')
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean);
  const given = String(req.headers['x-gitk-code'] || '').trim().toUpperCase();
  return allowed.length > 0 && allowed.includes(given);
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return req.body;
}

module.exports = { codeIsValid, readBody };
