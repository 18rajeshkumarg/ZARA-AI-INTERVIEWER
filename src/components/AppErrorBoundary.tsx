import { Component, type ErrorInfo, type ReactNode } from 'react'

const allApplicationsKey = 'zara_all_applications'
const perAccountPrefix = 'zara_candidate_applications:'

/** Clears only interview records; accounts and project-folder files stay intact. */
function resetSavedApplications() {
  try {
    localStorage.removeItem(allApplicationsKey)
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(perAccountPrefix)) localStorage.removeItem(key)
    }
  } catch {
    /* storage may be unavailable */
  }
}

type State = { error: Error | null }

export default class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ZARA AI Interview could not render this screen', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-5 py-10 text-ink">
        <div className="w-full max-w-xl border border-ink/15 bg-white p-7">
          <p className="font-mono2 text-[10px] uppercase tracking-[0.22em] text-zara">
            Indica Software · ZARA AI Interview
          </p>
          <h1 className="mt-2 text-2xl font-black">This screen could not be opened.</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/65">
            Some saved data in this browser could not be read. Reload the page first. If it happens again, reset the
            saved interview data on this browser — your account and the candidate files in the project folder are not
            deleted.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-zara px-5 py-3 font-mono2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-ink"
            >
              Reload the page
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('Reset the interview applications saved in this browser? Accounts stay intact.')) return
                resetSavedApplications()
                window.location.reload()
              }}
              className="border border-ink/20 px-5 py-3 font-mono2 text-[11px] uppercase tracking-[0.18em] hover:border-zara hover:text-zara"
            >
              Reset saved interview data
            </button>
          </div>
          <details className="mt-5 text-xs text-ink/50">
            <summary className="cursor-pointer">Technical details</summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap border border-ink/10 bg-paper p-3">
              {error.message || String(error)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
