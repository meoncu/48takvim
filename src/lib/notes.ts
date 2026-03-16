import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { monthBounds, yearBounds } from '@/lib/date';
import type { Note, NoteInput, Recurrence } from '@/types/note';

function userNotesCollection(uid: string) {
  return collection(db, 'users', uid, 'notes');
}

/**
 * Removes undefined values from an object to prevent Firestore errors.
 */
function clean<T extends object>(obj: T): T {
  const result = { ...obj };
  (Object.keys(result) as Array<keyof T>).forEach((key) => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}

export function subscribeMonthNotes(uid: string, month: Date, onData: (notes: Note[]) => void, onError: (error: Error) => void) {
  const { start, end } = monthBounds(month);

  const q = query(userNotesCollection(uid), where('date', '>=', start), where('date', '<=', end), orderBy('date', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const notes: Note[] = snapshot.docs
        .map((snapshotDoc) => {
          const data = snapshotDoc.data() as Omit<Note, 'id'>;
          const recurrenceRaw = data.recurrence as Recurrence | undefined;
          const recurrence: Recurrence | undefined = recurrenceRaw?.type === 'weekly'
            ? { type: 'weekly', weekday: recurrenceRaw.weekday }
            : recurrenceRaw?.type === 'none'
              ? { type: 'none' }
              : undefined;

          return {
            id: snapshotDoc.id,
            date: data.date,
            time: data.time,
            endTime: data.endTime,
            title: data.title,
            content: data.content ?? '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            tz: data.tz,
            recurrence,
            recurrenceExceptions: Array.isArray(data.recurrenceExceptions) ? data.recurrenceExceptions.filter((v): v is string => typeof v === 'string') : [],
            reminderDaysBefore: typeof data.reminderDaysBefore === 'number' ? data.reminderDaysBefore : 0,
            attachments: Array.isArray(data.attachments) ? data.attachments : [],
            deletedAt: data.deletedAt,
          };
        })
        .filter((note) => !note.deletedAt)
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        });

      onData(notes);
    },
    (err) => onError(err)
  );
}

export function subscribeYearNotes(uid: string, yearDate: Date, onData: (notes: Note[]) => void, onError: (error: Error) => void) {
  const { start, end } = yearBounds(yearDate);

  const q = query(userNotesCollection(uid), where('date', '>=', start), where('date', '<=', end), orderBy('date', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const notes: Note[] = snapshot.docs
        .map((snapshotDoc) => {
          const data = snapshotDoc.data() as Omit<Note, 'id'>;
          const recurrenceRaw = data.recurrence as Recurrence | undefined;
          const recurrence: Recurrence | undefined = recurrenceRaw?.type === 'weekly'
            ? { type: 'weekly', weekday: recurrenceRaw.weekday }
            : recurrenceRaw?.type === 'none'
              ? { type: 'none' }
              : undefined;

          return {
            id: snapshotDoc.id,
            date: data.date,
            time: data.time,
            endTime: data.endTime,
            title: data.title,
            content: data.content ?? '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            tz: data.tz,
            recurrence,
            recurrenceExceptions: Array.isArray(data.recurrenceExceptions) ? data.recurrenceExceptions.filter((v): v is string => typeof v === 'string') : [],
            reminderDaysBefore: typeof data.reminderDaysBefore === 'number' ? data.reminderDaysBefore : 0,
            attachments: Array.isArray(data.attachments) ? data.attachments : [],
            deletedAt: data.deletedAt,
          };
        })
        .filter((note) => !note.deletedAt)
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        });

      onData(notes);
    },
    (err) => onError(err)
  );
}

export function subscribeAllNotes(uid: string, onData: (notes: Note[]) => void, onError: (error: Error) => void) {
  const q = query(userNotesCollection(uid), orderBy('date', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const notes: Note[] = snapshot.docs
        .map((snapshotDoc) => {
          const data = snapshotDoc.data() as Omit<Note, 'id'>;
          const recurrenceRaw = data.recurrence as Recurrence | undefined;
          const recurrence: Recurrence | undefined = recurrenceRaw?.type === 'weekly'
            ? { type: 'weekly', weekday: recurrenceRaw.weekday }
            : recurrenceRaw?.type === 'none'
              ? { type: 'none' }
              : undefined;

          return {
            id: snapshotDoc.id,
            date: data.date,
            time: data.time,
            endTime: data.endTime,
            title: data.title,
            content: data.content ?? '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            tz: data.tz,
            recurrence,
            recurrenceExceptions: Array.isArray(data.recurrenceExceptions) ? data.recurrenceExceptions.filter((v): v is string => typeof v === 'string') : [],
            reminderDaysBefore: typeof data.reminderDaysBefore === 'number' ? data.reminderDaysBefore : 0,
            attachments: Array.isArray(data.attachments) ? data.attachments : [],
            deletedAt: data.deletedAt,
          };
        })
        .filter((note) => !note.deletedAt)
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        });

      onData(notes);
    },
    (err) => onError(err)
  );
}

export function subscribeTrashNotes(uid: string, onData: (notes: Note[]) => void, onError: (error: Error) => void) {
  const q = query(userNotesCollection(uid), orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const notes: Note[] = snapshot.docs
        .map((snapshotDoc) => {
          const data = snapshotDoc.data() as Omit<Note, 'id'>;
          return {
            id: snapshotDoc.id,
            date: data.date,
            time: data.time,
            endTime: data.endTime,
            title: data.title,
            content: data.content ?? '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            tz: data.tz,
            reminderDaysBefore: typeof data.reminderDaysBefore === 'number' ? data.reminderDaysBefore : 0,
            attachments: Array.isArray(data.attachments) ? data.attachments : [],
            deletedAt: data.deletedAt,
          };
        })
        .filter((note) => !!note.deletedAt)
        .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));

      onData(notes);
    },
    (err) => onError(err)
  );
}

export async function createNote(uid: string, input: NoteInput) {
  await addDoc(userNotesCollection(uid), clean({
    ...input,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
}

export async function updateNote(uid: string, noteId: string, input: Partial<NoteInput>) {
  await updateDoc(doc(db, 'users', uid, 'notes', noteId), clean({
    ...input,
    updatedAt: serverTimestamp(),
  }));
}

export async function removeNote(uid: string, noteId: string) {
  // Soft delete
  await updateDoc(doc(db, 'users', uid, 'notes', noteId), {
    deletedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreNote(uid: string, noteId: string) {
  await updateDoc(doc(db, 'users', uid, 'notes', noteId), {
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function permanentlyRemoveNote(uid: string, noteId: string) {
  await deleteDoc(doc(db, 'users', uid, 'notes', noteId));
}
