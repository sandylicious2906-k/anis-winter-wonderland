export const newId = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

/** Sandy lebt in Deutschland: Datum und Uhrzeit immer in Berliner Zeit. */
export function berlin(now = new Date()) {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return { day: `${get('year')}-${get('month')}-${get('day')}`, dm: `${get('day')}.${get('month')}.`, hour: Number(get('hour')) % 24 }
}

/** Tage bis zum nächsten "TT.MM.", 0 = heute. */
export function daysUntil(dm: string, now = new Date()) {
  const m = /^(\d{1,2})\.(\d{1,2})\.?$/.exec(dm.trim())
  if (!m) return undefined
  const { day } = berlin(now)
  const [y, mo, d] = day.split('-').map(Number) as [number, number, number]
  const today = Date.UTC(y, mo - 1, d)
  let next = Date.UTC(y, Number(m[2]) - 1, Number(m[1]))
  if (next < today) next = Date.UTC(y + 1, Number(m[2]) - 1, Number(m[1]))
  return Math.round((next - today) / 86_400_000)
}
