/**
 * Date utilities — pure functions, no timezone-specific libs.
 *
 * - `startOfDay` / `endOfDay` / `startOfMonth` / `endOfMonth` operate in
 *   the local timezone of the runtime.
 * - `addMonths` is calendar-month aware (e.g. Jan 31 + 1 month = Feb 28/29).
 * - `formatDateId` returns an Indonesian `DD MMM YYYY` string. (Phase 5+)
 */

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
]

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export function startOfDay(epochMs: number): number {
  const d = new Date(epochMs)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfDay(epochMs: number): number {
  const d = new Date(epochMs)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function startOfMonth(epochMs: number): number {
  const d = new Date(epochMs)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfMonth(epochMs: number): number {
  const d = new Date(epochMs)
  d.setMonth(d.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function addMonths(epochMs: number, months: number): number {
  if (!Number.isInteger(months)) throw new RangeError(`months must be integer, got ${months}`)
  const d = new Date(epochMs)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d.getTime()
}

export function startOfNextMonth(): number {
  return startOfMonth(addMonths(Date.now(), 1))
}

export function nextYear(epochMs: number): number {
  return addMonths(epochMs, 12)
}

export function yearOf(epochMs: number): number {
  return new Date(epochMs).getFullYear()
}

export function monthOf(epochMs: number): number {
  return new Date(epochMs).getMonth() + 1
}

export function formatDateId(epochMs: number, lang: 'id' | 'en' = 'id'): string {
  const d = new Date(epochMs)
  const day = String(d.getDate()).padStart(2, '0')
  const month = (lang === 'id' ? MONTH_NAMES_ID : MONTH_NAMES_EN)[d.getMonth()]
  return `${day} ${month} ${d.getFullYear()}`
}

export function isoDate(epochMs: number): string {
  const d = new Date(epochMs)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}
