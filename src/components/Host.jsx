import React from 'react';

// ---------------------------------------------------------------------------
// GET IN THE KITCHEN - the host
// She is the face of the app. Every screen uses these pieces, so swapping in
// the final illustration later only means changing HostFace below.
// ---------------------------------------------------------------------------

export const HOST_NAME = 'Michele';

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
      .gitk-bob { animation: gitkBob 3.2s ease-in-out infinite; }
      .gitk-eye { transform-box: fill-box; transform-origin: center; animation: gitkBlink 4.5s infinite; }
      .gitk-mouth { opacity: 0; animation: gitkTalk 0.2s steps(1) 1.3s 10 alternate; }
      .gitk-mouth-quick { opacity: 0; animation: gitkTalk 0.2s steps(1) 0.3s 8 alternate; }
      .gitk-dots { animation: gitkDotsOut 1.3s forwards; }
      .gitk-text { opacity: 0; animation: gitkTextIn 0.4s ease-out 1.2s forwards; }
      .gitk-text-quick { opacity: 0; animation: gitkTextIn 0.35s ease-out 0.1s forwards; }
      .gitk-d { display: inline-block; animation: gitkDot 0.9s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .gitk-bob, .gitk-eye, .gitk-mouth, .gitk-mouth-quick, .gitk-d { animation: none; }
        .gitk-dots { animation: none; opacity: 0; }
        .gitk-text, .gitk-text-quick { animation: none; opacity: 1; }
      }
    `}</style>
  );
}

// The drawing itself. Replace this SVG with the final illustration later.
function HostFace({ size, talk, quick }) {
  return (
    <svg className="gitk-bob" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${HOST_NAME}, your kitchen host`}>
      <circle cx="32" cy="26" r="17" fill="#2B1B14" />
      <circle cx="19" cy="21" r="9" fill="#2B1B14" />
      <circle cx="45" cy="21" r="9" fill="#2B1B14" />
      <circle cx="32" cy="12" r="11" fill="#2B1B14" />
      <path d="M13 64c0-11 8-19 19-19s19 8 19 19z" fill={GOLD} />
      <rect x="28" y="38" width="8" height="10" fill="#7A4E33" />
      <ellipse cx="32" cy="29" rx="10" ry="12" fill="#8A5A3C" />
      <circle className="gitk-eye" cx="28" cy="27" r="1.4" fill="#2B1B14" />
      <circle className="gitk-eye" cx="36" cy="27" r="1.4" fill="#2B1B14" />
      <path d="M27 33q5 4 10 0" stroke="#2B1B14" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {talk && <ellipse className={quick ? 'gitk-mouth-quick' : 'gitk-mouth'} cx="32" cy="34" rx="3.6" ry="2.6" fill="#3A1A12" />}
    </svg>
  );
}

// Round avatar with a gold ring
export function HostAvatar({ size = 48, ring = 2, bg = TEAL, talk = false, quick = false }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: size / 2, background: bg,
      border: `${ring}px solid ${GOLD}`, overflow: 'hidden', display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center', boxSizing: 'border-box',
    }}>
      <HostStyles />
      <HostFace size={Math.round(size * 0.92)} talk={talk} quick={quick} />
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
