/** Qué ícono lleva un campo según su `type` (components/ui/PickerWrap.tsx); null = no es fecha ni hora */
export const pickerKind = (type: string | undefined): 'date' | 'time' | null =>
  type === 'time' ? 'time' : type === 'date' || type === 'datetime-local' || type === 'month' || type === 'week' ? 'date' : null
