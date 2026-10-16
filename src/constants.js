// Shared constants + tiny helpers

export const DRUNK = {
  sober:    { label: 'Трезвый',      emoji: '😇', color: '#35d07f' },
  slightly: { label: 'Слегка',       emoji: '🙂', color: '#7ed957' },
  well:     { label: 'Уже хорошо',   emoji: '😄', color: '#ffc93c' },
  wasted:   { label: 'В говно',      emoji: '🤪', color: '#ff4d8d' },
}

export const DRUNK_ORDER = ['sober', 'slightly', 'well', 'wasted']

export const LANGS = {
  ru: { label: 'Русский', flag: '🇷🇺' },
  en: { label: 'English', flag: '🇬🇧' },
  lt: { label: 'Lietuvių', flag: '🇱🇹' },
}

export const DEFAULT_CENTER = [54.6807, 25.2825] // Vilnius centre

export function timeUntil(ts) {
  const now = Math.floor(Date.now() / 1000)
  const d = ts - now
  if (d <= 0) return 'сейчас'
  const mins = Math.floor(d / 60)
  if (mins < 60) return `через ${mins} мин`
  const h = Math.floor(mins / 60)
  if (h < 24) return `через ${h} ч`
  return `через ${Math.floor(h / 24)} д`
}

export function clockTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
