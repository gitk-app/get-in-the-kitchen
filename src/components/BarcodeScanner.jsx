import React, { useEffect, useRef, useState } from 'react';

// Looks up product name from Open Food Facts using the scanned barcode
async function lookupBarcode(barcode) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    const data = await res.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const name =
        p.product_name_en ||
        p.product_name ||
        p.abbreviated_product_name ||
        '';
      const brand = p.brands ? p.brands.split(',')[0].trim() : '';
      // Guess category from Open Food Facts categories
      const cats = (p.categories || '').toLowerCase();
      let category = 'Pantry Staples';
      if (/chicken|beef|pork|turkey|sausage|meat|seafood|fish|shrimp|salmon|tuna/.test(cats)) category = 'Meat';
      else if (/dairy|milk|cheese|yogurt|butter|cream|egg/.test(cats)) category = 'Dairy';
      else if (/frozen/.test(cats)) category = 'Frozen';
      else if (/fruit|vegetable|produce|fresh/.test(cats)) category = 'Produce';
      return { name: name || brand || '', brand, category, found: !!name };
    }
    return { name: '', brand: '', category: 'Pantry Staples', found: false };
  } catch {
    return { name: '', brand: '', category: 'Pantry Staples', found: false };
  }
}

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | scanning | looking up | error
  const [errorMsg, setErrorMsg] = useState('');
  const codeReaderRef = useRef(null);

  useEffect(() => {
    let controls = null;

    const startScanner = async () => {
      try {
        // Dynamically import so the library doesn't break SSR or older browsers
        const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/browser');
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        setStatus('scanning');

        controls = await codeReader.decodeFromConstraints(
          {
            video: {
              facingMode: 'environment', // rear camera on mobile
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          async (result, error) => {
            if (result) {
              controls?.stop();
              const barcode = result.getText();
              setStatus('looking up');
              const product = await lookupBarcode(barcode);
              onResult({ barcode, ...product });
            }
            // NotFoundException is normal — it just means no barcode in frame yet
            if (error && !(error instanceof NotFoundException)) {
              console.warn('Scanner error:', error);
            }
          }
        );
      } catch (err) {
        setStatus('error');
        if (err.name === 'NotAllowedError') {
          setErrorMsg('Camera permission denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('No camera found on this device.');
        } else {
          setErrorMsg('Could not start camera. Try refreshing the page.');
        }
      }
    };

    startScanner();

    return () => {
      // Cleanup: stop camera stream when component unmounts
      try { controls?.stop(); } catch {}
      try { codeReaderRef.current?.reset(); } catch {}
      // Also stop any lingering video tracks directly
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [onResult]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      zIndex: 300, display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.6)', flexShrink: 0
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Scan barcode</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>
            {status === 'scanning' && 'Point your camera at a product barcode'}
            {status === 'starting' && 'Starting camera…'}
            {status === 'looking up' && 'Found barcode — looking up product…'}
            {status === 'error' && 'Camera error'}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          borderRadius: '50%', width: 36, height: 36, fontSize: 18,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>✕</button>
      </div>

      {/* Camera view */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          autoPlay
          muted
          playsInline // required for iOS
        />

        {/* Scanning overlay — crosshair box */}
        {status === 'scanning' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{
              width: 260, height: 160,
              border: '2px solid #16a34a',
              borderRadius: 12,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              position: 'relative'
            }}>
              {/* Corner accents */}
              {[
                { top: -2, left: -2, borderTop: '3px solid #16a34a', borderLeft: '3px solid #16a34a', borderRadius: '8px 0 0 0' },
                { top: -2, right: -2, borderTop: '3px solid #16a34a', borderRight: '3px solid #16a34a', borderRadius: '0 8px 0 0' },
                { bottom: -2, left: -2, borderBottom: '3px solid #16a34a', borderLeft: '3px solid #16a34a', borderRadius: '0 0 0 8px' },
                { bottom: -2, right: -2, borderBottom: '3px solid #16a34a', borderRight: '3px solid #16a34a', borderRadius: '0 0 8px 0' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 24, height: 24, ...s }} />
              ))}
              {/* Scanning line animation */}
              <div style={{
                position: 'absolute', left: 8, right: 8, height: 2,
                background: 'linear-gradient(90deg, transparent, #16a34a, transparent)',
                animation: 'scanline 1.8s ease-in-out infinite',
                top: '50%'
              }} />
            </div>
          </div>
        )}

        {/* Looking up spinner */}
        {status === 'looking up' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Looking up product…</div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 32, textAlign: 'center'
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📷</div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Camera not available</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 24 }}>{errorMsg}</div>
            <button onClick={onClose} style={{
              background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}>Go back</button>
          </div>
        )}
      </div>

      {/* Tip at bottom */}
      {status === 'scanning' && (
        <div style={{
          padding: '12px 20px', background: 'rgba(0,0,0,0.6)',
          color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', flexShrink: 0
        }}>
          Hold steady 6–12 inches from barcode · Works on most grocery items
        </div>
      )}

      <style>{`
        @keyframes scanline {
          0% { top: 10%; }
          50% { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}
