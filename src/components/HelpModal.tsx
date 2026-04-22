import { useState } from 'react'
import SwipeableModal from './SwipeableModal'

interface Props {
  visible: boolean
  onClose: () => void
}

type HelpTab = 'install' | 'modes' | 'features'

export default function HelpModal({ visible, onClose }: Props) {
  const [tab, setTab] = useState<HelpTab>('install')

  return (
    <SwipeableModal visible={visible} onClose={onClose} tall>
        {/* Tabs */}
        <div className="help-tabs">
          {(['install', 'modes', 'features'] as HelpTab[]).map((t) => (
            <button
              key={t}
              className={`help-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'install' ? 'Instalar' : t === 'modes' ? 'Modos' : 'Funciones'}
            </button>
          ))}
        </div>

        {/* Tab: Instalar */}
        {tab === 'install' && (
          <div className="help-content">
            <p className="help-intro-text">
              Añade Splitr a tu pantalla de inicio para usarla sin conexión.
            </p>
            <div className="help-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              <div>
                <strong className="help-item-title">Android · Chrome</strong>
                <p>Menú (3 puntos) → Añadir a pantalla de inicio</p>
              </div>
            </div>
            <div className="help-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"/></svg>
              <div>
                <strong className="help-item-title">iPhone · Safari</strong>
                <p>Botón compartir → Añadir a pantalla de inicio</p>
              </div>
            </div>
            <div className="help-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <div>
                <strong className="help-item-title">PC · Chrome / Edge</strong>
                <p>Icono de instalación en la barra de direcciones</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Modos */}
        {tab === 'modes' && (
          <div className="help-content">
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"/><path d="M12 1l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 1z"/></svg>
              <div><strong>Normal</strong> — Elige una persona al azar. La suerte ajusta la probabilidad.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <div><strong>Eliminación</strong> — El elegido queda fuera. Ronda hasta que quede uno.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              <div><strong>Equipo</strong> — Elige N personas al azar de una vez.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
              <div><strong>Orden</strong> — Genera un orden completo y lo revela uno a uno.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
              <div><strong>Venganza</strong> — El último elegido tiene 5x más probabilidades en la siguiente ronda.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5H5l9 9 1.41-1.41L6.92 5zm11.5 11.5L15 14l-1.5 1.5 1.06 1.06L16 15.12l1.44 1.44 1.06-1.06z"/></svg>
              <div><strong>Duelo</strong> — Toca 2 avatares para enfrentarlos. El azar decide.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4l2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.41l-5.29-5.3z"/></svg>
              <div><strong>Dividir</strong> — Divide al grupo en 2 equipos aleatorios al instante.</div>
            </div>
          </div>
        )}

        {/* Tab: Funciones */}
        {tab === 'features' && (
          <div className="help-content">
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l7 4"/></svg>
              <div><strong>Ruleta Rusa</strong> — La ruleta elimina un sector por ronda.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/><path d="M8 12h8"/></svg>
              <div><strong>Cara o Cruz</strong> — Lanza una moneda entre dos opciones.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/></svg>
              <div><strong>Sorteo por voz</strong> — Di "Sortear", "Venga" o "Ya" para disparar (Chrome/Android).</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.2"/></svg>
              <div><strong>Suerte</strong> — Toca un avatar para ajustar su probabilidad (1=máxima, 5=mínima). Muestra el % real.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
              <div><strong>Grupos guardados</strong> — Guarda tus grupos con nombre y recárgalos en un toque.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/></svg>
              <div><strong>Compartir resultado</strong> — Genera una tarjeta PNG y la comparte por WhatsApp o descarga.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <div><strong>Stats + historial</strong> — Podio, donut chart y lista cronológica de sorteos. Persiste entre sesiones.</div>
            </div>
            <div className="help-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9"/></svg>
              <div><strong>Ajustes</strong> — Sonido, vibración, partículas, flash, brillo del glow, velocidad del countdown y ruleta.</div>
            </div>
          </div>
        )}

        <button className="btn btn-accent modal-close-btn" onClick={onClose}>
          Cerrar
        </button>
    </SwipeableModal>
  )
}
