import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UdharPe Application Error Caught by Boundary:', error, errorInfo);
    const msg = String(error?.message || error || '');
    const isChunkError =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Loading chunk');
    if (isChunkError && !sessionStorage.getItem('udharpe_chunk_reloaded')) {
      sessionStorage.setItem('udharpe_chunk_reloaded', '1');
      window.location.reload();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg border border-zinc-300 p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center text-red-600">
              <AlertTriangle size={28} />
            </div>
            
            <h1 className="text-2xl font-display font-bold text-zinc-900 tracking-tight mb-2">
              Something went wrong
            </h1>
            
            <p className="text-zinc-600 text-[14px] leading-relaxed mb-6">
              An unexpected error occurred while loading this view. Your ledger data and balance records are completely safe.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-3 bg-zinc-100 rounded-md text-left overflow-x-auto text-xs font-mono text-red-700 max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="btn-primary w-full sm:w-auto"
              >
                <RefreshCw size={16} />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="btn-solid w-full sm:w-auto"
              >
                <Home size={16} />
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
