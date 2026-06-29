import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    // Log error to your error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false });
    // Navigate to home
    if (this.props.navigation) {
      this.props.navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <View style={styles.container}>
          <Icon name="error-outline" size={64} color="#f44336" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We apologize for the inconvenience. Please try again.
          </Text>
          
          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorText}>{this.state.error.toString()}</Text>
              {this.state.errorInfo && (
                <Text style={styles.errorText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Icon name="refresh" size={20} color="#fff" />
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.homeButton} onPress={this.handleGoHome}>
              <Icon name="home" size={20} color="#2196F3" />
              <Text style={styles.homeButtonText}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  errorDetails: {
    width: '100%',
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;