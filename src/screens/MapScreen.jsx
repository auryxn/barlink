import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Users, Star, ChevronRight } from 'lucide-react'
import { api } from '../api.js'
import { DEFAULT_CENTER } from '../constants.js'

function barIcon(active) {
  const badge = active > 0
    ? `<span style="position:absolute;top:-6px;right:-6px;background:#ff4d8d;color:#fff;border-radius:999px;font-size:10px;font-weight:700;padding:1px 5px;border:2px solid #111">${active}</span>`
    : ''
  return L.divIcon({
    className: 'bar-marker',
    html: `<div style="position:relative">
      <div class="bar-pin"><span>🍺</span></div>${badge}
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  })
}

function Recenter({ center }) {
  const map = useMap()
  useEffect(() => { map.setView(center, map.getZoom(), { animate: true }) }, [center])
  return null
}

export default function MapScreen({ onOpenVenue }) {
  const [venues, setVenues] = useState([])
  const [selected, setSelected] = useState(null)
  const [center, setCenter] = useState(DEFAULT_CENTER)

  useEffect(() => { api.venues().then(setVenues).catch(() => {}) }, [])

  const pick = (v) => { setSelected(v); setCenter([v.lat, v.lng]) }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <MapContainer center={DEFAULT_CENTER} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <Recenter center={center} />
        {venues.map(v => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={barIcon(v.active_links)}
            eventHandlers={{ click: () => pick(v) }}
          />
        ))}
      </MapContainer>

      {/* top overlay */}
      <div style={{ position: 'absolute', top: 10, left: 12, right: 12, zIndex: 500 }}>
        <div className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={16} color="var(--accent)" />
          <b style={{ fontSize: 14 }}>Вильнюс</b>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
            {venues.reduce((a, v) => a + v.active_links, 0)} активных BarLink
          </span>
        </div>
      </div>

      {/* venue bottom sheet */}
      {selected && (
        <div className="fade-up" style={{ position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 500 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              height: 96, background: 'linear-gradient(135deg,#ff8a3d55,#ff4d8d55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48,
            }}>{selected.photo}</div>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 17 }}>{selected.name}</b>
                <span className="chip hot"><Star size={11} fill="currentColor" /> {selected.rating}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>{selected.address}</div>
              <p style={{ fontSize: 13, color: '#cfcfe0', margin: '0 0 12px', lineHeight: 1.4 }}>{selected.description}</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <span className="chip"><Users size={11} /> {selected.active_links} встреч</span>
                <span className="chip">{selected.kind === 'club' ? '🎧 клуб' : '🍺 бар'}</span>
              </div>
              <button className="btn" onClick={() => onOpenVenue(selected.id)}>
                Открыть <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
