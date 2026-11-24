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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm">
              <AlertTriangle size={32} />
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              Something went wrong
            </h1>
            
            <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6">
              An unexpected error occurred while loading this view. Your ledger data and balance records are completely safe.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-3 bg-slate-100 rounded-xl text-left overflow-x-auto text-xs font-mono text-rose-700 max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-200/80 transition flex items-center justify-center gap-2"
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
