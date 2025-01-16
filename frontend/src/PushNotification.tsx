import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

let messaging;

export const initializeFirebase = (firebaseConfig: any) => {
    if (!messaging) {
        if (navigator.serviceWorker === undefined) {
            console.error('Service Worker is not available in this browser.');
            return
        }
        const app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
    }
};

export const requestNotificationToken = async (firebaseConfig: any, vapidKey: string): Promise<string | null> => {
    try {
        // Request notification permission.
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return null;
        }

        // Register Service Worker for background notifications.
        if ('serviceWorker' in navigator) {
            if (navigator.serviceWorker === undefined) {
                console.error('Service Worker is not available in this browser.');
                return null;
            }
            try {
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log('Service Worker registered with scope:', registration.scope);
            } catch (err) {
                console.error('Service Worker registration failed:', err);
                return null;
            }
        } else {
            console.warn('Service Worker is not supported in this browser.');
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

export const onForegroundNotification = (callback) => {
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
