'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Note } from '@/types/note';

type NoteModalProps = {
  open: boolean;
  date: string | null;
  editingNote: Note | null;
  onClose: () => void;
  onSave: (input: { date: string; time: string; title: string; content: string; tags: string[] }) => Promise<void>;
};

export function NoteModal({ open, date, editingNote, onClose, onSave }: NoteModalProps) {
  const [time, setTime] = useState('09:00');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingNote) {
      setTime(editingNote.time);
      setTitle(editingNote.title);
      setContent(editingNote.content);
      setTagsText(editingNote.tags.join(', '));
      return;
    }

    setTime('09:00');
    setTitle('');
    setContent('');
    setTagsText('');
  }, [open, editingNote]);

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
                  await onSave({ date, time, title: title.trim(), content: content.trim(), tags });
                  onClose();
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
                <label className="mb-1 block text-sm">Saat</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Başlık</label>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">İçerik</label>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={5}
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

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="min-h-11 rounded-2xl border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700">
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving || title.trim().length === 0}
                  className="min-h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60"
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
