import { useState } from 'react'
import { useSplitStore } from '../store/useSplitStore'
import { showToast } from './Toast'
import SwipeableModal from './SwipeableModal'
import { buildDeepLink, copyToClipboard } from '../utils/deepLink'

interface Props {
  visible: boolean
  onClose: () => void
}

export default function GroupsModal({ visible, onClose }: Props) {
  const savedGroups = useSplitStore((s) => s.savedGroups)
  const participants = useSplitStore((s) => s.participants)
  const saveGroup = useSplitStore((s) => s.saveGroup)
  const loadGroup = useSplitStore((s) => s.loadGroup)
  const deleteGroup = useSplitStore((s) => s.deleteGroup)
  const [newGroupName, setNewGroupName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleSave = () => {
    const name = newGroupName.trim()
    if (!name || participants.length === 0) return
    saveGroup(name)
    setNewGroupName('')
    showToast(`Grupo "${name}" guardado`, 'success')
  }

  const handleLoad = (name: string) => {
    loadGroup(name)
    showToast(`Grupo "${name}" cargado`, 'success')
    onClose()
  }

  const handleDelete = (name: string) => {
    if (confirmDelete === name) {
      deleteGroup(name)
      setConfirmDelete(null)
      showToast(`Grupo eliminado`, 'info')
    } else {
      setConfirmDelete(name)
    }
  }

  const handleShare = async (group: typeof savedGroups[0]) => {
    const names = group.members.map(m => typeof m === 'string' ? m : m.name)
    const link = buildDeepLink({ names })

    // Try Web Share API first, fallback to clipboard
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Grupo "${group.name}" · Splitr`,
          text: `Abre este grupo en Splitr`,
          url: link,
        })
        return
      } catch {
        // user canceled or failed, fall through to clipboard
      }
    }

    const ok = await copyToClipboard(link)
    if (ok) showToast('Link copiado al portapapeles', 'success')
    else showToast('No se pudo copiar', 'error')
  }

  return (
    <SwipeableModal visible={visible} onClose={onClose}>
        <h2 className="modal-title">Mis Grupos</h2>

        {/* Lista de grupos guardados */}
        {savedGroups.length === 0 ? (
          <div className="groups-empty">
            <p>No hay grupos guardados todavía</p>
          </div>
        ) : (
          <div className="groups-list">
            {savedGroups.map((group) => (
              <div key={group.name} className="saved-group-item">
                <div className="saved-group-info" onClick={() => handleLoad(group.name)}>
                  <div className="saved-group-name">{group.name}</div>
                  <div className="saved-group-meta">
                    {group.count ?? group.members.length} participante{(group.count ?? group.members.length) !== 1 ? 's' : ''} · {group.members.slice(0, 3).map(m => typeof m === 'string' ? m : m.name).join(', ')}{group.members.length > 3 ? '...' : ''}
                  </div>
                </div>
                <button
                  onClick={() => handleShare(group)}
                  aria-label={`Compartir grupo ${group.name}`}
                  className="btn btn-icon group-share-btn"
                  title="Compartir link"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
                <button
                  onClick={() => handleDelete(group.name)}
                  aria-label={`Eliminar grupo ${group.name}`}
                  className={`btn btn-icon group-delete-btn ${confirmDelete === group.name ? 'btn-icon-danger' : ''}`}
                  title={confirmDelete === group.name ? 'Confirmar eliminar' : 'Eliminar'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Guardar participantes actuales */}
        {participants.length > 0 && (
          <>
            <div className="neon-divider" />
            <p className="groups-save-hint">Guardar participantes actuales como:</p>
            <div className="input-group">
              <input
                type="text"
                className="input-text"
                placeholder="Nombre del grupo..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                maxLength={30}
              />
              <button className="btn btn-impact" onClick={handleSave}>Guardar</button>
            </div>
          </>
        )}

        <button className="btn btn-accent modal-close-btn" onClick={onClose}>
          Cerrar
        </button>
    </SwipeableModal>
  )
}
