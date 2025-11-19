import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import ConversationsScreen from './src/screens/ConversationsScreen';
import ChatScreen from './src/screens/ChatScreen';
import { Conversation } from './src/types/Conversation';
import { notificationService } from './src/services/notifications';

export default function App() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  console.log('🎯 App rendering, selected:', selectedConversation?.name || 'none');

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications();

    // Listen for notifications received while app is open
    notificationListener.current = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('📨 Notification received!', notification);
      }
    );

    // Listen for user tapping on notification
    responseListener.current = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped!', response);
        const conversationId = response.notification.request.content.data?.conversationId;
        if (conversationId) {
          // TODO: Navigate to specific conversation
          console.log('Navigate to conversation:', conversationId);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const registerForPushNotifications = async () => {
    const token = await notificationService.registerForPushNotifications();
    if (token) {
      console.log('✅ Push token registered:', token);
      // Send token to backend
      try {
        const { chatApi } = require('./src/services/api');
        await chatApi.registerPushToken(token);
        console.log('✅ Token sent to backend');
      } catch (error) {
        console.error('❌ Error sending token to backend:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50, // Space for status bar
  },
});
