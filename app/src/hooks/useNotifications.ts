import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export const registerPushToken = async () => {
  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;

  if (permissions.status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    finalStatus = asked.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID ?? Constants.expoConfig?.extra?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });

  await supabase.functions.invoke('register-push-token', {
    body: { expoPushToken: token.data }
  });

  return token.data;
};

export const useNotificationRouting = () => {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const deepLink = response.notification.request.content.data?.deepLink;
      if (typeof deepLink === 'string') {
        Linking.openURL(`wakebrief://${deepLink.replace(/^\//, '')}`);
      }
    });

    return () => subscription.remove();
  }, []);
};
