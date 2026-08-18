/**
 * CSV utilities — minimal RFC-4180-ish escaping (Phase 10).
 *
 * - Fields containing `,`, `"`, or newlines are double-quoted.
 * - Embedded `"` are escaped as `""`.
 * - No float literals: all numeric inputs are integers.
 */

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  return rows
    .map(row => row.map(escapeField).join(','))
    .join('\r\n')
}

export function escapeField(value: string | number): string {
  const s = typeof value === 'number' ? String(value) : value
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Browser-only: triggers a download of the CSV as a Blob. In SSR/Node the
 * function is a no-op (the page only calls it from a click handler).
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
