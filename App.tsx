import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 BSL Chat</Text>
      <Text style={styles.subtitle}>Mobile App</Text>
      <Text style={styles.info}>Conectado al backend:</Text>
      <Text style={styles.url}>bsl-utilidades-yp78a.ondigitalocean.app</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    color: '#666',
    marginBottom: 40,
  },
  info: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  url: {
    fontSize: 14,
    color: '#007AFF',
  },
});
