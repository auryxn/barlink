import { useState, useEffect } from 'react'
import { Users, Clock, Globe, Search } from 'lucide-react'
import { api } from '../api.js'
import { DRUNK, LANGS, timeUntil } from '../constants.js'

export default function FeedScreen({ onOpenBarLink }) {
  const [links, setLinks] = useState([])
  const [q, setQ] = useState('')

  useEffect(() => {
    const load = () => api.barlinks().then(setLinks).catch(() => {})
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  const filtered = links.filter(bl => {
    if (!q.trim()) return true
    const hay = [bl.venue?.name, bl.host?.name, ...(bl.tags || [])].join(' ').toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Search size={18} color="var(--muted)" />
        <input className="field" placeholder="Поиск: #настолки, бар, имя…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="label">Активные BarLinks · {filtered.length}</div>
      {filtered.map(bl => {
        const d = DRUNK[bl.drunk] || DRUNK.slightly
        const l = LANGS[bl.language] || LANGS.ru
        return (
          <div key={bl.id} className="card fade-up" style={{ marginBottom: 10 }} onClick={() => onOpenBarLink(bl.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{bl.venue?.photo}</span>
              <b style={{ fontSize: 15, flex: 1 }}>{bl.venue?.name}</b>
              <span className="chip" style={{ color: d.color, borderColor: d.color + '66' }}>{d.emoji}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {bl.tags.map(t => <span key={t} className="chip hot">{t}</span>)}
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
              <span><Users size={11} /> {bl.joined}/{bl.size}</span>
              <span><Globe size={11} /> {l.flag}</span>
              <span><Clock size={11} /> {timeUntil(bl.start_time)}</span>
              <span style={{ marginLeft: 'auto' }}>💬 {bl.msg_count}</span>
            </div>
          </div>
        )
      })}
      {filtered.length === 0 && <div className="card" style={{ color: 'var(--muted)', textAlign: 'center' }}>Ничего не найдено 🤷</div>}
    </div>
  )
}
