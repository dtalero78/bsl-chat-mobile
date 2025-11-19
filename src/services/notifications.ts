import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        return null;
      }

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permission to receive push notifications was denied');
        return null;
      }

      // Get Expo Push Token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      if (!projectId) {
        console.log('⚠️ No project ID found. Using development mode token.');
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      console.log('✅ Expo Push Token:', token.data);
      this.expoPushToken = token.data;

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#007AFF',
        });
      }

      return token.data;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  async scheduleLocalNotification(title: string, body: string, data?: any) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }

  // Set up notification listeners
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
