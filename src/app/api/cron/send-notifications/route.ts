import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Recurrence =
  | { type: 'none' }
  | {
      type: 'weekly';
      weekday: number;
    };

type NoteDoc = {
  date?: string;
  time?: string;
  title?: string;
  reminderDaysBefore?: number;
  recurrence?: Recurrence;
  recurrenceExceptions?: string[];
};

type TimeParts = {
  dateKey: string;
  timeKey: string;
  weekday: number;
};

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length) === secret;
  }

  const url = new URL(req.url);
  return url.searchParams.get('secret') === secret;
}

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

function weekdayFromDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
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
  const adminDb = getAdminDb();
  const ref = adminDb.doc(`users/${uid}/notificationLogs/${eventId}`);
  try {
    await ref.create({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      status: 'reserved',
      source: 'vercel-cron',
    });
    return { ok: true as const, ref };
  } catch {
    return { ok: false as const, ref };
  }
}

async function cleanupInvalidTokens(uid: string, invalidTokens: string[]) {
  if (invalidTokens.length === 0) return;

  const adminDb = getAdminDb();
  const batch = adminDb.batch();
  for (const token of invalidTokens) {
    batch.delete(adminDb.doc(`users/${uid}/fcmTokens/${token}`));
  }
  await batch.commit();
}

function getLookbackMinutes(): number {
  const raw = Number(process.env.CRON_LOOKBACK_MINUTES ?? '6');
  if (!Number.isFinite(raw)) return 6;
  return Math.max(1, Math.min(30, Math.floor(raw)));
}

function minuteSlots(now: Date, lookbackMinutes: number): TimeParts[] {
  const slots: TimeParts[] = [];
  for (let i = 0; i < lookbackMinutes; i += 1) {
    const d = new Date(now.getTime() - i * 60_000);
    slots.push(getTrTimeParts(d));
  }
  return slots;
}

async function run(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const lookbackMinutes = getLookbackMinutes();
    const slots = minuteSlots(now, lookbackMinutes);
    const newestSlot = slots[0];

    const adminDb = getAdminDb();
    const adminMessaging = getAdminMessaging();

    const usersSnapshot = await adminDb.collection('users').get();

    let totalSent = 0;
    let totalFailed = 0;
    let totalInvalidTokens = 0;
    let totalReserved = 0;

    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;

      const tokensSnapshot = await adminDb.collection(`users/${uid}/fcmTokens`).get();
      const tokens = tokensSnapshot.docs.map((d: { id: string }) => d.id).filter(Boolean);
      if (tokens.length === 0) continue;

      const oneTimeAndDatedNotesSnapshot = await adminDb
        .collection(`users/${uid}/notes`)
        .where('date', '>=', addDaysDateKey(newestSlot.dateKey, -31))
        .where('date', '<=', addDaysDateKey(newestSlot.dateKey, 31))
        .get();

      const recurringNotesSnapshot = await adminDb
        .collection(`users/${uid}/notes`)
        .where('recurrence.type', '==', 'weekly')
        .get();

      const allNotes = [
        ...oneTimeAndDatedNotesSnapshot.docs.map((d: { id: string; data: () => unknown }) => ({ id: d.id, ...(d.data() as NoteDoc) })),
        ...recurringNotesSnapshot.docs.map((d: { id: string; data: () => unknown }) => ({ id: d.id, ...(d.data() as NoteDoc) })),
      ];

      const dedupMap = new Map<string, { noteId: string; title: string; body: string; eventType: 'due' | 'before'; dateKey: string; timeKey: string }>();

      for (const slot of slots) {
        for (const note of allNotes) {
          if (!isValidTimeKey(note.time) || note.time !== slot.timeKey) continue;
          if (typeof note.title !== 'string' || note.title.trim().length === 0) continue;

          const eventDateToday = slot.dateKey;
          const reminderDays = typeof note.reminderDaysBefore === 'number' ? note.reminderDaysBefore : 0;

          if (canOccurOnDate(note, eventDateToday, slot.weekday)) {
            const key = `${note.id}:due:${eventDateToday}:${note.time}`;
            dedupMap.set(key, {
              noteId: note.id,
              title: '48Takvim Hatırlatma (şimdi)',
              body: `${note.title} şimdi başlıyor • ${eventDateToday} ${note.time}`,
              eventType: 'due',
              dateKey: eventDateToday,
              timeKey: note.time,
            });
          }

          if (reminderDays > 0) {
            const eventDateForReminder = addDaysDateKey(slot.dateKey, reminderDays);
            const eventWeekday = weekdayFromDateKey(eventDateForReminder);

            if (canOccurOnDate(note, eventDateForReminder, eventWeekday)) {
              const dayDiff = diffDays(slot.dateKey, eventDateForReminder);
              if (dayDiff === reminderDays) {
                const key = `${note.id}:before:${eventDateForReminder}:${note.time}`;
                dedupMap.set(key, {
                  noteId: note.id,
                  title: `48Takvim Hatırlatma (${reminderDays} gün önce)`,
                  body: `${note.title} • ${eventDateForReminder} ${note.time}`,
                  eventType: 'before',
                  dateKey: eventDateForReminder,
                  timeKey: note.time,
                });
              }
            }
          }
        }
      }

      for (const [eventId, item] of dedupMap.entries()) {
        const reservation = await reserveNotificationLog(uid, eventId, {
          noteId: item.noteId,
          eventType: item.eventType,
          eventId,
          scheduledForDate: item.dateKey,
          scheduledForTime: item.timeKey,
        });

        if (!reservation.ok) continue;
        totalReserved += 1;

        const response = await adminMessaging.sendEachForMulticast({
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
        response.responses.forEach((result: { success: boolean; error?: { code?: string } }, idx: number) => {
          if (result.success) return;
          const code = result.error?.code;
          if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        });

        await cleanupInvalidTokens(uid, invalidTokens);

        totalSent += response.successCount;
        totalFailed += response.failureCount;
        totalInvalidTokens += invalidTokens.length;

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

    return NextResponse.json({
      ok: true,
      source: 'vercel-cron',
      lookbackMinutes,
      usersChecked: usersSnapshot.size,
      eventsReserved: totalReserved,
      sent: totalSent,
      failed: totalFailed,
      invalidTokensRemoved: totalInvalidTokens,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown-error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
