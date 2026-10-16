import express from 'express'
import { db, migrate } from './db.js'

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 5181

migrate()

// --- tiny in-memory session (demo auth) ------------------------------------
// token -> userId ; also a default demo user so the map works immediately
const sessions = new Map()
let nextToken = 1

function auth(req, res, next) {
  const t = req.headers['x-auth']
  const userId = t ? sessions.get(t) : null
  req.user = userId ? db.prepare('SELECT * FROM users WHERE id=?').get(userId) : null
  next()
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'auth required' })
  next()
}

// Normalise a user row for the client (interests is stored as JSON text)
function shapeUser(u) {
  if (!u) return null
  let interests = []
  try { interests = JSON.parse(u.interests || '[]') } catch { interests = [] }
  return {
    ...u,
    interests,
    beers: u.beers || 0,
    meetings: u.meetings || 0,
  }
}

function decorate(barlink) {
  const host = db.prepare('SELECT id,name,avatar,bio,drink_rating FROM users WHERE id=?').get(barlink.host_id)
  const venue = db.prepare('SELECT * FROM venues WHERE id=?').get(barlink.venue_id)
  const participants = db.prepare(
    'SELECT u.id,u.name,u.avatar FROM participants p JOIN users u ON u.id=p.user_id WHERE p.barlink_id=?'
  ).all(barlink.id)
  const msgCount = db.prepare('SELECT COUNT(*) c FROM messages WHERE barlink_id=?').get(barlink.id).c
  return {
    ...barlink,
    tags: JSON.parse(barlink.tags || '[]'),
    host,
    venue,
    participants,
    joined: participants.length,
    spots_left: Math.max(0, barlink.size - participants.length),
    msg_count: msgCount,
  }
}

// --- health -----------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ ok: true }))

// --- auth -------------------------------------------------------------------
app.get('/api/users', (req, res) => {
  res.json(db.prepare('SELECT * FROM users ORDER BY id').all())
})

app.post('/api/login', (req, res) => {
  const { userId, name } = req.body || {}
  let user
  if (userId) user = db.prepare('SELECT * FROM users WHERE id=?').get(userId)
  if (!user && name) {
    const ins = db.prepare('INSERT INTO users (name, avatar) VALUES (?,?)').run(name, '🙂')
    user = db.prepare('SELECT * FROM users WHERE id=?').get(ins.lastInsertRowid)
  }
  if (!user) return res.status(400).json({ error: 'no user' })
  const token = 't' + nextToken++
  sessions.set(token, user.id)
  res.json({ token, user: shapeUser(user) })
})

app.get('/api/me', auth, (req, res) => {
  res.json({ user: shapeUser(req.user) })
})

// --- update my profile (PATCH /api/me) --------------------------------------
// All fields optional; only provided keys are updated. Backward compatible.
app.patch('/api/me', auth, requireAuth, (req, res) => {
  const b = req.body || {}
  const sets = []
  const vals = {}

  if (typeof b.name === 'string') {
    const name = b.name.trim()
    if (!name) return res.status(400).json({ error: 'name cannot be empty' })
    if (name.length > 40) return res.status(400).json({ error: 'name too long' })
    sets.push('name = @name'); vals.name = name
  }

  if ('age' in b) {
    if (b.age === null || b.age === '' ) { sets.push('age = NULL') }
    else {
      const age = Number(b.age)
      if (!Number.isFinite(age) || age < 16 || age > 120) {
        return res.status(400).json({ error: 'age must be between 16 and 120' })
      }
      sets.push('age = @age'); vals.age = Math.round(age)
    }
  }

  if (typeof b.bio === 'string') {
    if (b.bio.length > 300) return res.status(400).json({ error: 'bio too long' })
    sets.push('bio = @bio'); vals.bio = b.bio.trim()
  }

  if (typeof b.avatar === 'string') {
    const avatar = b.avatar.trim()
    if (!avatar) return res.status(400).json({ error: 'avatar cannot be empty' })
    if (avatar.length > 8) return res.status(400).json({ error: 'avatar too long (use an emoji)' })
    sets.push('avatar = @avatar'); vals.avatar = avatar
  }

  if (Array.isArray(b.interests)) {
    const interests = b.interests
      .map(s => String(s).trim())
      .filter(Boolean)
      .slice(0, 12)
    if (interests.some(s => s.length > 30)) return res.status(400).json({ error: 'interest too long' })
    sets.push('interests = @interests'); vals.interests = JSON.stringify(interests)
  }

  if (!sets.length) return res.status(400).json({ error: 'nothing to update' })

  vals.id = req.user.id
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @id`).run(vals)
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)
  res.json({ user: shapeUser(user) })
})

// --- "бухарик" counters -----------------------------------------------------
// Increment my beer counter (drink a 🍺) or meeting counter.
app.post('/api/me/beer', auth, requireAuth, (req, res) => {
  db.prepare('UPDATE users SET beers = beers + 1 WHERE id=?').run(req.user.id)
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)
  res.json({ user: shapeUser(user) })
})

app.post('/api/me/meeting', auth, requireAuth, (req, res) => {
  db.prepare('UPDATE users SET meetings = meetings + 1 WHERE id=?').run(req.user.id)
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)
  res.json({ user: shapeUser(user) })
})

// --- venues -----------------------------------------------------------------
app.get('/api/venues', (req, res) => {
  const venues = db.prepare('SELECT * FROM venues ORDER BY rating DESC').all()
  const withLinks = venues.map(v => {
    const active = db.prepare("SELECT COUNT(*) c FROM barlinks WHERE venue_id=? AND status='active'").get(v.id).c
    return { ...v, active_links: active }
  })
  res.json(withLinks)
})

app.get('/api/venues/:id', (req, res) => {
  const venue = db.prepare('SELECT * FROM venues WHERE id=?').get(req.params.id)
  if (!venue) return res.status(404).json({ error: 'not found' })
  const links = db.prepare("SELECT * FROM barlinks WHERE venue_id=? AND status='active' ORDER BY start_time").all(venue.id)
    .map(decorate)
  res.json({ ...venue, links })
})

// --- barlinks ---------------------------------------------------------------
app.get('/api/barlinks', (req, res) => {
  const { venueId } = req.query
  const rows = venueId
    ? db.prepare("SELECT * FROM barlinks WHERE status='active' AND venue_id=? ORDER BY start_time").all(venueId)
    : db.prepare("SELECT * FROM barlinks WHERE status='active' ORDER BY start_time").all()
  res.json(rows.map(decorate))
})

app.post('/api/barlinks', auth, requireAuth, (req, res) => {
  const { venue_id, size, drunk, start_time, language, tags, note } = req.body || {}
  if (!venue_id) return res.status(400).json({ error: 'venue_id required' })
  const ins = db.prepare(
    'INSERT INTO barlinks (venue_id, host_id, size, drunk, start_time, language, tags, note) VALUES (?,?,?,?,?,?,?,?)'
  ).run(
    venue_id, req.user.id,
    Number(size) || 4, drunk || 'slightly',
    Number(start_time) || Math.floor(Date.now() / 1000) + 3600,
    language || 'ru', JSON.stringify(tags || []), note || ''
  )
  db.prepare('INSERT OR IGNORE INTO participants (barlink_id, user_id) VALUES (?,?)').run(ins.lastInsertRowid, req.user.id)
  const bl = db.prepare('SELECT * FROM barlinks WHERE id=?').get(ins.lastInsertRowid)
  res.json(decorate(bl))
})

app.get('/api/barlinks/:id', (req, res) => {
  const bl = db.prepare('SELECT * FROM barlinks WHERE id=?').get(req.params.id)
  if (!bl) return res.status(404).json({ error: 'not found' })
  res.json(decorate(bl))
})

app.post('/api/barlinks/:id/join', auth, requireAuth, (req, res) => {
  const bl = db.prepare('SELECT * FROM barlinks WHERE id=?').get(req.params.id)
  if (!bl || bl.status !== 'active') return res.status(404).json({ error: 'not found or closed' })
  const cnt = db.prepare('SELECT COUNT(*) c FROM participants WHERE barlink_id=?').get(bl.id).c
  if (cnt >= bl.size && !db.prepare('SELECT 1 FROM participants WHERE barlink_id=? AND user_id=?').get(bl.id, req.user.id)) {
    return res.status(409).json({ error: 'full' })
  }
  db.prepare('INSERT OR IGNORE INTO participants (barlink_id, user_id) VALUES (?,?)').run(bl.id, req.user.id)
  // system join message
  db.prepare('INSERT INTO messages (barlink_id, user_id, text) VALUES (?,?,?)')
    .run(bl.id, req.user.id, `${req.user.name} присоединился(ась) 🍻`)
  res.json(decorate(db.prepare('SELECT * FROM barlinks WHERE id=?').get(bl.id)))
})

app.post('/api/barlinks/:id/leave', auth, requireAuth, (req, res) => {
  db.prepare('DELETE FROM participants WHERE barlink_id=? AND user_id=?').run(req.params.id, req.user.id)
  res.json({ ok: true })
})

// --- messages ---------------------------------------------------------------
app.get('/api/barlinks/:id/messages', (req, res) => {
  const rows = db.prepare(
    `SELECT m.*, u.name AS user_name, u.avatar AS user_avatar
     FROM messages m JOIN users u ON u.id=m.user_id
     WHERE m.barlink_id=? ORDER BY m.id`
  ).all(req.params.id)
  res.json(rows)
})

app.post('/api/barlinks/:id/messages', auth, requireAuth, (req, res) => {
  const { text } = req.body || {}
  if (!text || !text.trim()) return res.status(400).json({ error: 'empty' })
  const ins = db.prepare('INSERT INTO messages (barlink_id, user_id, text) VALUES (?,?,?)')
    .run(req.params.id, req.user.id, text.trim())
  const row = db.prepare(
    `SELECT m.*, u.name AS user_name, u.avatar AS user_avatar
     FROM messages m JOIN users u ON u.id=m.user_id WHERE m.id=?`
  ).get(ins.lastInsertRowid)
  res.json(row)
})

// --- my barlinks ------------------------------------------------------------
app.get('/api/my/barlinks', auth, requireAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT b.* FROM barlinks b JOIN participants p ON p.barlink_id=b.id
     WHERE p.user_id=? ORDER BY b.start_time DESC`
  ).all(req.user.id)
  res.json(rows.map(decorate))
})

app.listen(PORT, () => {
  console.log(`BarLink API on http://localhost:${PORT}`)
})
