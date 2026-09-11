import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Dialog({ open, title, eyebrow, children, actions, onClose, danger = false }: { open: boolean; title: string; eyebrow?: string; children: ReactNode; actions: ReactNode; onClose: () => void; danger?: boolean }) {
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`dialog ${danger ? 'dialog-danger' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <header className="dialog-header">
        <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 id="dialog-title">{title}</h2></div>
        <button className="icon-button" aria-label="Cerrar diálogo" onClick={onClose}><Icon name="close"/></button>
      </header>
      <div className="dialog-body">{children}</div>
      <footer className="dialog-actions">{actions}</footer>
    </section>
  </div>;
}

export function EmptyState({ icon = 'library', title, children, action }: { icon?: string; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={28}/></div><h2>{title}</h2><div className="empty-copy">{children}</div>{action && <div className="empty-action">{action}</div>}</div>;
}

export function Notice({ tone = 'neutral', children }: { tone?: 'neutral' | 'warning' | 'success' | 'error'; children: ReactNode }) {
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{tone === 'warning' && <Icon name="warning"/>}{tone === 'success' && <Icon name="check"/>}<span>{children}</span></div>;
}
