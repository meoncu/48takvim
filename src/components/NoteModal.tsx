'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Note, NoteInput } from '@/types/note';

type NoteModalProps = {
  open: boolean;
  date: string | null;
  editingNote: Note | null;
  onClose: () => void;
  onSave: (input: NoteInput) => Promise<void>;
};

export function NoteModal({ open, date, editingNote, onClose, onSave }: NoteModalProps) {
  const [time, setTime] = useState('09:00');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [endTime, setEndTime] = useState('');
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatWeekday, setRepeatWeekday] = useState<number>(6);
  const [remindOneDayBefore, setRemindOneDayBefore] = useState(true);
  const [saving, setSaving] = useState(false);

  // Zaman hesaplama yardımcısı
  const calculateDefaultEndTime = (startTime: string) => {
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + 30;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!open) return;

    if (editingNote) {
      setTime(editingNote.time);
      setTitle(editingNote.title);
      setContent(editingNote.content);
      setTagsText(editingNote.tags.join(', '));
      setEndTime(editingNote.endTime ?? '');
      setRepeatWeekly(editingNote.recurrence?.type === 'weekly');
      setRepeatWeekday(editingNote.recurrence?.type === 'weekly' ? editingNote.recurrence.weekday : new Date(`${editingNote.date}T00:00:00`).getDay());
      setRemindOneDayBefore((editingNote.reminderDaysBefore ?? 0) > 0);
      return;
    }

    const selectedWeekday = date ? new Date(`${date}T00:00:00`).getDay() : 6;
    const defaultStart = '09:00';

    setTime(defaultStart);
    setEndTime(calculateDefaultEndTime(defaultStart)); // Yarım saat sonrası (09:30)
    setTitle('');
    setContent('');
    setTagsText('');
    setRepeatWeekly(false);
    setRepeatWeekday(selectedWeekday);
    setRemindOneDayBefore(true);
  }, [open, editingNote, date]);

  const tags = useMemo(
    () =>
      tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagsText]
  );

  return (
    <AnimatePresence>
      {open && date ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl shadow-black/25 dark:bg-zinc-900 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">{editingNote ? 'Notu Düzenle' : 'Yeni Not'}</h3>
            <form
              className="space-y-3.5"
              onSubmit={async (event) => {
                event.preventDefault();
                setSaving(true);
                try {
                  const payload: NoteInput = {
                    date: date!,
                    time,
                    title: title.trim(),
                    content: content.trim(),
                    tags,
                    recurrence: repeatWeekly ? { type: 'weekly', weekday: repeatWeekday } : { type: 'none' },
                    reminderDaysBefore: remindOneDayBefore ? 1 : 0,
                  };

                  // Firebase undefined değerleri sevmez, bu yüzden endTime varsa ekleyelim
                  if (endTime.trim()) {
                    payload.endTime = endTime.trim();
                  }

                  await onSave(payload);
                  onClose();
                } catch (error) {
                  console.error('Not kaydedilirken hata oluştu:', error);
                  // Hata durumunda modal kapanmaz, sayfa üzerinde hata mesajı gösterilir
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div>
                <label className="mb-1 block text-sm">Tarih</label>
                <input value={date} readOnly className="h-11 w-full rounded-2xl border border-zinc-300 px-3 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Tekrar</label>
                <div className="rounded-2xl border border-zinc-300 p-3 dark:border-zinc-700">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={repeatWeekly}
                      onChange={(event) => setRepeatWeekly(event.target.checked)}
                    />
                    Her hafta tekrarla
                  </label>

                  {repeatWeekly ? (
                    <div className="mt-2">
                      <label className="mb-1 block text-xs text-zinc-500">Haftanın günü</label>
                      <select
                        value={repeatWeekday}
                        onChange={(event) => setRepeatWeekday(Number(event.target.value))}
                        className="h-10 w-full rounded-xl border border-zinc-300 px-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        <option value={1}>Pazartesi</option>
                        <option value={2}>Salı</option>
                        <option value={3}>Çarşamba</option>
                        <option value={4}>Perşembe</option>
                        <option value={5}>Cuma</option>
                        <option value={6}>Cumartesi</option>
                        <option value={0}>Pazar</option>
                      </select>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-sm">Başlangıç</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(event) => {
                      const newTime = event.target.value;
                      setTime(newTime);
                      setEndTime(calculateDefaultEndTime(newTime));
                    }}
                    className="h-11 w-full rounded-2xl border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Bitiş (opsiyonel)</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm">Başlık</label>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  className="h-11 w-full rounded-2xl border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">İçerik</label>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={5}
                  maxLength={5000}
                  className="w-full rounded-2xl border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Etiketler (virgülle)</label>
                <input
                  value={tagsText}
                  onChange={(event) => setTagsText(event.target.value)}
                  placeholder="iş, aile, sağlık"
                  className="h-11 w-full rounded-2xl border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm">Hatırlatma</label>
                <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-zinc-300 px-3 text-sm dark:border-zinc-700">
                  <input
                    type="checkbox"
                    checked={remindOneDayBefore}
                    onChange={(event) => setRemindOneDayBefore(event.target.checked)}
                  />
                  1 gün önce tarayıcı bildirimi gönder
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="min-h-11 rounded-2xl border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700">
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving || title.trim().length === 0}
                  className="min-h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60"
                >
                  {saving ? 'Kaydediliyor...' : editingNote ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
