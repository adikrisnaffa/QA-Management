// Progress project = rata-rata progress task, dibobot estimasi jam (fallback bobot 1)
export const weighted = (ts: { progress_percentage: number; estimated_hours: number | null }[]) => {
  const w = ts.map(t => Number(t.estimated_hours) || 1); const sum = w.reduce((a, b) => a + b, 0)
  return sum ? Math.round(ts.reduce((s, t, i) => s + t.progress_percentage * w[i], 0) / sum) : 0
}
