'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, endOfMonth, endOfYear, format, parseISO, startOfMonth, startOfYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Filter, Flag, LogOut, Search, StickyNote, User } from 'lucide-react';
import { CalendarGrid } from '@/components/CalendarGrid';
import { DayDetailPanel } from '@/components/DayDetailPanel';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { NoteModal } from '@/components/NoteModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { buildMonthOptions, toDateKey } from '@/lib/date';
import { createNote, removeNote, subscribeAllNotes, updateNote } from '@/lib/notes';
import { signInWithGoogle, signOutUser, subscribeAuthState } from '@/lib/firebase';
import { buildSpecialDays } from '@/lib/specialDays';
import { setupFcmForUser } from '@/lib/fcm';
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

function toLocalDateKey(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function expandNotesInRange(sourceNotes: Note[], rangeStart: Date, rangeEnd: Date): Note[] {
  const expanded: Note[] = [];

  for (const note of sourceNotes) {
    const startDate = parseISO(note.date);
    if (Number.isNaN(startDate.getTime())) continue;

    if (note.recurrence?.type !== 'weekly') {
      if (startDate >= rangeStart && startDate <= rangeEnd) {
        expanded.push(note);
      }
      continue;
    }

    const targetWeekday = note.recurrence.weekday;
    const firstMatch = new Date(startDate);
    const offset = (targetWeekday - firstMatch.getDay() + 7) % 7;
    firstMatch.setDate(firstMatch.getDate() + offset);

    const cursor = new Date(firstMatch);
    while (cursor < rangeStart) {
      cursor.setDate(cursor.getDate() + 7);
    }

    while (cursor <= rangeEnd) {
      expanded.push({
        ...note,
        date: toLocalDateKey(cursor),
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  return expanded.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });
}

export default function Home() {
  const [uid, setUid] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [month, setMonth] = useState<Date>(new Date());
  const [showAllDays, setShowAllDays] = useState(true);
  const [showYearNotes, setShowYearNotes] = useState(false);
  const [showSpecialDays, setShowSpecialDays] = useState(true);

  const [showNotesListScreen, setShowNotesListScreen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateKey(new Date()));

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);

  const monthOptions = useMemo(() => buildMonthOptions(new Date(), 84), []);

  const todayMiladi = useMemo(
    () =>
      new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    []
  );

  const todayHicri = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('tr-TR-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
      }).format(new Date());
    } catch {
      return 'Hicri tarih desteklenmiyor';
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setUid(user?.uid ?? null);
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

    const unsubscribe = subscribeAllNotes(
      uid,
      (items) => {
        setAllNotes(items);
      },
      () => {
        setFeedback('Tüm notlar alınırken hata oluştu.');
      }
    );

    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    const run = async () => {
      const result = await setupFcmForUser(uid);
      if (cancelled) return;

      if (result.status === 'granted' && result.token) {
        setFeedback(`FCM hazır. Token kaydedildi: ${result.token.slice(0, 14)}...`);
        return;
      }

      if (result.status === 'denied') {
        setFeedback('Bildirim izni reddedildi. Ayarlardan açabilirsiniz.');
        return;
      }

      if (result.status === 'missing-config') {
        setFeedback('FCM VAPID anahtarı eksik. .env.local güncelleyin.');
        return;
      }

      if (result.status === 'unsupported') {
        setFeedback('Bu cihaz/tarayıcı FCM push desteklemiyor.');
        return;
      }

      if (result.status === 'error') {
        setFeedback(`FCM kurulumu başarısız: ${result.errorMessage ?? 'Bilinmeyen hata'}`);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const viewRange = useMemo(() => {
    if (showYearNotes) {
      return {
        start: startOfYear(month),
        end: endOfYear(month),
      };
    }

    return {
      start: startOfMonth(month),
      end: endOfMonth(month),
    };
  }, [month, showYearNotes]);

  const expandedViewNotes = useMemo(() => expandNotesInRange(allNotes, viewRange.start, viewRange.end), [allNotes, viewRange]);

  const notesByDate = useMemo(() => {
    const grouped = groupNotesByDate(expandedViewNotes);
    const counts = new Map<string, number>();

    for (const [date, dayNotes] of grouped.entries()) {
      counts.set(date, dayNotes.length);
    }

    return { grouped, counts };
  }, [expandedViewNotes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    const source = searchQuery.trim().length > 0 ? allNotes : expandedViewNotes;
    if (!q) return source;

    return source.filter((note) => {
      const haystack = [note.title, note.content, note.date, note.time, note.endTime ?? '', ...note.tags]
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return haystack.includes(q);
    });
  }, [allNotes, expandedViewNotes, searchQuery]);

  const filteredNotesByDate = useMemo(() => groupNotesByDate(filteredNotes), [filteredNotes]);

  const selectedDateForView = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return filteredNotes[0]?.date ?? null;
    }

    return selectedDate;
  }, [searchQuery, filteredNotes, selectedDate]);

  const dayNotes = useMemo(() => {
    if (!selectedDateForView) return [];
    return filteredNotesByDate.get(selectedDateForView) ?? [];
  }, [filteredNotesByDate, selectedDateForView]);

  const searchCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const [date, dayItems] of filteredNotesByDate.entries()) {
      counts.set(date, dayItems.length);
    }

    return counts;
  }, [filteredNotesByDate]);

  const activeCounts = searchQuery.trim().length > 0 ? searchCounts : notesByDate.counts;

  const specialDays = useMemo(() => buildSpecialDays(month, showYearNotes), [month, showYearNotes]);

  const allNotesSorted = useMemo(() => {
    return [...allNotes].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  }, [allNotes]);

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

  const handleDaySelect = (dateKey: string, noteCount: number, specialLabel?: string) => {
    if (selectedDate === dateKey && noteCount === 0) {
      setSelectedDate(dateKey);
      if (specialLabel) {
        setFeedback(`Özel gün: ${specialLabel}`);
        return;
      }
      openCreateModal();
      return;
    }

    setSelectedDate(dateKey);
    if (specialLabel) {
      setFeedback(`Özel gün: ${specialLabel}`);
    }
  };

  useEffect(() => {
    if (!uid) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const remindable = allNotes.filter((note) => (note.reminderDaysBefore ?? 0) > 0);
    if (remindable.length === 0) return;

    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }

    const tick = () => {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      const rangeStart = addDays(now, -2);
      const rangeEnd = addDays(now, 14);
      const upcoming = expandNotesInRange(remindable, rangeStart, rangeEnd);

      for (const note of upcoming) {
        const reminderDaysBefore = note.reminderDaysBefore ?? 0;
        if (reminderDaysBefore <= 0) continue;

        const eventAt = new Date(`${note.date}T${note.time}:00`);
        if (Number.isNaN(eventAt.getTime())) continue;

        const whenLabel = `${note.date} ${note.time}${note.endTime ? `-${note.endTime}` : ''}`;

        // 1 gün önce (mevcut davranış)
        const reminderAt = addDays(eventAt, -reminderDaysBefore);
        const reminderWindowEnd = new Date(reminderAt.getTime() + 60 * 60 * 1000);
        if (now >= reminderAt && now <= reminderWindowEnd) {
          const reminderKey = `takvim-reminder:before:${uid}:${note.id}:${note.date}`;
          if (!window.localStorage.getItem(reminderKey)) {
            new Notification('48Takvim Hatırlatma (1 gün önce)', {
              body: `${note.title} • ${whenLabel}`,
              tag: reminderKey,
            });
            window.localStorage.setItem(reminderKey, String(Date.now()));
          }
        }

        // Etkinlik anı (aynı gün, aynı dakika)
        const dueWindowEnd = new Date(eventAt.getTime() + 60 * 1000);
        if (now >= eventAt && now <= dueWindowEnd) {
          const dueKey = `takvim-reminder:due:${uid}:${note.id}:${note.date}`;
          if (!window.localStorage.getItem(dueKey)) {
            new Notification('48Takvim Hatırlatma (şimdi)', {
              body: `${note.title} şimdi başlıyor • ${whenLabel}`,
              tag: dueKey,
            });
            window.localStorage.setItem(dueKey, String(Date.now()));
          }
        }
      }
    };

    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, [uid, allNotes]);

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
          <h1 className="mb-2 text-xl font-semibold">{todayMiladi} / {todayHicri}</h1>
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
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{todayMiladi} / {todayHicri}</h1>
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
            <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-500 shadow-sm">
              <Search className="h-3.5 w-3.5" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tüm notlarda ara (başlık, içerik, etiket)"
                className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                aria-label="Tüm notlarda arama"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setShowAllDays((prev) => !prev)}
                className={[
                  'min-h-10 rounded-xl border px-3 text-xs font-semibold transition',
                  showAllDays
                    ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
                ].join(' ')}
                aria-pressed={showAllDays}
                title="Ayın tüm günleri / sadece not olan günler"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  {showAllDays ? 'Tüm Günler' : 'Notlu Günler'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowYearNotes((prev) => {
                    const next = !prev;
                    setFeedback(next ? 'Seçili yılın notları gösteriliyor.' : 'Seçili ayın notları gösteriliyor.');
                    return next;
                  });
                }}
                className={[
                  'min-h-10 rounded-xl border px-3 text-xs font-semibold transition',
                  showYearNotes
                    ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
                ].join(' ')}
                aria-pressed={showYearNotes}
                title="Aylık / yıllık görünüm"
              >
                <span className="inline-flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {showYearNotes ? 'Aylık Görünüm' : 'Yıllık Notlar'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowSpecialDays((prev) => !prev)}
                className={[
                  'min-h-10 rounded-xl border px-3 text-xs font-semibold transition',
                  showSpecialDays
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
                ].join(' ')}
                aria-pressed={showSpecialDays}
                title="Özel günleri göster / gizle"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5" />
                  Özel Günler
                </span>
              </button>
            </div>

          </div>
        </div>
      </section>

      {showNotesListScreen ? (
        <section className="space-y-4">
          <motion.div layout className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Tüm Notlar</h2>
              <span className="text-xs font-medium text-slate-500">{allNotesSorted.length} kayıt</span>
            </div>

            <div className="max-h-[58vh] space-y-1 overflow-y-auto pr-1">
              {allNotesSorted.map((note) => (
                <div key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{format(parseISO(note.date), 'd MMMM', { locale: tr })}</span>
                  <span className="text-slate-500">{' - '}</span>
                  <span>{note.title}</span>
                </div>
              ))}

              {allNotesSorted.length === 0 ? (
                <p className="flex min-h-[120px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-xs italic text-slate-400">
                  Henüz listelenecek not yok.
                </p>
              ) : null}
            </div>
          </motion.div>
        </section>
      ) : (
        <section className="space-y-4">
          <motion.div layout className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
            <CalendarGrid
              month={month}
              notesByDate={activeCounts}
              specialDays={specialDays}
              showAllDays={searchQuery.trim().length > 0 ? false : showAllDays}
              showYearNotes={showYearNotes}
              showSpecialDays={showSpecialDays}
              selectedDate={selectedDateForView}
              onSelectDate={handleDaySelect}
            />
            <p className="mt-5 text-center text-[9px] font-medium text-slate-500">
              {searchQuery.trim().length > 0
                ? `${filteredNotes.length} arama sonucu bulundu.`
                : showYearNotes
                  ? 'Yıllık görünümde notlar + özel günler ay gruplarıyla gösterilir.'
                  : 'Özel Günler açıkken Ramazan/dini/milli günler ayrıca renklendirilir.'}
            </p>
          </motion.div>

          <DayDetailPanel
            date={selectedDateForView}
            notes={dayNotes}
            onAdd={openCreateModal}
            onEdit={openEditModal}
            onDelete={async (note) => {
              await removeNote(uid, note.id);
              setFeedback('Not silindi.');
            }}
          />
        </section>
      )}

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
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-xl sm:bottom-4 sm:left-auto sm:right-4"
          >
            {feedback}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav className="fixed inset-x-4 bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2 shadow-2xl backdrop-blur">
        <ul className="grid grid-cols-4 items-center text-slate-500">
          <li className="grid place-items-center">
            <button
              type="button"
              onClick={() => setShowNotesListScreen(false)}
              className={[
                'grid h-9 w-9 place-items-center rounded-full transition',
                showNotesListScreen ? 'text-slate-500 hover:bg-slate-100' : 'bg-indigo-500 text-white',
              ].join(' ')}
              title="Takvim"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </li>
          <li className="grid place-items-center">
            <Search className="h-4 w-4" />
          </li>
          <li className="grid place-items-center">
            <button
              type="button"
              onClick={() => setShowNotesListScreen(true)}
              className={[
                'grid h-9 w-9 place-items-center rounded-full transition',
                showNotesListScreen ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100',
              ].join(' ')}
              title="Tüm notlar"
            >
              <StickyNote className="h-4 w-4" />
            </button>
          </li>
          <li className="grid place-items-center">
            <User className="h-4 w-4" />
          </li>
        </ul>
      </nav>
    </main>
  );
}
