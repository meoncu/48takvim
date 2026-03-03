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
import type { Note, NoteInput } from '@/types/note';

function userNotesCollection(uid: string) {
  return collection(db, 'users', uid, 'notes');
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

          return {
            id: snapshotDoc.id,
            date: data.date,
            time: data.time,
            title: data.title,
            content: data.content ?? '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            tz: data.tz,
          };
        })
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

          return {
            id: snapshotDoc.id,
            date: data.date,
            time: data.time,
            title: data.title,
            content: data.content ?? '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            tz: data.tz,
          };
        })
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

export async function createNote(uid: string, input: NoteInput) {
  await addDoc(userNotesCollection(uid), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateNote(uid: string, noteId: string, input: Partial<NoteInput>) {
  await updateDoc(doc(db, 'users', uid, 'notes', noteId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function removeNote(uid: string, noteId: string) {
  await deleteDoc(doc(db, 'users', uid, 'notes', noteId));
}
