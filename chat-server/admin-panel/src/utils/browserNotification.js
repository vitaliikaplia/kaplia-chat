// Browser Notifications for new messages

let notificationEnabled = localStorage.getItem('kaplia_notifications_enabled') === 'true';
let onClickCallback = null;

export function isNotificationSupported() {
  return 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'denied';
  const permission = await Notification.requestPermission();
  return permission;
}

export function setNotificationEnabled(enabled) {
  notificationEnabled = enabled;
  localStorage.setItem('kaplia_notifications_enabled', String(enabled));
}

export function isNotificationEnabled() {
  return notificationEnabled;
}

export function setNotificationClickHandler(handler) {
  onClickCallback = handler;
}

export function showBrowserNotification(title, body, userId) {
  console.log('[Notification] check:', {
    enabled: notificationEnabled,
    supported: isNotificationSupported(),
    permission: isNotificationSupported() ? Notification.permission : 'N/A',
    hidden: document.hidden,
  });
  if (!notificationEnabled) return;
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;

  try {
    const notification = new Notification(title, {
      body: body.length > 100 ? body.substring(0, 100) + '...' : body,
      icon: '/favicon.ico',
      tag: 'kaplia-' + userId,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onClickCallback) {
        onClickCallback(userId);
      }
    };

    setTimeout(() => notification.close(), 5000);
    console.log('[Notification] shown successfully');
  } catch (err) {
    console.error('[Notification] error:', err);
  }
}
