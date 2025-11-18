import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useState } from 'react';
import ConversationsScreen from './src/screens/ConversationsScreen';
import ChatScreen from './src/screens/ChatScreen';
import { Conversation } from './src/types/Conversation';

export default function App() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      {selectedConversation ? (
        <ChatScreen
          conversation={selectedConversation}
          onBack={() => setSelectedConversation(null)}
        />
      ) : (
        <ConversationsScreen
          onSelectConversation={setSelectedConversation}
        />
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
