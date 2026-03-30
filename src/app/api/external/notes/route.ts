import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Recurrence =
  | { type: 'none' }
  | {
      type: 'weekly';
      weekday: number;
    };

type NoteDoc = {
  id: string;
  uid: string;
  date: string;
  time: string;
  title: string;
  content?: string;
  reminderDaysBefore?: number;
  recurrence?: Recurrence;
  recurrenceExceptions?: string[];
  deletedAt?: string | null;
  tags?: string[];
};

function isAuthorized(req: Request): boolean {
  const secret = process.env.N8N_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length) === secret;
  }

  const url = new URL(req.url);
  return url.searchParams.get('secret') === secret;
}

function getTrTimeParts(value: Date): { dateKey: string; timeKey: string; weekday: number } {
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
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
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
  return d.toISOString().split('T')[0];
}

function weekdayFromDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function canOccurOnDate(note: Omit<NoteDoc, 'id' | 'uid'>, onDateKey: string, onWeekday: number): boolean {
  const recurrence = note.recurrence;
  const exceptions = Array.isArray(note.recurrenceExceptions) ? note.recurrenceExceptions : [];
  if (exceptions.includes(onDateKey)) return false;

  if (!recurrence || recurrence.type === 'none') {
    return note.date === onDateKey;
  }

  if (recurrence.type !== 'weekly') return false;
  return recurrence.weekday === onWeekday && note.date <= onDateKey;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const queryDate = url.searchParams.get('date');
    const queryTime = url.searchParams.get('time');
    const lookback = parseInt(url.searchParams.get('lookback') || '5', 10);
    const force = url.searchParams.get('force') === 'true';

    const baseNow = new Date();
    const adminDb = getAdminDb();
    
    const slots: { dateKey: string; timeKey: string; weekday: number }[] = [];
    if (queryDate && queryTime) {
      const [y, m, d] = queryDate.split('-').map(Number);
      const [h, min] = queryTime.split(':').map(Number);
      const manualDate = new Date(y, m - 1, d, h, min);
      slots.push(getTrTimeParts(manualDate));
    } else {
      for (let i = 0; i < lookback; i++) {
        const d = new Date(baseNow.getTime() - i * 60_000);
        slots.push(getTrTimeParts(d));
      }
    }

    const newestSlot = slots[0];
    const usersSnapshot = await adminDb.collection('users').get();
    const results: any[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();

      const notesSnapshot = await adminDb
        .collection(`users/${uid}/notes`)
        .where('date', '>=', addDaysDateKey(newestSlot.dateKey, -31))
        .where('date', '<=', addDaysDateKey(newestSlot.dateKey, 31))
        .get();

      const recurringSnapshot = await adminDb
        .collection(`users/${uid}/notes`)
        .where('recurrence.type', '==', 'weekly')
        .get();

      const allNotesRaw = [
        ...notesSnapshot.docs.map(d => ({ id: d.id, ...d.data() as Omit<NoteDoc, 'id' | 'uid'> })),
        ...recurringSnapshot.docs.map(d => ({ id: d.id, ...d.data() as Omit<NoteDoc, 'id' | 'uid'> })),
      ];

      const uniqueNotes = Array.from(new Map(allNotesRaw.map(n => [n.id, n])).values())
                               .filter(n => !n.deletedAt);

      for (const slot of slots) {
        for (const note of uniqueNotes) {
          if (note.time !== slot.timeKey) continue;
          
          let matched = false;
          let eventType = '';
          let matchDate = '';

          if (canOccurOnDate(note, slot.dateKey, slot.weekday)) {
            matched = true;
            eventType = 'due';
            matchDate = slot.dateKey;
          } 
          else if (typeof note.reminderDaysBefore === 'number' && note.reminderDaysBefore > 0) {
            const eventDateForReminder = addDaysDateKey(slot.dateKey, note.reminderDaysBefore);
            const eventWeekday = weekdayFromDateKey(eventDateForReminder);

            if (canOccurOnDate(note, eventDateForReminder, eventWeekday)) {
               matched = true;
               eventType = 'reminder';
               matchDate = eventDateForReminder;
            }
          }

          if (matched) {
            const eventId = `${uid}:${note.id}:${eventType}:${matchDate}:${note.time}`;
            
            // Check if already sent (skip if not forced)
            if (!force) {
               const logDoc = await adminDb.doc(`users/${uid}/notificationLogs/${eventId}`).get();
               if (logDoc.exists && logDoc.data()?.status === 'sent') {
                 continue;
               }
            }

            results.push({
              eventId,
              id: note.id,
              uid: uid,
              userEmail: userData?.email || '',
              phoneNumber: userData?.phoneNumber || '', // If available
              title: note.title,
              content: note.content || '',
              time: note.time,
              date: matchDate,
              eventType: eventType,
              tags: note.tags || [],
              polledAt: new Date().toISOString()
            });
          }
        }
      }
    }

    const finalResults = Array.from(new Map(results.map(r => [r.eventId, r])).values());

    return NextResponse.json({
      ok: true,
      count: finalResults.length,
      data: finalResults
    });

  } catch (error) {
    console.error('N8N API Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { eventId } = await req.json();
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ ok: false, error: 'eventId required' }, { status: 400 });
    }

    const parts = eventId.split(':');
    if (parts.length < 5) {
      return NextResponse.json({ ok: false, error: 'invalid eventId format' }, { status: 400 });
    }

    const uid = parts[0];
    const adminDb = getAdminDb();
    
    await adminDb.doc(`users/${uid}/notificationLogs/${eventId}`).set({
      status: 'sent',
      sentAt: FieldValue.serverTimestamp(),
      source: 'n8n',
      eventId,
      updatedAt: Timestamp.now()
    }, { merge: true });

    return NextResponse.json({ ok: true, message: 'Marked as complete' });

  } catch (error) {
    console.error('N8N API Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
