import { useState, useEffect } from 'react'
import { Map, Rss, Plus, MessageCircle, User, Users, ChevronRight } from 'lucide-react'
import { api, setToken } from './api.js'
import { Phone } from './components/Phone.jsx'
import MapScreen from './screens/MapScreen.jsx'
import VenueScreen from './screens/VenueScreen.jsx'
import CreateScreen from './screens/CreateScreen.jsx'
import BarLinkScreen from './screens/BarLinkScreen.jsx'
import FeedScreen from './screens/FeedScreen.jsx'
import ProfileScreen from './screens/ProfileScreen.jsx'

const TABS = [
  { id: 'map', label: 'Карта', Icon: Map },
  { id: 'feed', label: 'Лента', Icon: Rss },
  { id: 'create', label: 'Создать', Icon: Plus },
  { id: 'chats', label: 'Чаты', Icon: MessageCircle },
  { id: 'profile', label: 'Профиль', Icon: User },
]

export default function App() {
  const [tab, setTab] = useState('map')
  const [me, setMe] = useState(null)
  const [route, setRoute] = useState(null) // {name, params}
  const [toast, setToast] = useState(null)

  // bootstrap: restore session or auto-login demo user #1
  useEffect(() => {
    (async () => {
      try {
        const { user } = await api.me()
        if (user) { setMe(user); return }
      } catch {}
      try {
        const { token, user } = await api.login({ userId: 1 })
        setToken(token); setMe(user)
      } catch {}
    })()
  }, [])

  const switchUser = async (id) => {
    try {
      const { token, user } = await api.login({ userId: id })
      setToken(token); setMe(user)
    } catch {}
  }

  const openVenue = (id) => setRoute({ name: 'venue', params: { id } })
  const openBarLink = (id) => setRoute({ name: 'barlink', params: { id } })
  const openCreate = (id, name) => setRoute({ name: 'create', params: { id, name } })
  const back = () => setRoute(null)

  const onTab = (id) => {
    if (id === 'create') { setTab('map'); return }
    setRoute(null); setTab(id)
  }

  let content
  if (route?.name === 'venue') {
    content = <VenueScreen venueId={route.params.id} onBack={back} onOpenBarLink={openBarLink} onCreate={(vid) => openCreate(vid, '')} />
  } else if (route?.name === 'create') {
    content = <CreateScreen venueId={route.params.id} venueName={route.params.name || ''} onBack={back}
      onCreated={(id) => { setRoute({ name: 'barlink', params: { id } }) }} />
  } else if (route?.name === 'barlink') {
    content = <BarLinkScreen id={route.params.id} me={me} onBack={back} />
  } else if (tab === 'map') {
    content = <MapScreen onOpenVenue={openVenue} />
  } else if (tab === 'feed') {
    content = <FeedScreen onOpenBarLink={openBarLink} />
  } else if (tab === 'chats') {
    content = <ChatsScreen me={me} onOpenBarLink={openBarLink} />
  } else {
    content = <ProfileScreen me={me} onSwitchUser={switchUser} onOpenBarLink={openBarLink}
      onMeUpdated={setMe} />
  }

  return (
    <Phone tabbar={
      <div className="tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id && !route ? 'active' : ''} onClick={() => onTab(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    }>
      {content}
    </Phone>
  )
}

// ---------- Chats list (my barlinks with chats) ----------
import { DRUNK, timeUntil as tu } from './constants.js'

function ChatsScreen({ me, onOpenBarLink }) {
  const [mine, setMine] = useState([])
  useEffect(() => {
    if (!me) return
    api.myBarlinks().then(setMine).catch(() => {})
  }, [me])

  if (!me) return <div style={{ padding: 20, color: 'var(--muted)' }}>Войди в профиль 👤</div>

  return (
    <div style={{ padding: 16, paddingBottom: 30 }}>
      <div className="label">Чаты встреч · {mine.length}</div>
      {mine.length === 0 && (
        <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', fontSize: 13 }}>
          Ты пока не участвуешь ни в одной встрече. Присоединись на карте 🍻
        </div>
      )}
      {mine.map(bl => (
        <div key={bl.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => onOpenBarLink(bl.id)}>
          <span style={{ fontSize: 24 }}>{bl.venue?.photo}</span>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 14 }}>{bl.venue?.name}</b>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {bl.tags.slice(0, 2).join(' ')} · {DRUNK[bl.drunk]?.emoji} · {tu(bl.start_time)}
            </div>
          </div>
          <span className="chip"><Users size={11} /> {bl.joined}</span>
          <ChevronRight size={16} color="var(--muted)" />
        </div>
      ))}
    </div>
  )
}
