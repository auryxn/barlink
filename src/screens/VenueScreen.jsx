import { useState, useEffect } from 'react'
import { ChevronLeft, Star, Users, Plus, Clock, Globe, Hash } from 'lucide-react'
import { api } from '../api.js'
import { DRUNK, LANGS, timeUntil } from '../constants.js'

function BarLinkCard({ bl, onOpen }) {
  const d = DRUNK[bl.drunk] || DRUNK.slightly
  const l = LANGS[bl.language] || LANGS.ru
  return (
    <div className="card fade-up" style={{ marginBottom: 10 }} onClick={() => onOpen(bl.id)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--panel-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{bl.host?.avatar || '🙂'}</div>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 14 }}>{bl.host?.name}</b>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>хост · рейтинг {bl.host?.drink_rating?.toFixed(1)}</div>
        </div>
        <span className="chip" style={{ color: d.color, borderColor: d.color + '66' }}>{d.emoji} {d.label}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {bl.tags.map(t => <span key={t} className="chip">{t}</span>)}
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={12} /> {bl.joined}/{bl.size}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Globe size={12} /> {l.flag} {l.label}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} /> {timeUntil(bl.start_time)}</span>
      </div>
    </div>
  )
}

export default function VenueScreen({ venueId, onBack, onOpenBarLink, onCreate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.venue(venueId).then(setData).finally(() => setLoading(false))
  }
  useEffect(load, [venueId])

  if (loading || !data) {
    return <div style={{ padding: 20, color: 'var(--muted)' }} className="pulse">Загрузка…</div>
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ position: 'relative', height: 150, background: 'linear-gradient(135deg,#ff8a3d44,#ff4d8d44)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
        {data.photo}
        <button onClick={onBack} className="btn ghost" style={{ position: 'absolute', top: 10, left: 10, width: 40, height: 40, padding: 0, borderRadius: 12 }}>
          <ChevronLeft size={20} />
        </button>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 20 }}>{data.name}</b>
          <span className="chip hot"><Star size={12} fill="currentColor" /> {data.rating}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 10px' }}>{data.address}</div>
        <p style={{ fontSize: 13, color: '#cfcfe0', lineHeight: 1.5, marginBottom: 16 }}>{data.description}</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => onCreate(venueId)}>
            <Plus size={16} /> Создать BarLink
          </button>
        </div>

        <div className="label" style={{ marginBottom: 10 }}>Активные встречи · {data.links.length}</div>
        {data.links.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Пока нет встреч — стань первым! 🍻
          </div>
        )}
        {data.links.map(bl => (
          <BarLinkCard key={bl.id} bl={bl} onOpen={onOpenBarLink} />
        ))}
      </div>
    </div>
  )
}
