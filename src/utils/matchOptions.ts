export interface ComboOption { value: string; label: string }

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function matchOptions(options: ComboOption[], query: string): ComboOption[] {
  const q = fold(query.trim())
  if (!q) return options
  const prefix: ComboOption[] = []
  const inner: ComboOption[] = []
  for (const o of options) {
    const label = fold(o.label)
    if (label.startsWith(q)) prefix.push(o)
    else if (label.includes(q)) inner.push(o)
  }
  return [...prefix, ...inner]
}
