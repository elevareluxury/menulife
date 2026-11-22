// Cuándo empezó la pasada anterior que terminó bien de esta misma tarea (GitHub Actions). Si no se puede saber
// (sin token, sin red, primera vez), null: la tarea usa su ventana de siempre.
export async function previousRunStart(env = process.env) {
  const repo = env.GITHUB_REPOSITORY
  const file = /\/\.github\/workflows\/([^@/]+)@/.exec(env.GITHUB_WORKFLOW_REF ?? '')?.[1]
  if (!env.GITHUB_TOKEN || !repo || !file) return null
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${file}/runs?status=success&per_page=5`, {
      headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const { workflow_runs: runs = [] } = await res.json()
    const prev = runs.find(r => String(r.id) !== String(env.GITHUB_RUN_ID))
    return prev?.run_started_at ?? null
  } catch {
    return null
  }
}
