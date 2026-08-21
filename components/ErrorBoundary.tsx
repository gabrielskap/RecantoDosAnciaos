import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  key?: React.Key;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro não tratado:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50/50 border border-rose-200 rounded-2xl flex flex-col items-center justify-center text-center my-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {this.props.fallbackTitle || 'Ocorreu um erro ao carregar este módulo'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-4">
            {this.state.error?.message || 'Um erro inesperado impediu a exibição completa das informações. Tente recarregar.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" /> Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
