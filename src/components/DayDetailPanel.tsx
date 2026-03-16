import { AnimatePresence, motion } from 'framer-motion';
import type { Note } from '@/types/note';
import { Paperclip, ExternalLink } from 'lucide-react';
import Image from 'next/image';

type DayDetailPanelProps = {
  date: string | null;
  notes: Note[];
  onAdd: () => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => Promise<void>;
};

export function DayDetailPanel({ date, notes, onAdd, onEdit, onDelete }: DayDetailPanelProps) {
  return (
    <aside className="w-full rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.08)] md:sticky md:top-6 md:h-fit">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gün Detayı</h2>
          <p className="mt-0.5 text-xs font-medium tracking-wide text-indigo-500">{date ?? 'Gün seçiniz'}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={!date}
          className="min-h-10 rounded-xl bg-indigo-500 px-3 text-xs font-bold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Not ekle"
        >
          Not Ekle
        </button>
      </div>

      <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {notes.map((note) => (
            <motion.article
              key={note.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="w-full text-left">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <strong className="line-clamp-1 text-[15px]">{note.title}</strong>
                  <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-600">{note.time}</span>
                </div>
                <p className="line-clamp-2 text-sm text-slate-600">{note.content}</p>
                {note.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {note.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-white px-2 py-0.5 text-xs text-indigo-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {note.attachments && note.attachments.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {note.attachments.map((file) => {
                      const isImage = file.type.startsWith('image/');
                      
                      if (isImage) {
                        return (
                          <div key={file.id} className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="relative aspect-square w-24 bg-zinc-100">
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    // Hata durumunda resmi gizle veya ikon göster
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                                  <ExternalLink className="h-5 w-5 text-white" />
                                </div>
                              </div>
                            </a>
                          </div>
                        );
                      }

                      return (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Paperclip className="h-3 w-3" />
                          <span className="max-w-[100px] truncate">{file.name}</span>
                        </a>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(note)}
                  className="min-h-9 rounded-xl border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  Düzenle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Bu notu silmek istediğinizden emin misiniz?')) {
                      void onDelete(note);
                    }
                  }}
                  className="min-h-9 rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Sil
                </button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>

        {date && notes.length === 0 ? (
          <p className="flex min-h-[120px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-xs italic text-slate-400">
            Bu güne ait henüz bir not yok.
          </p>
        ) : null}
      </div>

    </aside>
  );
}
