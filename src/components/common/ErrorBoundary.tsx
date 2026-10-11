import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon, RotateCcw, Home, Trash2, Copy, Check } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  copied: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MoneyMap ErrorBoundary caught an exception:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleResetCache = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // ignore
    }
    window.location.href = '/'
  }

  handleCopyError = () => {
    const errorText = `${this.state.error?.name}: ${this.state.error?.message}\n${this.state.error?.stack || ''}\nComponent Stack: ${this.state.errorInfo?.componentStack || ''}`
    navigator.clipboard.writeText(errorText)
    this.setState({ copied: true })
    setTimeout(() => this.setState({ copied: false }), 2000)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <AlertOctagon size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Application Recovery
              </h1>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                MoneyMap encountered an unexpected runtime exception. Your stored financial data in Supabase and offline storage remains intact.
              </p>
            </div>

            {/* Error Message Box */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-left text-xs font-mono space-y-1 overflow-x-auto max-h-36">
              <p className="text-rose-500 font-bold">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.error?.stack && (
                <p className="text-[10px] text-[var(--text-muted)] line-clamp-3">
                  {this.state.error.stack}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Home size={14} />
                <span>Return to Home</span>
              </button>

              <button
                type="button"
                onClick={this.handleCopyError}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 text-[var(--text-muted)]"
                title="Copy technical error stack"
              >
                {this.state.copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{this.state.copied ? 'Copied' : 'Copy Stack'}</span>
              </button>
            </div>

            {/* Emergency Recovery Link */}
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={this.handleResetCache}
                className="text-[11px] text-[var(--text-muted)] hover:text-rose-500 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <Trash2 size={12} />
                <span>Reset Offline Storage & Re-sync Clean</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
