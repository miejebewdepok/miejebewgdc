import { LocalNotifications } from '@capacitor/local-notifications';

type NotificationOptions = {
  title: string;
  body: string;
  id?: number;
};

function isCapacitor(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isCapacitor()) return false;
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

export async function showLocalNotification({ title, body, id = 1 }: NotificationOptions): Promise<void> {
  if (!isCapacitor()) return;
  await ensureNotificationPermission();
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        schedule: { at: new Date(Date.now() + 50) },
        sound: 'default',
      },
    ],
  });
}

export async function notificationsPending(): Promise<number> {
  if (!isCapacitor()) return 0;
  const pending = await LocalNotifications.getPending();
  return pending.notifications?.length ?? 0;
}

export async function dismissAllPending(): Promise<void> {
  if (!isCapacitor()) return;
  const pending = await LocalNotifications.getPending();
  for (const n of pending.notifications ?? []) {
    await LocalNotifications.cancel({ notifications: [n] });
  }
}
