import { useState } from 'react'
import { purchase, restorePurchases } from '../utils/billing'
import { unlockSkin, getUnlockedSkins, selectSkin, getProSkins } from '../utils/skins'
import { showToast } from './Toast'
import { Icon } from '../utils/icons'
import SwipeableModal from './SwipeableModal'

const PRO_SKINS = getProSkins()

const MODE_LABELS: Record<string, string> = {
  normal: 'Normal', elimination: 'Eliminación', team: 'Equipo',
  order: 'Orden', duel: 'Duelo', revenge: 'Revancha',
}

interface Props {
  visible: boolean
  onClose: () => void
}

export default function PaywallModal({ visible, onClose }: Props) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(getUnlockedSkins)

  if (!visible) return null

  const allOwned = PRO_SKINS.every(s => unlocked[s.id])

  const handleBuySkin = async (skinId: string) => {
    setProcessing(skinId)
    try {
      const result = await purchase(skinId)
      if (result.success) {
        unlockSkin(skinId)
        
        // Auto-select the purchased skin
        const skin = PRO_SKINS.find(s => s.id === skinId)
        if (skin) {
          // Find the mode for this skin
          const mode = skin.id.split('_')[0] // e.g., 'elim_slots' -> 'elim' -> 'elimination'
          const modeMap: Record<string, string> = {
            'elim': 'elimination',
            'order': 'order',
            'normal': 'normal',
            'team': 'team',
            'duel': 'duel',
            'revenge': 'revenge'
          }
          const fullMode = modeMap[mode] || mode
          selectSkin(fullMode, skinId)
          console.log(`🎨 Auto-selected ${skinId} for ${fullMode} mode`)
        }
        
        setUnlocked(getUnlockedSkins())
        showToast('Desbloqueado y activado', 'success')
      } else if (result.error && result.error !== 'Cancelado') {
        showToast('Error: ' + result.error, 'error')
      }
    } catch {
      showToast('Error al procesar', 'error')
    }
    setProcessing(null)
  }

  const handleBuyBundle = async () => {
    setProcessing('bundle')
    try {
      const result = await purchase('pro_bundle')
      if (result.success) {
        PRO_SKINS.forEach(s => unlockSkin(s.id))
        setUnlocked(getUnlockedSkins())
        showToast('Splitr Pro desbloqueado', 'success')
        setTimeout(onClose, 1200)
      } else if (result.error && result.error !== 'Cancelado') {
        showToast('Error: ' + result.error, 'error')
      }
    } catch {
      showToast('Error al procesar', 'error')
    }
    setProcessing(null)
  }

  const handleRestore = async () => {
    setProcessing('restore')
    try {
      const restored = await restorePurchases()
      if (restored.length > 0) {
        restored.forEach((id: string) => unlockSkin(id))
        setUnlocked(getUnlockedSkins())
        showToast(`${restored.length} compra${restored.length > 1 ? 's' : ''} restaurada${restored.length > 1 ? 's' : ''}`, 'success')
      } else {
        showToast('No se encontraron compras anteriores', 'info')
      }
    } catch {
      showToast('Error al restaurar', 'error')
    }
    setProcessing(null)
  }

  return (
    <SwipeableModal visible={visible} onClose={onClose} tall>
        <h2 className="modal-title paywall-title">
          <span className="paywall-heart">♥</span> Apoya a Splitr
        </h2>

        {/* Dev message — narrativa personal */}
        <div className="paywall-dev-message">
          <p>
            Hola, soy <strong>el dev indie</strong> detrás de Splitr.
            Hago esto solo, en mis ratos libres, y me tomó mucho cariño.
          </p>
          <p>
            Si lo usas y te gusta, considera apoyar con una donación.
            A cambio desbloqueas <strong>animaciones premium</strong> para cada modo.
          </p>
        </div>

        {/* Hero CTA — bundle como "todo el apoyo" */}
        <button
          className="btn paywall-bundle-cta"
          onClick={handleBuyBundle}
          disabled={allOwned || processing === 'bundle'}
        >
          {allOwned ? (
            <>
              <span className="paywall-bundle-emoji">{Icon.check({ size: 28 })}</span>
              <span className="paywall-bundle-label">Ya apoyaste. ¡Gracias!</span>
            </>
          ) : processing === 'bundle' ? (
            <>
              <span className="paywall-bundle-emoji paywall-loader">{Icon.loader({ size: 28 })}</span>
              <span className="paywall-bundle-label">Procesando...</span>
            </>
          ) : (
            <>
              <span className="paywall-bundle-emoji">{Icon.heart({ size: 28 })}</span>
              <div className="paywall-bundle-text">
                <span className="paywall-bundle-label">Apoya con una donación</span>
                <span className="paywall-bundle-sub">Desbloquea TODAS las animaciones · $4.99</span>
              </div>
            </>
          )}
        </button>

        {/* Lista de skins individuales */}
        <div className="paywall-tier-label">
          <span>O apoya con skins individuales</span>
          <small>$0.99 cada uno · aporte simbólico al dev</small>
        </div>

        <div className="paywall-list">
          {PRO_SKINS.map(skin => {
            const isOwned = !!unlocked[skin.id]
            const modeKey = skin.id.split('_')[0].replace('elim', 'elimination')
            const modeLabel = MODE_LABELS[modeKey] || modeKey
            return (
              <div key={skin.id} className="paywall-item">
                <div className="paywall-item-icon">
                  {Icon.star({ size: 20 })}
                </div>
                <div className="paywall-item-info">
                  <div className="paywall-item-name">{skin.name}</div>
                  <div className="paywall-item-desc">
                    {modeLabel} · {skin.desc}
                  </div>
                </div>
                <div className="paywall-item-action">
                  {isOwned ? (
                    <span className="paywall-badge-owned">✓ Activo</span>
                  ) : (
                    <button
                      className="btn btn-primary paywall-buy-btn"
                      onClick={() => handleBuySkin(skin.id)}
                      disabled={processing === skin.id}
                    >
                      {processing === skin.id ? '...' : `$${skin.price ?? 0.99}`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Thank you footer */}
        <div className="paywall-thanks">
          <p>
            Gracias por llegar hasta aquí. Tu apoyo, aunque sea solo usar la app, significa mucho.
          </p>
        </div>

        <div className="paywall-footer">
          <button
            onClick={handleRestore}
            disabled={processing === 'restore'}
            className="btn paywall-restore-btn"
          >
            {processing === 'restore' ? 'Restaurando...' : 'Restaurar compras anteriores'}
          </button>

          <button className="btn btn-accent modal-close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
    </SwipeableModal>
  )
}
