import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import type { Messaging, MessagePayload } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import type { FirebaseOptions } from 'firebase/app';

let messaging: Messaging | undefined;

export const initializeFirebase = (firebaseConfig: FirebaseOptions) => {
    if (!messaging) {
        if (navigator.serviceWorker === undefined) {
            console.error('Service Worker is not available in this browser.');
            return
        }
        const app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
    }
};

export const requestNotificationToken = async (vapidKey: string): Promise<string | null> => {
    try {
        // Request notification permission.
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return null;
        }

        // Register Service Worker for background notifications.
        if (!('serviceWorker' in navigator) || navigator.serviceWorker === undefined) {
            console.warn('Service Worker is not supported in this browser.');
            return null;
        }
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker registered with scope:', registration.scope);
        } catch (err) {
            console.error('Service Worker registration failed:', err);
            return null;
        }

        if (!messaging) {
            return null;
        }

        // Get FCM Token.
        const token = await getToken(messaging, {
            vapidKey: vapidKey,
        });

        console.log('FCM Token:', token);
        return token;
    } catch (error) {
        console.error('Failed to get FCM token:', error);
        return null;
    }
};

export const onForegroundNotification = (callback: (payload: MessagePayload) => void) => {
    if (messaging) {
        onMessage(messaging, callback);
    }
};

export const removeNotificationToken = async () => {
    if (messaging) {
        await deleteToken(messaging);
        console.log('FCM token deleted successfully.');
    }
}
