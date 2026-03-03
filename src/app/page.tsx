'use client';

import { useEffect, useMemo, useState } from 'react';
import { addMonths } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, LogOut, Search, StickyNote, User } from 'lucide-react';
import { CalendarGrid } from '@/components/CalendarGrid';
import { DayDetailPanel } from '@/components/DayDetailPanel';
import { FiltersToggle } from '@/components/FiltersToggle';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { NoteModal } from '@/components/NoteModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { buildMonthOptions, parseDateInput, toDateKey } from '@/lib/date';
import { createNote, removeNote, subscribeMonthNotes, subscribeYearNotes, updateNote } from '@/lib/notes';
import { signInWithGoogle, signOutUser, subscribeAuthState } from '@/lib/firebase';
import type { Note } from '@/types/note';

function groupNotesByDate(notes: Note[]) {
  const grouped = new Map<string, Note[]>();

  for (const note of notes) {
    const current = grouped.get(note.date) ?? [];
    current.push(note);
    current.sort((a, b) => a.time.localeCompare(b.time));
    grouped.set(note.date, current);
  }

  return grouped;
}

export default function Home() {
  const [uid, setUid] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [month, setMonth] = useState<Date>(new Date());
  const [showAllDays, setShowAllDays] = useState(false);
  const [gotoDate, setGotoDate] = useState('');
  const [showYearNotes, setShowYearNotes] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateKey(new Date()));

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);

  const monthOptions = useMemo(() => buildMonthOptions(new Date(), 84), []);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setUid(user?.uid ?? null);
      if (!user) {
        setNotes([]);
      }
      setLoadingAuth(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!feedback) return;

    const timer = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!uid) return;

    const subscribe = showYearNotes ? subscribeYearNotes : subscribeMonthNotes;

    const unsubscribe = subscribe(
      uid,
      month,
      (items) => {
        setNotes(items);
      },
      () => {
        setFeedback(showYearNotes ? 'Yıllık notlar alınırken hata oluştu.' : 'Notlar alınırken hata oluştu.');
      }
    );

    return unsubscribe;
  }, [uid, month, showYearNotes]);

  const notesByDate = useMemo(() => {
    const grouped = groupNotesByDate(notes);
    const counts = new Map<string, number>();

    for (const [date, dayNotes] of grouped.entries()) {
      counts.set(date, dayNotes.length);
    }

    return { grouped, counts };
  }, [notes]);

  const dayNotes = useMemo(() => {
    if (!selectedDate) return [];
    return notesByDate.grouped.get(selectedDate) ?? [];
  }, [notesByDate, selectedDate]);

  const openCreateModal = () => {
    setEditingNote(null);
    setModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setSelectedDate(note.date);
    setModalOpen(true);
  };

  const moveMonth = (direction: -1 | 1) => {
    setMonth((prev) => addMonths(prev, direction));
  };

  const handleDaySelect = (dateKey: string, noteCount: number) => {
    if (selectedDate === dateKey && noteCount === 0) {
      setSelectedDate(dateKey);
      openCreateModal();
      return;
    }

    setSelectedDate(dateKey);
  };

  if (loadingAuth) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-32 animate-pulse rounded-3xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      </main>
    );
  }

  if (!uid) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4 py-8">
        <div className="w-full rounded-3xl border border-zinc-200 bg-white/95 p-6 shadow-xl shadow-zinc-900/10 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
          <h1 className="mb-2 text-2xl font-bold">48Takvim</h1>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
            Kişisel takviminize erişmek için Google hesabınızla giriş yapın.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition active:scale-[0.99] hover:from-blue-500 hover:to-violet-500"
          >
            Google ile Giriş Yap
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-4 px-4 py-4 pb-24 sm:px-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">48Takvim</h1>
            <p className="mt-1 text-[10px] text-slate-500">Filtreli günler • tam ay görünümü</p>
          </div>

          <div className="flex items-center gap-2">
            <InstallPWAButton />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              aria-label="Çıkış"
              title="Çıkış"
            >
              <LogOut className="h-3.5 w-3.5" />
              Çıkış
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex w-fit items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100"
                aria-label="Önceki ay"
                title="Önceki ay"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100"
                aria-label="Sonraki ay"
                title="Sonraki ay"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1">
              <MonthYearPicker options={monthOptions} value={month} onChange={setMonth} />
            </div>
          </div>

          <div className="space-y-2">
            <FiltersToggle showAllDays={showAllDays} onChange={setShowAllDays} />
            <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
              value={gotoDate}
              onChange={(event) => setGotoDate(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;

                const parsed = parseDateInput(gotoDate);
                if (!parsed) {
                  setFeedback('Tarih formatı YYYY-MM-DD olmalı.');
                  return;
                }

                setMonth(parsed);
                setSelectedDate(toDateKey(parsed));
                setFeedback('Tarihe odaklanıldı.');
              }}
              placeholder="YYYY-MM-DD ile tarihe git"
              className="h-9 w-full bg-transparent text-[11px] text-slate-700 placeholder:text-slate-400 outline-none"
              aria-label="Tarihe git"
            />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowYearNotes((prev) => {
                const next = !prev;
                setFeedback(next ? 'Seçili yılın notları gösteriliyor.' : 'Seçili ayın notları gösteriliyor.');
                return next;
              });
            }}
            className="min-h-9 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
            aria-pressed={showYearNotes}
          >
            {showYearNotes ? 'Aylık Görünüm' : 'Yıllık Notları Getir'}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <motion.div layout className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
          <CalendarGrid
            month={month}
            notesByDate={notesByDate.counts}
            showAllDays={showAllDays}
            selectedDate={selectedDate}
            onSelectDate={handleDaySelect}
          />
          <p className="mt-5 text-center text-[9px] font-medium text-slate-500">
            Notu olmayan güne tekrar dokununca hızlı ekleme açılır.
          </p>
        </motion.div>

        <DayDetailPanel
          date={selectedDate}
          notes={dayNotes}
          onAdd={openCreateModal}
          onEdit={openEditModal}
          onDelete={async (note) => {
            await removeNote(uid, note.id);
            setFeedback('Not silindi.');
          }}
        />
      </section>

      <NoteModal
        open={modalOpen}
        date={selectedDate}
        editingNote={editingNote}
        onClose={() => setModalOpen(false)}
        onSave={async (input) => {
          if (editingNote) {
            await updateNote(uid, editingNote.id, input);
            setFeedback('Not güncellendi.');
            return;
          }

          await createNote(uid, input);
          setFeedback('Not eklendi.');
        }}
      />

      <AnimatePresence>
        {feedback ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-4 left-3 right-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-xl sm:left-auto sm:right-4"
          >
            {feedback}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav className="fixed inset-x-4 bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2 shadow-2xl backdrop-blur">
        <ul className="grid grid-cols-4 items-center text-slate-500">
          <li className="grid place-items-center">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-500 text-white">
              <CalendarDays className="h-4 w-4" />
            </span>
          </li>
          <li className="grid place-items-center">
            <Search className="h-4 w-4" />
          </li>
          <li className="grid place-items-center">
            <StickyNote className="h-4 w-4" />
          </li>
          <li className="grid place-items-center">
            <User className="h-4 w-4" />
          </li>
        </ul>
      </nav>
    </main>
  );
}
