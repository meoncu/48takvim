import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

type Recurrence =
  | { type: 'none' }
  | {
      type: 'weekly';
      weekday: number;
    };

type NoteDoc = {
  date?: string;
  time?: string;
  endTime?: string;
  title?: string;
  content?: string;
  reminderDaysBefore?: number;
  recurrence?: Recurrence;
  recurrenceExceptions?: string[];
};

type TimeParts = {
  dateKey: string;
  timeKey: string;
  weekday: number;
};

function getTrTimeParts(value: Date): TimeParts {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = dtf.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';

  const year = part('year');
  const month = part('month');
  const day = part('day');
  const hour = part('hour');
  const minute = part('minute');
  const weekdayShort = part('weekday').toLowerCase();

  const weekdayMap: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };

  return {
    dateKey: `${year}-${month}-${day}`,
    timeKey: `${hour}:${minute}`,
    weekday: weekdayMap[weekdayShort] ?? 0,
  };
}

function addDaysDateKey(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + amount);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function diffDays(fromDateKey: string, toDateKey: string): number {
  const [fy, fm, fd] = fromDateKey.split('-').map(Number);
  const [ty, tm, td] = toDateKey.split('-').map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.floor((toUtc - fromUtc) / (24 * 60 * 60 * 1000));
}

function isValidDateKey(value?: string): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeKey(value?: string): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function canOccurOnDate(note: NoteDoc, onDateKey: string, onWeekday: number): boolean {
  const recurrence = note.recurrence;
  const exceptions = Array.isArray(note.recurrenceExceptions) ? note.recurrenceExceptions : [];
  if (exceptions.includes(onDateKey)) return false;

  if (!recurrence || recurrence.type === 'none') {
    return note.date === onDateKey;
  }

  if (recurrence.type !== 'weekly') return false;
  if (!isValidDateKey(note.date)) return false;

  return recurrence.weekday === onWeekday && note.date <= onDateKey;
}

async function reserveNotificationLog(uid: string, eventId: string, payload: Record<string, unknown>) {
  const ref = db.doc(`users/${uid}/notificationLogs/${eventId}`);
  try {
    await ref.create({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      status: 'reserved',
    });
    return { ok: true as const, ref };
  } catch {
    return { ok: false as const, ref };
  }
}

async function cleanupInvalidTokens(uid: string, invalidTokens: string[]) {
  if (invalidTokens.length === 0) return;

  const batch = db.batch();
  for (const token of invalidTokens) {
    batch.delete(db.doc(`users/${uid}/fcmTokens/${token}`));
  }
  await batch.commit();
}

export const sendScheduledNoteNotifications = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'Europe/Istanbul',
    region: 'europe-west1',
    retryCount: 3,
    memory: '256MiB',
  },
  async () => {
    const now = getTrTimeParts(new Date());

    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;

      const tokensSnapshot = await db.collection(`users/${uid}/fcmTokens`).get();
      const tokens = tokensSnapshot.docs.map((d) => d.id).filter(Boolean);
      if (tokens.length === 0) continue;

      const oneTimeAndDatedNotesSnapshot = await db
        .collection(`users/${uid}/notes`)
        .where('date', '>=', addDaysDateKey(now.dateKey, -31))
        .where('date', '<=', addDaysDateKey(now.dateKey, 31))
        .get();

      const recurringNotesSnapshot = await db
        .collection(`users/${uid}/notes`)
        .where('recurrence.type', '==', 'weekly')
        .get();

      const allNotes = [
        ...oneTimeAndDatedNotesSnapshot.docs.map((d) => ({ id: d.id, ...(d.data() as NoteDoc) })),
        ...recurringNotesSnapshot.docs.map((d) => ({ id: d.id, ...(d.data() as NoteDoc) })),
      ];

      const dedupMap = new Map<string, { noteId: string; title: string; body: string; eventType: 'due' | 'before' }>();

      for (const note of allNotes) {
        if (!isValidTimeKey(note.time) || note.time !== now.timeKey) continue;
        if (typeof note.title !== 'string' || note.title.trim().length === 0) continue;

        const eventDateToday = now.dateKey;
        const reminderDays = typeof note.reminderDaysBefore === 'number' ? note.reminderDaysBefore : 0;

        if (canOccurOnDate(note, eventDateToday, now.weekday)) {
          const key = `${note.id}:due:${eventDateToday}`;
          dedupMap.set(key, {
            noteId: note.id,
            title: '48Takvim Hatırlatma (şimdi)',
            body: `${note.title} şimdi başlıyor • ${eventDateToday} ${note.time}`,
            eventType: 'due',
          });
        }

        if (reminderDays > 0) {
          const eventDateForReminder = addDaysDateKey(now.dateKey, reminderDays);
          const eventWeekday = getTrTimeParts(new Date(`${eventDateForReminder}T12:00:00.000Z`)).weekday;

          if (canOccurOnDate(note, eventDateForReminder, eventWeekday)) {
            const dayDiff = diffDays(now.dateKey, eventDateForReminder);
            if (dayDiff === reminderDays) {
              const key = `${note.id}:before:${eventDateForReminder}`;
              dedupMap.set(key, {
                noteId: note.id,
                title: `48Takvim Hatırlatma (${reminderDays} gün önce)`,
                body: `${note.title} • ${eventDateForReminder} ${note.time}`,
                eventType: 'before',
              });
            }
          }
        }
      }

      for (const [eventId, item] of dedupMap.entries()) {
        const reservation = await reserveNotificationLog(uid, eventId, {
          noteId: item.noteId,
          eventType: item.eventType,
          eventId,
          scheduledForDate: now.dateKey,
          scheduledForTime: now.timeKey,
        });

        if (!reservation.ok) {
          continue;
        }

        const response = await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: item.title,
            body: item.body,
          },
          webpush: {
            notification: {
              icon: '/icons/icon-192.svg',
              badge: '/icons/icon-192.svg',
            },
            fcmOptions: {
              link: '/',
            },
          },
          data: {
            noteId: item.noteId,
            eventType: item.eventType,
            eventId,
          },
        });

        const invalidTokens: string[] = [];
        response.responses.forEach((result, idx) => {
          if (result.success) return;
          const code = result.error?.code;
          if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        });

        await cleanupInvalidTokens(uid, invalidTokens);

        await reservation.ref.set(
          {
            status: 'sent',
            sentAt: FieldValue.serverTimestamp(),
            successCount: response.successCount,
            failureCount: response.failureCount,
            invalidTokenCount: invalidTokens.length,
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );
      }
    }
  }
);
