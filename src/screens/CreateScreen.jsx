import { useState } from 'react'
import { ChevronLeft, Plus, X } from 'lucide-react'
import { api } from '../api.js'
import { DRUNK, DRUNK_ORDER, LANGS } from '../constants.js'

export default function CreateScreen({ venueId, venueName, onBack, onCreated }) {
  const [size, setSize] = useState(4)
  const [drunk, setDrunk] = useState('slightly')
  const [lang, setLang] = useState('ru')
  const [when, setWhen] = useState('+1h')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const addTag = (raw) => {
    let t = raw.trim()
    if (!t) return
    if (!t.startsWith('#')) t = '#' + t
    if (!tags.includes(t) && tags.length < 6) setTags([...tags, t])
    setTagInput('')
  }

  const submit = async () => {
    setBusy(true); setErr('')
    const offsets = { '+30m': 1800, '+1h': 3600, '+2h': 7200, '+4h': 14400 }
    try {
      const bl = await api.createBarlink({
        venue_id: venueId,
        size,
        drunk,
        language: lang,
        start_time: Math.floor(Date.now() / 1000) + (offsets[when] || 3600),
        tags,
        note,
      })
      onCreated(bl.id)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} className="btn ghost" style={{ width: 40, height: 40, padding: 0, borderRadius: 12 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <b style={{ fontSize: 18 }}>Создать BarLink</b>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{venueName}</div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="label">Сколько человек</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4, 5, 6, 8].map(n => (
              <button key={n} onClick={() => setSize(n)} className="btn ghost"
                style={{ flex: 1, padding: '10px 0', background: size === n ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : undefined, color: size === n ? '#1a0f00' : undefined }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Степень опьянения</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DRUNK_ORDER.map(k => {
              const d = DRUNK[k]
              const active = drunk === k
              return (
                <button key={k} onClick={() => setDrunk(k)} className="btn ghost"
                  style={{ justifyContent: 'flex-start', padding: '12px 14px', borderColor: active ? d.color : undefined, background: active ? d.color + '22' : undefined }}>
                  <span style={{ fontSize: 18 }}>{d.emoji}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{d.label}</span>
                  {active && <span style={{ color: d.color }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="label">Язык общения</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(LANGS).map(([k, l]) => (
              <button key={k} onClick={() => setLang(k)} className="btn ghost"
                style={{ flex: 1, background: lang === k ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : undefined, color: lang === k ? '#1a0f00' : undefined }}>
                {l.flag} {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Время начала</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['+30m', '30 мин'], ['+1h', '1 час'], ['+2h', '2 часа'], ['+4h', '4 часа']].map(([k, label]) => (
              <button key={k} onClick={() => setWhen(k)} className="btn ghost"
                style={{ flex: 1, fontSize: 13, background: when === k ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : undefined, color: when === k ? '#1a0f00' : undefined }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Хештеги</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {tags.map(t => (
              <span key={t} className="chip hot">{t}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setTags(tags.filter(x => x !== t))} />
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field" placeholder="#настолки" value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag(tagInput)} />
            <button className="btn ghost" style={{ width: 48 }} onClick={() => addTag(tagInput)}><Plus size={18} /></button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {['#настолки', '#танцы', '#пиво', '#рок', '#коктейли', '#знакомства'].map(t => (
              <span key={t} className="chip" style={{ cursor: 'pointer' }} onClick={() => addTag(t)}>{t}</span>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Заметка (необязательно)</label>
          <input className="field" placeholder="Ищем 2-3 человека на вечер" value={note}
            onChange={e => setNote(e.target.value)} />
        </div>

        {err && <div style={{ color: 'var(--pink)', fontSize: 13 }}>{err}</div>}

        <button className="btn" disabled={busy} onClick={submit}>
          {busy ? 'Создаём…' : '🍻 Создать BarLink'}
        </button>
      </div>
    </div>
  )
}
