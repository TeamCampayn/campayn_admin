import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
            <ShieldAlert className="text-rose-500" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
            System Breach Detected
          </h1>
          <p className="text-zinc-500 max-w-md mb-8 font-medium">
            The Command Center encountered a runtime exception. This incident has been logged for the developers.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8 w-full max-w-xl overflow-x-auto">
            <code className="text-rose-400 text-xs font-mono">
              {this.state.error?.message}
            </code>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-admin-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-600 transition-all"
          >
            <RefreshCcw size={18} />
            Reset Command Center
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
