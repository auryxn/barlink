import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Send, Users, Globe, Clock, Star, LogOut, MessageCircle } from 'lucide-react'
import { api } from '../api.js'
import { DRUNK, LANGS, timeUntil } from '../constants.js'

export default function BarLinkScreen({ id, me, onBack, onJoinChanged }) {
  const [bl, setBl] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('info')
  const scrollRef = useRef(null)

  const load = async () => {
    const b = await api.barlink(id)
    setBl(b)
    setMessages(await api.messages(id))
  }
  useEffect(() => { load() }, [id])

  // light polling for chat freshness
  useEffect(() => {
    if (tab !== 'chat') return
    const t = setInterval(async () => {
      try { setMessages(await api.messages(id)) } catch {}
    }, 3000)
    return () => clearInterval(t)
  }, [tab, id])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, tab])

  if (!bl) return <div style={{ padding: 20 }} className="pulse">Загрузка…</div>

  const d = DRUNK[bl.drunk] || DRUNK.slightly
  const l = LANGS[bl.language] || LANGS.ru
  const isMember = me && bl.participants.some(p => p.id === me.id)
  const isFull = bl.joined >= bl.size && !isMember

  const toggleJoin = async () => {
    setBusy(true)
    try {
      if (isMember) await api.leave(id)
      else await api.join(id)
      await load()
      onJoinChanged && onJoinChanged()
    } catch (e) { alert(e.message) } finally { setBusy(false) }
  }

  const send = async () => {
    if (!text.trim()) return
    const t = text; setText('')
    try {
      const m = await api.sendMessage(id, t)
      setMessages(prev => [...prev, m])
    } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)' }}>
        <button onClick={onBack} className="btn ghost" style={{ width: 40, height: 40, padding: 0, borderRadius: 12 }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 16 }}>{bl.venue?.photo} {bl.venue?.name}</b>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>хост {bl.host?.avatar} {bl.host?.name}</div>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px' }}>
        <button className="btn ghost" style={{ flex: 1, padding: '8px 0', background: tab === 'info' ? 'var(--panel-2)' : undefined, borderColor: tab === 'info' ? 'var(--accent)' : undefined }} onClick={() => setTab('info')}>Инфо</button>
        <button className="btn ghost" style={{ flex: 1, padding: '8px 0', background: tab === 'chat' ? 'var(--panel-2)' : undefined, borderColor: tab === 'chat' ? 'var(--accent)' : undefined }} onClick={() => setTab('chat')}>
          <MessageCircle size={14} /> Чат {messages.length > 0 && `(${messages.length})`}
        </button>
      </div>

      {tab === 'info' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            <span className="chip" style={{ color: d.color, borderColor: d.color + '66' }}>{d.emoji} {d.label}</span>
            <span className="chip"><Globe size={11} /> {l.flag} {l.label}</span>
            <span className="chip"><Clock size={11} /> {timeUntil(bl.start_time)}</span>
            <span className="chip"><Users size={11} /> {bl.joined}/{bl.size}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {bl.tags.map(t => <span key={t} className="chip hot">{t}</span>)}
          </div>
          {bl.note && <div className="card" style={{ fontSize: 13, color: '#cfcfe0', marginBottom: 14 }}>{bl.note}</div>}

          <div className="label">Участники · {bl.joined}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bl.participants.map(p => (
              <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10 }}>
                <span style={{ fontSize: 22 }}>{p.avatar || '🙂'}</span>
                <b style={{ fontSize: 14 }}>{p.name}</b>
                {p.id === bl.host_id && <span className="chip" style={{ marginLeft: 'auto' }}>хост</span>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(m => {
              const mine = me && m.user_id === me.id
              return (
                <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  {!mine && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{m.user_avatar} {m.user_name}</div>}
                  <div style={{
                    padding: '9px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.35,
                    background: mine ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : 'var(--panel-2)',
                    color: mine ? '#1a0f00' : 'var(--text)',
                  }}>{m.text}</div>
                </div>
              )
            })}
          </div>
          {isMember ? (
            <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
              <input className="field" placeholder="Сообщение…" value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()} />
              <button className="btn" style={{ width: 48, padding: 0 }} onClick={send}><Send size={18} /></button>
            </div>
          ) : (
            <div style={{ padding: '10px 16px', fontSize: 13, color: 'var(--muted)', textAlign: 'center', borderTop: '1px solid var(--line)' }}>
              Присоединись, чтобы писать в чат
            </div>
          )}
        </div>
      )}

      {/* join CTA */}
      {tab === 'info' && (
        <div style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
          <button className={isMember ? 'btn ghost' : 'btn pink'} disabled={busy || isFull} onClick={toggleJoin}>
            {isMember ? <><LogOut size={16} /> Покинуть</> : isFull ? 'Мест нет' : '🍻 Присоединиться'}
          </button>
        </div>
      )}
    </div>
  )
}
