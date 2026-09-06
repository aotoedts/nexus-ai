import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; info: string; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, info: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { error, info: '' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ info: errorInfo.componentStack ?? '' });
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
          <Text style={styles.title}>Erro na renderização:</Text>
          <Text style={styles.text}>{this.state.error.message}</Text>
          <Text style={styles.text}>{this.state.error.stack?.slice(0, 1000)}</Text>
          <Text style={styles.subtitle}>Component stack:</Text>
          <Text style={styles.text}>{this.state.info.slice(0, 1000)}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0000' },
  title: { color: '#ff6b6b', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { color: '#ff6b6b', fontSize: 14, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  text: { color: '#ffffff', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },
});
