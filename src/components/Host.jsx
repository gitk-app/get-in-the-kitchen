import React from 'react';

// ---------------------------------------------------------------------------
// Set the Table - the host
// She is the face of the app. Every screen uses these pieces, so swapping in
// the final illustration later only means changing HostFace below.
// ---------------------------------------------------------------------------

export const HOST_NAME = 'Nia';

// Temporary look until the illustration is ready.
// To use a photo instead, put it in the public folder (for example public/nia.png)
// and set HOST_IMAGE to '/nia.png'. Leave it empty to show the Nia monogram.
export const HOST_IMAGE = '/nia.png';

// Optional second picture of Nia with her mouth closed (same size and framing).
// When set, the app flips between the two while she "talks". Leave empty to skip.
export const HOST_IMAGE_CLOSED = '';

const TEAL = '#0A3D35';
const GOLD = '#C9A84C';

export function HostStyles() {
  return (
    <style>{`
      @keyframes gitkBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
      @keyframes gitkBlink { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
      @keyframes gitkTalk { 0% { opacity: 0; } 100% { opacity: 1; } }
      @keyframes gitkDotsOut { 0%,85% { opacity: 1; } 100% { opacity: 0; } }
      @keyframes gitkTextIn { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes gitkDot { 0%,100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-3px); opacity: 1; } }
      @keyframes gitkSteam { 0% { transform: translateY(2px); opacity: 0; } 40% { opacity: 0.9; } 100% { transform: translateY(-4px); opacity: 0; } }
      @keyframes gitkSpeak { 0%,100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); } 50% { box-shadow: 0 0 0 5px rgba(201,168,76,0.35); } }
      @keyframes gitkNod { 0%,100% { transform: rotate(0deg) translateY(0); } 25% { transform: rotate(-2deg) translateY(-1px); } 50% { transform: rotate(0deg) translateY(0); } 75% { transform: rotate(2deg) translateY(-1px); } }
      .gitk-nod { animation: gitkNod 0.9s ease-in-out 1.2s 2; transform-origin: 50% 90%; }
      .gitk-nod-quick { animation: gitkNod 0.9s ease-in-out 0.2s 2; transform-origin: 50% 90%; }
      .gitk-bob { animation: gitkBob 3.2s ease-in-out infinite; }
      .gitk-steam { animation: gitkSteam 2.6s ease-in-out infinite; }
      .gitk-speak { animation: gitkSpeak 0.8s ease-in-out 1.2s 3; }
      .gitk-speak-quick { animation: gitkSpeak 0.8s ease-in-out 0.2s 3; }
      .gitk-eye { transform-box: fill-box; transform-origin: center; animation: gitkBlink 4.5s infinite; }
      .gitk-mouth { opacity: 0; animation: gitkTalk 0.2s steps(1) 1.3s 10 alternate; }
      .gitk-mouth-quick { opacity: 0; animation: gitkTalk 0.2s steps(1) 0.3s 8 alternate; }
      .gitk-dots { animation: gitkDotsOut 1.3s forwards; }
      .gitk-text { opacity: 0; animation: gitkTextIn 0.4s ease-out 1.2s forwards; }
      .gitk-text-quick { opacity: 0; animation: gitkTextIn 0.35s ease-out 0.1s forwards; }
      .gitk-d { display: inline-block; animation: gitkDot 0.9s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .gitk-bob, .gitk-eye, .gitk-mouth, .gitk-mouth-quick, .gitk-d, .gitk-steam, .gitk-speak, .gitk-speak-quick, .gitk-nod, .gitk-nod-quick { animation: none; }
        .gitk-dots { animation: none; opacity: 0; }
        .gitk-text, .gitk-text-quick { animation: none; opacity: 1; }
      }
    `}</style>
  );
}

// The look itself. For now: a photo if HOST_IMAGE is set, otherwise a gold "N"
// with the kitchen steam from the logo. Swap this for the illustration later.
function HostFace({ size, talk, quick }) {
  // If the picture can't load, fall back to the monogram instead of showing broken text
  const [broken, setBroken] = React.useState(false);
  if (HOST_IMAGE && !broken) {
    const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
    return (
      // While she talks: a small nod, and if there's a closed-mouth picture, her mouth flips open and shut
      <div className={talk ? (quick ? 'gitk-nod-quick' : 'gitk-nod') : undefined} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <img src={HOST_IMAGE} alt={`${HOST_NAME}, your kitchen host`} onError={() => setBroken(true)} style={fill} />
        {talk && HOST_IMAGE_CLOSED && (
          <img src={HOST_IMAGE_CLOSED} alt="" aria-hidden="true" className={quick ? 'gitk-mouth-quick' : 'gitk-mouth'} style={fill} />
        )}
      </div>
    );
  }
  return (
    <svg className="gitk-bob" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${HOST_NAME}, your kitchen host`}>
      <g stroke={GOLD} strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path className="gitk-steam" d="M24 20c-3-3 3-5 0-8" />
        <path className="gitk-steam" style={{ animationDelay: '0.5s' }} d="M32 18c-3-3 3-5 0-8" />
        <path className="gitk-steam" style={{ animationDelay: '1s' }} d="M40 20c-3-3 3-5 0-8" />
      </g>
      <text x="32" y="49" textAnchor="middle" fontSize="28" fontWeight="800" fill={GOLD}
        fontFamily="Georgia, 'Times New Roman', serif">N</text>
    </svg>
  );
}

// Round avatar with a gold ring
export function HostAvatar({ size = 48, ring = 2, bg = TEAL, talk = false, quick = false }) {
  // A double gold ring, like the Plate logo: a bold rim plus a thin inner line.
  // When she's "talking", a soft gold glow pulses around her.
  const gap = Math.max(2, Math.round(size / 20));
  return (
    <div className={talk ? (quick ? 'gitk-speak-quick' : 'gitk-speak') : undefined} style={{
      width: size, height: size, flexShrink: 0, borderRadius: size / 2, background: bg,
      border: `${Math.max(ring, Math.round(size / 22))}px solid ${GOLD}`, padding: gap,
      boxSizing: 'border-box', display: 'flex',
    }}>
      <HostStyles />
      <div style={{
        flex: 1, borderRadius: '50%', overflow: 'hidden', background: bg,
        boxShadow: '0 0 0 1px rgba(201,168,76,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <HostFace size={Math.round(size * 0.78)} talk={talk} quick={quick} />
      </div>
    </div>
  );
}

// The host saying something. "quick" skips the typing dots, for screens she visits often.
// Put any buttons or inputs in children and they appear under her words.
export function Host({ text, children, quick = false, size = 52, onDark = false }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <HostAvatar size={size} talk quick={quick} bg={onDark ? '#0F5040' : TEAL} />
      <div style={{
        position: 'relative', flex: children ? 1 : undefined, background: '#fff',
        border: onDark ? 'none' : '1px solid #E0D5C5', borderRadius: '16px 16px 16px 4px',
        padding: '11px 14px', fontSize: 14, lineHeight: 1.45, color: '#0A2E25',
        boxShadow: onDark ? '0 4px 14px rgba(0,0,0,0.18)' : 'none',
      }}>
        {!quick && (
          <div className="gitk-dots" aria-hidden="true" style={{
            position: 'absolute', left: 14, top: 12, display: 'flex', gap: 4,
            fontSize: 20, lineHeight: '10px', color: TEAL,
          }}>
            <span className="gitk-d">&bull;</span>
            <span className="gitk-d" style={{ animationDelay: '0.15s' }}>&bull;</span>
            <span className="gitk-d" style={{ animationDelay: '0.3s' }}>&bull;</span>
          </div>
        )}
        <div className={quick ? 'gitk-text-quick' : 'gitk-text'}>
          {text}
          {children && <div style={{ marginTop: 10 }}>{children}</div>}
        </div>
      </div>
    </div>
  );
}

// Small action button that sits inside the host's bubble
export function HostAction({ children, onClick, secondary = false }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, padding: '0 14px',
      borderRadius: 18, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
      border: secondary ? '1px solid #E0D5C5' : 'none',
      background: secondary ? '#fff' : TEAL, color: secondary ? '#3A5A50' : '#fff',
      marginRight: 8, marginTop: 2,
    }}>{children}</button>
  );
}

// A short message from the host that pops up at the bottom after something
// happens, like saving a trip. The screen decides when to close it.
export function HostToast({ text, onClose, children }) {
  return (
    <div role="status" style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)',
      bottom: 'calc(var(--nav-height, 64px) + 16px)', width: 'calc(100% - 32px)', maxWidth: 520,
      background: TEAL, borderRadius: 16, padding: '12px 12px 12px 14px', zIndex: 180,
      display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    }}>
      <HostAvatar size={44} bg="#0F5040" talk quick />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="gitk-text-quick" style={{ fontSize: 14, lineHeight: 1.45, color: '#fff' }}>{text}</div>
        {children && <div style={{ marginTop: 8 }}>{children}</div>}
      </div>
      <button type="button" onClick={onClose} aria-label="Close message" style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer',
        width: 32, height: 32, flexShrink: 0, fontSize: 18, lineHeight: 1,
      }}>&times;</button>
    </div>
  );
}

// Keeps a toast on screen for a few seconds, then hides it
export function useHostToast(ms = 8000) {
  const [toast, setToast] = React.useState(null);
  const timer = React.useRef(null);
  const show = React.useCallback((text) => {
    setToast(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), ms);
  }, [ms]);
  const hide = React.useCallback(() => { clearTimeout(timer.current); setToast(null); }, []);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show, hide];
}
