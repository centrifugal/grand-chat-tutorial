// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.16.0/firebase-messaging-compat.js');
importScripts('/firebase-config.js');

if (!self.firebaseConfig) {
    console.error('Firebase config not found');
} else {
    firebase.initializeApp(self.firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function (payload) {
        console.log('Received background message ', payload);

        const notification = payload.data;
        if (!notification) {
            return
        }

        // Customize notification here.
        const notificationOptions = {
            ...notification,
        };

        self.registration.showNotification(
            notification.title,
            notificationOptions
        );
    });
}
