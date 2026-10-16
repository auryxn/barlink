import { useState, useEffect } from 'react'
import { Wifi, BatteryFull, Signal } from 'lucide-react'

export function StatusBar() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  const hh = String(time.getHours()).padStart(2, '0')
  const mm = String(time.getMinutes()).padStart(2, '0')
  return (
    <div className="statusbar">
      <span>{hh}:{mm}</span>
      <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <Signal size={13} />
        <Wifi size={13} />
        <BatteryFull size={16} />
      </span>
    </div>
  )
}

export function Phone({ children, tabbar }) {
  return (
    <div className="stage">
      <div className="phone">
        <div className="screen">
          <StatusBar />
          <div className="app-body">{children}</div>
          {tabbar}
          <div className="notch" />
        </div>
      </div>
    </div>
  )
}
