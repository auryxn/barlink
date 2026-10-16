import { useState, useEffect, useMemo } from 'react'
import {
  Star, Clock, Users, Pencil, Check, X, Beer, Handshake, Plus, Sparkles, Loader2,
} from 'lucide-react'
import { api } from '../api.js'
import { DRUNK, LANGS, timeUntil } from '../constants.js'

// Быстрые пресеты эмодзи-аватаров (как в seed).
const AVATAR_PRESETS = ['🦾', '🌸', '🎸', '🎧', '🧩', '🍸', '🍺', '🍻', '🥃', '🎲', '🌮', '🪩', '😎', '🐻', '🦊', '💃']
// Популярные интересы (можно добавить свои).
const INTEREST_PRESETS = ['#крафт', '#коктейли', '#настолки', '#рок', '#техно', '#пиво', '#танцы', '#концерт', '#кино', '#gourmet', '#знакомства', '#спорт']

export default function ProfileScreen({ me, onSwitchUser, onOpenBarLink, onMeUpdated }) {
  const [users, setUsers] = useState([])
  const [mine, setMine] = useState([])
  const [editing, setEditing] = useState(false)

  // draft состояния редактора
  const [dName, setDName] = useState('')
  const [dAge, setDAge] = useState('')
  const [dBio, setDBio] = useState('')
  const [dAvatar, setDAvatar] = useState('🙂')
  const [dInterests, setDInterests] = useState([])
  const [tagInput, setTagInput] = useState('')

  const [busy, setBusy] = useState(false)
  const [boosting, setBoosting] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.users().then(setUsers).catch(() => {})
    if (me) api.myBarlinks().then(setMine).catch(() => {})
    else setMine([])
  }, [me])

  const openEditor = () => {
    if (!me) return
    setDName(me.name || '')
    setDAge(me.age ?? '')
    setDBio(me.bio || '')
    setDAvatar(me.avatar || '🙂')
    setDInterests(Array.isArray(me.interests) ? me.interests : [])
    setTagInput('')
    setErr('')
    setEditing(true)
  }

  const cancel = () => { setEditing(false); setErr('') }

  const addTag = (raw) => {
    let t = raw.trim()
    if (!t) return
    if (!t.startsWith('#')) t = '#' + t
    if (!dInterests.includes(t) && dInterests.length < 12) setDInterests([...dInterests, t])
    setTagInput('')
  }

  const togglePreset = (t) => {
    setDInterests(prev => prev.includes(t) ? prev.filter(x => x !== t) : (prev.length < 12 ? [...prev, t] : prev))
  }

  const save = async () => {
    if (!dName.trim()) { setErr('Имя не может быть пустым'); return }
    setBusy(true); setErr('')
    try {
      const { user } = await api.updateMe({
        name: dName,
        age: dAge === '' ? null : Number(dAge),
        bio: dBio,
        avatar: dAvatar,
        interests: dInterests,
      })
      onMeUpdated?.(user)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 1600)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const bump = async (kind) => {
    setBoosting(true)
    try {
      const { user } = kind === 'beer' ? await api.addBeer() : await api.addMeeting()
      onMeUpdated?.(user)
    } catch {} finally {
      setBoosting(false)
    }
  }

  // «бухарик»-рейтинг: 5 «пивных» уровней по счётчику выпитых пив + встреч.
  const stats = useMemo(() => {
    const beers = me?.beers || 0
    const meetings = me?.meetings || 0
    const rating = Number(me?.drink_rating || 0)
    const level = Math.min(5, Math.floor(beers / 5))      // каждые 5 пив — уровень
    return { beers, meetings, rating, level }
  }, [me])

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      {me ? (
        editing ? (
          <ProfileEditor
            dAvatar={dAvatar} setDAvatar={setDAvatar}
            dName={dName} setDName={setDName}
            dAge={dAge} setDAge={setDAge}
            dBio={dBio} setDBio={setDBio}
            dInterests={dInterests} togglePreset={togglePreset}
            tagInput={tagInput} setTagInput={setTagInput} addTag={addTag}
            onRemove={t => setDInterests(dInterests.filter(x => x !== t))}
            onSave={save} onCancel={cancel} busy={busy} err={err}
          />
        ) : (
          <>
            {/* ---------- Шапка профиля ---------- */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', flex: '0 0 auto',
                  background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
                }}>{me.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name}</b>
                    {me.age ? <span className="chip" style={{ fontSize: 11 }}>{me.age}</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{me.city || 'Vilnius'}</div>
                </div>
                <button onClick={openEditor} className="btn ghost"
                  style={{ width: 40, height: 40, padding: 0, borderRadius: 12 }} aria-label="Редактировать профиль">
                  <Pencil size={17} />
                </button>
              </div>

              {me.bio ? (
                <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 10, lineHeight: 1.35 }}>{me.bio}</div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Новичок в BarLink — добавь био и интересы ✏️</div>
              )}

              {Array.isArray(me.interests) && me.interests.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {me.interests.map(t => <span key={t} className="chip" style={{ fontSize: 11 }}>{t}</span>)}
                </div>
              )}
            </div>

            {/* ---------- «Бухарик»-рейтинг ---------- */}
            <div className="card" style={{ marginBottom: 14, background: 'linear-gradient(135deg, rgba(255,138,61,.14), rgba(255,77,141,.10))', borderColor: 'rgba(255,138,61,.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color="var(--accent)" />
                  <b style={{ fontSize: 13 }}>Бухарик-рейтинг</b>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-2)', fontWeight: 700 }}>
                  <Star size={14} fill="currentColor" /> {stats.rating.toFixed(1)}
                </div>
              </div>

              {/* уровень в виде «пивных» баночек */}
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <Beer key={i} size={20}
                    color={i < stats.level ? 'var(--accent)' : 'var(--line)'}
                    fill={i < stats.level ? 'var(--accent)' : 'none'} />
                ))}
                <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>
                  Уровень {stats.level}/5
                </span>
              </div>

              {/* счётчики */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                <Counter icon={<Beer size={16} color="var(--accent)" />} value={stats.beers} label="пив выпито"
                  onClick={() => bump('beer')} disabled={boosting} />
                <Counter icon={<Handshake size={16} color="var(--accent-2)" />} value={stats.meetings} label="встреч"
                  onClick={() => bump('meeting')} disabled={boosting} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
                Нажми на счётчик, чтобы отметить 🍺 или новую встречу
              </div>
            </div>

            {saved && (
              <div className="chip hot fade-up" style={{ marginBottom: 12 }}>
                <Check size={12} /> Профиль обновлён
              </div>
            )}
          </>
        )
      ) : (
        <div className="card" style={{ textAlign: 'center', marginBottom: 16, color: 'var(--muted)' }}>
          Выбери профиль ниже, чтобы войти 👇
        </div>
      )}

      {/* ---------- Мои BarLinks ---------- */}
      <div className="label">Мои BarLinks · {mine.length}</div>
      {mine.length === 0 && <div className="card" style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Пока пусто. Найди встречу на карте 🗺️</div>}
      {mine.map(bl => (
        <div key={bl.id} className="card" style={{ marginBottom: 10 }} onClick={() => onOpenBarLink(bl.id)}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <b style={{ fontSize: 14 }}>{bl.venue?.photo} {bl.venue?.name}</b>
            <span className="chip">{DRUNK[bl.drunk]?.emoji} {DRUNK[bl.drunk]?.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            <span><Users size={11} /> {bl.joined}/{bl.size}</span>
            <span><Clock size={11} /> {timeUntil(bl.start_time)}</span>
            <span>{LANGS[bl.language]?.flag} {bl.language.toUpperCase()}</span>
          </div>
        </div>
      ))}

      {/* ---------- Демо-профили ---------- */}
      <div className="label" style={{ marginTop: 20 }}>Демо-профили (для переключения)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {users.map(u => (
          <button key={u.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderColor: me?.id === u.id ? 'var(--accent)' : undefined }}
            onClick={() => onSwitchUser(u.id)}>
            <span style={{ fontSize: 22 }}>{u.avatar}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}><Star size={9} /> {Number(u.drink_rating || 0).toFixed(1)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function Counter({ icon, value, label, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="card"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        background: 'rgba(255,255,255,.03)', padding: '10px 12px',
      }}>
      <div style={{
        width: 34, height: 34, borderRadius: 12, flex: '0 0 auto',
        background: 'var(--panel-2)', border: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
      </div>
      <Plus size={14} color="var(--muted)" style={{ marginLeft: 'auto' }} />
    </button>
  )
}

// ---------------------------------------------------------------------------
function ProfileEditor({
  dAvatar, setDAvatar, dName, setDName, dAge, setDAge, dBio, setDBio,
  dInterests, togglePreset, tagInput, setTagInput, addTag, onRemove, onSave, onCancel, busy, err,
}) {
  return (
    <div className="card fade-up" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <b style={{ fontSize: 15 }}>Редактировать профиль</b>
        <button onClick={onCancel} className="btn ghost" style={{ width: 34, height: 34, padding: 0, borderRadius: 10 }}>
          <X size={16} />
        </button>
      </div>

      {/* Аватар */}
      <label className="label">Аватар</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flex: '0 0 auto',
          background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>{dAvatar}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {AVATAR_PRESETS.map(a => (
            <button key={a} onClick={() => setDAvatar(a)}
              style={{
                fontSize: 18, width: 32, height: 32, borderRadius: 10, cursor: 'pointer',
                background: dAvatar === a ? 'rgba(255,138,61,.2)' : 'var(--panel-2)',
                border: `1px solid ${dAvatar === a ? 'var(--accent)' : 'var(--line)'}`,
              }}>{a}</button>
          ))}
        </div>
      </div>

      {/* Имя + возраст */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 2 }}>
          <label className="label">Имя</label>
          <input className="field" value={dName} maxLength={40}
            onChange={e => setDName(e.target.value)} placeholder="Как тебя зовут?" />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Возраст</label>
          <input className="field" type="number" min={16} max={120} value={dAge}
            onChange={e => setDAge(e.target.value)} placeholder="—" />
        </div>
      </div>

      {/* Био */}
      <label className="label">Био</label>
      <textarea className="field" rows={3} maxLength={300} value={dBio}
        onChange={e => setDBio(e.target.value)} placeholder="Пара слов о тебе…"
        style={{ resize: 'none', fontFamily: 'inherit', marginBottom: 12 }} />

      {/* Интересы */}
      <label className="label">Интересы · {dInterests.length}/12</label>
      {dInterests.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {dInterests.map(t => (
            <button key={t} className="chip hot" onClick={() => onRemove(t)}
              style={{ cursor: 'pointer', fontSize: 11 }}>
              {t} <X size={11} />
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input className="field" value={tagInput} maxLength={30}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
          placeholder="Добавить интерес…" />
        <button className="btn ghost" onClick={() => addTag(tagInput)} style={{ width: 46, padding: 0 }}>
          <Plus size={18} />
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {INTEREST_PRESETS.map(t => (
          <button key={t} onClick={() => togglePreset(t)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
              background: dInterests.includes(t) ? 'rgba(255,138,61,.15)' : 'var(--panel-2)',
              border: `1px solid ${dInterests.includes(t) ? 'rgba(255,138,61,.4)' : 'var(--line)'}`,
              color: dInterests.includes(t) ? 'var(--accent)' : 'var(--muted)',
            }}>{t}</button>
        ))}
      </div>

      {err && <div style={{ color: 'var(--pink)', fontSize: 12, marginBottom: 10 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn ghost" onClick={onCancel} disabled={busy} style={{ flex: 1 }}>Отмена</button>
        <button className="btn" onClick={onSave} disabled={busy} style={{ flex: 2 }}>
          {busy ? <><Loader2 size={16} className="spin" /> Сохраняем…</> : <><Check size={16} /> Сохранить</>}
        </button>
      </div>
    </div>
  )
}
