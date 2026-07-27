import React, { useEffect, useRef, useState } from 'react';

async function lookupBarcode(barcode) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const name = p.product_name_en || p.product_name || p.abbreviated_product_name || '';
      const brand = p.brands ? p.brands.split(',')[0].trim() : '';
      const cats = (p.categories || '').toLowerCase();
      let category = 'Pantry Staples';
      if (/chicken|beef|pork|turkey|sausage|meat|seafood|fish|shrimp|salmon|tuna/.test(cats)) category = 'Meat';
      else if (/dairy|milk|cheese|yogurt|butter|cream|egg/.test(cats)) category = 'Dairy';
      else if (/frozen/.test(cats)) category = 'Frozen';
      else if (/fruit|vegetable|produce|fresh/.test(cats)) category = 'Produce';
      return { name: name || brand || '', category, found: !!(name || brand) };
    }
    return { name: '', category: 'Pantry Staples', found: false };
  } catch {
    return { name: '', category: 'Pantry Staples', found: false };
  }
}

const SCANNER_ID = 'gitk-barcode-scanner';

export default function BarcodeScanner({ onResult, onClose }) {
  const [status, setStatus] = useState('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);
  const hasResultRef = useRef(false);

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.7,
            disableFlip: false,
            formatsToSupport: [
              0,  // QR_CODE
              1,  // AZTEC
              2,  // CODABAR
              3,  // CODE_39
              4,  // CODE_93
              5,  // CODE_128
              6,  // DATA_MATRIX
              7,  // MAXICODE
              8,  // ITF
              9,  // EAN_13
              10, // EAN_8
              11, // PDF_417
              12, // RSS_14
              13, // RSS_EXPANDED
              14, // UPC_A
              15, // UPC_E
              16, // UPC_EAN_EXTENSION
            ]
          },
          async (decodedText) => {
            if (hasResultRef.current) return;
            hasResultRef.current = true;

            setStatus('looking up');
            try { await html5QrCode.stop(); } catch {}

            const product = await lookupBarcode(decodedText);
            onResult({ barcode: decodedText, ...product });
          },
          () => { /* scan failure — normal, ignore */ }
        );

        setStatus('scanning');
      } catch (err) {
        console.error('Scanner error:', err);
        setStatus('error');
        if (err?.message?.includes('permission') || err?.message?.includes('Permission') || err?.name === 'NotAllowedError') {
          setErrorMsg('Camera permission denied. Please allow camera access in your browser settings and try again.');
        } else if (err?.name === 'NotFoundError') {
          setErrorMsg('No camera found on this device.');
        } else {
          setErrorMsg('Could not start camera. Make sure you\'re using Chrome or Safari and try again.\n\n' + (err?.message || ''));
        }
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop().catch(() => {}); } catch {}
      }
    };
  }, [onResult]);

  const handleClose = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      zIndex: 300, display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.8)'
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Scan barcode</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
            {status === 'starting' && 'Starting camera…'}
            {status === 'scanning' && 'Point at a product barcode'}
            {status === 'looking up' && 'Found it! Looking up product…'}
            {status === 'error' && 'Camera error'}
          </div>
        </div>
        <button onClick={handleClose} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          borderRadius: '50%', width: 36, height: 36, fontSize: 18,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>✕</button>
      </div>

      {/* Scanner container — html5-qrcode renders into this div */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div
          id={SCANNER_ID}
          style={{ width: '100%', height: '100%' }}
        />

        {/* Looking up overlay */}
        {status === 'looking up' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Looking up product…</div>
          </div>
        )}

        {/* Starting overlay */}
        {status === 'starting' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ color: '#fff', fontSize: 14 }}>Starting camera…</div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: 32, textAlign: 'center'
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📷</div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Camera not available</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 24, whiteSpace: 'pre-line' }}>{errorMsg}</div>
            <button onClick={handleClose} style={{
              background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}>Go back</button>
          </div>
        )}
      </div>

      {/* Tip */}
      {status === 'scanning' && (
        <div style={{
          padding: '10px 20px', background: 'rgba(0,0,0,0.8)', flexShrink: 0,
          color: 'rgba(255,255,255,0.55)', fontSize: 12, textAlign: 'center'
        }}>
          Hold steady 6–10 inches away · Works on cans, boxes, bags
        </div>
      )}
    </div>
  );
}
