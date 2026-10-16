import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
const DB_PATH = join(DATA_DIR, 'barlink.sqlite')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      bio TEXT,
      city TEXT DEFAULT 'Vilnius',
      drink_rating REAL DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kind TEXT DEFAULT 'bar',
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      photo TEXT,
      description TEXT,
      rating REAL DEFAULT 0,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS barlinks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER NOT NULL,
      host_id INTEGER NOT NULL,
      size INTEGER NOT NULL DEFAULT 4,
      drunk TEXT NOT NULL DEFAULT 'slightly',
      start_time INTEGER NOT NULL,
      language TEXT NOT NULL DEFAULT 'ru',
      tags TEXT NOT NULL DEFAULT '[]',
      note TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY(venue_id) REFERENCES venues(id),
      FOREIGN KEY(host_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barlink_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(barlink_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barlink_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );
  `)

  // --- additive migrations (backward compatible) -------------------------
  // Profile editor fields (Day 3): age, interests, "бухарик" counters.
  const cols = new Set(db.prepare('PRAGMA table_info(users)').all().map(c => c.name))
  const addCol = (name, ddl) => {
    if (!cols.has(name)) db.exec(`ALTER TABLE users ADD COLUMN ${ddl}`)
  }
  addCol('age', 'age INTEGER')                              // возраст, null = не указан
  addCol('interests', "interests TEXT DEFAULT '[]'")        // JSON-массив интересов
  addCol('beers', 'beers INTEGER DEFAULT 0')                // счётчик выпитых пив
  addCol('meetings', 'meetings INTEGER DEFAULT 0')          // счётчик встреч
}

// ---------------------------------------------------------------------------
// Seed — real Vilnius bars coordinates (approx, city centre / Old Town)
// ---------------------------------------------------------------------------
const VENUES = [
  { name: 'Šnekutis', kind: 'bar', lat: 54.6746, lng: 25.2892, rating: 4.7,
    address: 'Polocko g. 7A, Vilnius', photo: '🍺',
    description: 'Legendary Lithuanian beer cellar in Užupis. Craft ales, rustic vibe, аутентично.' },
  { name: 'Alaus Namai', kind: 'bar', lat: 54.6775, lng: 25.2760, rating: 4.6,
    address: 'Goštauto g. 8, Vilnius', photo: '🍻',
    description: 'Дом пива: десятки крафтовых сортов, шумно и по-настоящему. Классика для тусовок.' },
  { name: 'Būsi Trečias', kind: 'bar', lat: 54.6797, lng: 25.2797, rating: 4.5,
    address: 'Totorių g. 18, Vilnius', photo: '🍺',
    description: 'Старейший паб города, собственное пиво. Отлично для больших компаний.' },
  { name: 'Piano Man', kind: 'bar', lat: 54.6822, lng: 25.2804, rating: 4.3,
    address: 'Jogailos g. 4, Vilnius', photo: '🥃',
    description: 'Коктейль-бар с живой музыкой и живым пианино. Коктейли, рок, вечерний свет.' },
  { name: 'Cozy', kind: 'bar', lat: 54.6842, lng: 25.2846, rating: 4.8,
    address: 'Dominikonų g. 10, Vilnius', photo: '🍸',
    description: 'Коктейли и настолки в Старом городе. Тёплый интерьер, идеально для новых знакомств.' },
  { name: 'Peronas', kind: 'bar', lat: 54.6847, lng: 25.2790, rating: 4.4,
    address: 'Stotis, Geležinkelio g. 6, Vilnius', photo: '🍺',
    description: 'Бар на старом вокзале. Андеграунд, концерты, неформальная публика.' },
  { name: 'Kablys', kind: 'club', lat: 54.6855, lng: 25.2740, rating: 4.2,
    address: 'Vilniaus g. 22, Vilnius', photo: '🎧',
    description: 'Клуб с электроникой и танцами. Для тех, кто хочет двигаться, а не сидеть.' },
  { name: 'Alaus Biblioteka', kind: 'bar', lat: 54.6780, lng: 25.2870, rating: 4.9,
    address: 'Totorių g. 4, Vilnius', photo: '📚',
    description: 'Библиотека пива: 200+ сортов, сомелье подскажет. Для гурманов пенного.' },
  { name: 'Gringo', kind: 'bar', lat: 54.6810, lng: 25.2830, rating: 4.1,
    address: 'Vokiečių g. 14, Vilnius', photo: '🌮',
    description: 'Латино-бар: текила, начос, латина-музыка. Жарко и весело.' },
  { name: 'Špunka', kind: 'bar', lat: 54.6763, lng: 25.2895, rating: 4.5,
    address: 'Užupio g. 9, Vilnius', photo: '🍻',
    description: 'Уютный крафт-бар в Ужуписе. Хорош для разговоров без грохота.' },
  { name: 'Distillerie', kind: 'bar', lat: 54.6790, lng: 25.2840, rating: 4.6,
    address: 'Vilniaus g. 29, Vilnius', photo: '🥃',
    description: 'Коктейли с местным характером, тёмный интерьер, атмосферно.' },
  { name: 'B24 (Bardakas)', kind: 'club', lat: 54.6872, lng: 25.2857, rating: 3.9,
    address: 'Kalvarijų g. 24, Vilnius', photo: '🪩',
    description: 'Большой клуб, вечеринки до утра. Танцы, DJ-сеты, много людей.' },
]

const USERS = [
  { name: 'Лёша', avatar: '🦾', bio: 'Хочу найти компанию на вечер', drink_rating: 4.8 },
  { name: 'Мария', avatar: '🌸', bio: 'Люблю коктейли и настолки', drink_rating: 4.6 },
  { name: 'Dima', avatar: '🎸', bio: 'Rock, beer, talks', drink_rating: 4.2 },
  { name: 'Inga', avatar: '🎧', bio: 'Techno и танцы 💃', drink_rating: 4.9 },
  { name: 'Тимофей', avatar: '🧩', bio: 'Настолки и крафт', drink_rating: 4.4 },
  { name: 'Sofia', avatar: '🍸', bio: 'English / Русский', drink_rating: 4.7 },
]

const DRUNK_LEVELS = ['sober', 'slightly', 'well', 'wasted']
const LANGS = ['ru', 'en', 'lt']

export function seed() {
  migrate()
  const count = db.prepare('SELECT COUNT(*) as c FROM venues').get().c
  if (count > 0) {
    console.log('Seed skipped — data already present.')
    return
  }

  const insVenue = db.prepare(
    'INSERT INTO venues (name, kind, lat, lng, rating, address, photo, description) VALUES (@name,@kind,@lat,@lng,@rating,@address,@photo,@description)'
  )
  const insUser = db.prepare(
    'INSERT INTO users (name, avatar, bio, drink_rating) VALUES (@name,@avatar,@bio,@drink_rating)'
  )
  const insBL = db.prepare(
    'INSERT INTO barlinks (venue_id, host_id, size, drunk, start_time, language, tags, note) VALUES (@venue_id,@host_id,@size,@drunk,@start_time,@language,@tags,@note)'
  )
  const insPart = db.prepare('INSERT OR IGNORE INTO participants (barlink_id, user_id) VALUES (?,?)')
  const insMsg = db.prepare('INSERT INTO messages (barlink_id, user_id, text) VALUES (?,?,?)')

  const tx = db.transaction(() => {
    VENUES.forEach(v => insVenue.run(v))
    USERS.forEach(u => insUser.run(u))

    const now = Math.floor(Date.now() / 1000)
    const plans = [
      { venue_id: 1, host_id: 2, size: 5, drunk: 'slightly', start_time: now + 3600, language: 'ru', tags: JSON.stringify(['#настолки', '#крафт']), note: 'Ищем 2-3 человека на вечер' },
      { venue_id: 2, host_id: 3, size: 6, drunk: 'well', start_time: now + 5400, language: 'en', tags: JSON.stringify(['#пиво', '#рок']), note: 'Chill beer night' },
      { venue_id: 5, host_id: 4, size: 4, drunk: 'well', start_time: now + 7200, language: 'ru', tags: JSON.stringify(['#коктейли', '#танцы']), note: 'Пойдём танцевать' },
      { venue_id: 8, host_id: 6, size: 3, drunk: 'sober', start_time: now + 9000, language: 'en', tags: JSON.stringify(['#пиво', '#gourmet']), note: 'Beer tasting, 200+ sorts' },
      { venue_id: 6, host_id: 5, size: 8, drunk: 'wasted', start_time: now + 10800, language: 'lt', tags: JSON.stringify(['#концерт', '#пиво']), note: 'Концерт на вокзале' },
      { venue_id: 11, host_id: 2, size: 4, drunk: 'slightly', start_time: now + 12600, language: 'ru', tags: JSON.stringify(['#настолки', '#кино']), note: 'Спокойный вечер' },
    ]
    const blIds = plans.map(p => insBL.run(p).lastInsertRowid)

    blIds.forEach((id, i) => {
      const hostId = plans[i].host_id
      insPart.run(id, hostId)
      // add 1-2 extra participants
      const extra = USERS[(i + 1) % USERS.length]
      const extraId = USERS.findIndex(u => u.name === extra.name) + 1
      if (extraId !== hostId) insPart.run(id, extraId)
      insMsg.run(id, hostId, 'Привет! Кто идёт? 👋')
      insMsg.run(id, extraId, 'Я в деле!')
    })
  })
  tx()
  console.log(`Seed done: ${VENUES.length} venues, ${USERS.length} users, 6 barlinks.`)
}

if (process.argv.includes('--seed')) {
  seed()
}
