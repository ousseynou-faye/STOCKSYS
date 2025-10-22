import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('UI error boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-text-primary mb-2">Une erreur est survenue</h2>
            <p className="text-text-secondary">Actualisez la page ou revenez au tableau de bord.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

