export function playOrderReadySound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()

    const notes = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.15 },
      { freq: 783.99, time: 0.30 },
      { freq: 1046.50, time: 0.50 },
    ]

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time)
      gain.gain.setValueAtTime(0.3, ctx.currentTime + time)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.4)
      osc.start(ctx.currentTime + time)
      osc.stop(ctx.currentTime + time + 0.4)
    })
  } catch {
    // Audio not available
  }
}
