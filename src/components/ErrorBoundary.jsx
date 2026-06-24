import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">Algo salió mal</h1>
          <p className="text-text-secondary mb-2">Ocurrió un error inesperado.</p>
          <p className="text-xs text-text-secondary mb-6 max-w-md">{this.state.error?.message}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm hover:bg-primary-hover transition-colors">
              Recargar página
            </button>
            <Link
              to="/"
              className="px-6 py-2.5 bg-surface text-text-secondary rounded-xl text-sm hover:text-text-primary transition-colors border border-white/10">
              Volver al inicio
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
