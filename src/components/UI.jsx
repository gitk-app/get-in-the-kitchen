import React from 'react';

export const Icon = ({ name, size = 20, style }) => (
  <i className={`ti ti-${name}`} aria-hidden="true" style={{ fontSize: size, ...style }} />
);

export const Button = ({ children, variant = 'primary', size, onClick, disabled, className = '', style }) => (
  <button
    className={`btn btn-${variant} ${size ? 'btn-' + size : ''} ${className}`}
    onClick={onClick}
    disabled={disabled}
    style={style}
  >
    {children}
  </button>
);

export const Sheet = ({ onClose, children, title, subtitle }) => (
  <>
    <div className="sheet-overlay" onClick={onClose} />
    <div className="sheet">
      <div className="sheet-handle" />
      {(title || subtitle) && (
        <div className="sheet-header">
          <div className="flex items-center justify-between">
            <div>
              {title && <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>}
              {subtitle && <p className="text-sm text-muted mt-4">{subtitle}</p>}
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close">
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="sheet-body">{children}</div>
    </div>
  </>
);

export const Banner = ({ type = 'success', icon, children, onClick }) => (
  <div className={`banner banner-${type}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
    <div className="flex items-center gap-8">
      {icon && <Icon name={icon} size={16} />}
      <span>{children}</span>
    </div>
  </div>
);

export const SectionLabel = ({ children }) => (
  <p className="section-label">{children}</p>
);

export const Divider = () => <div className="divider" />;

export const BudgetBar = ({ spent, budget }) => {
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const over = spent > budget;
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-secondary">Week estimated cost</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: over ? 'var(--danger)' : 'var(--text)' }}>
          ${spent.toFixed(2)} <span className="text-sm text-muted" style={{ fontWeight: 400 }}>of ${budget.toFixed(2)}</span>
        </span>
      </div>
      <div className="budget-bar">
        <div className={`budget-fill ${over ? 'over' : ''}`} style={{ width: pct + '%' }} />
      </div>
      {over && <p className="text-sm text-danger mt-4">Over budget by ${(spent - budget).toFixed(2)}</p>}
    </div>
  );
};

export const Pill = ({ children, selected, onClick }) => (
  <div className={`pill ${selected ? 'selected' : ''}`} onClick={onClick}>{children}</div>
);

export const EmptyState = ({ icon, title, body, action }) => (
  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
    <Icon name={icon} size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
    <h3 style={{ marginBottom: 8 }}>{title}</h3>
    <p style={{ marginBottom: action ? 20 : 0 }}>{body}</p>
    {action}
  </div>
);

export const StepNumber = ({ n }) => (
  <div className="step-number">{n}</div>
);
