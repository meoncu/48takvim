'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Note, NoteInput, Attachment } from '@/types/note';
import { Paperclip, X, FileIcon, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

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
      setAttachments(editingNote.attachments ?? []);
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
    setAttachments([]);
  }, [open, editingNote, date]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setUploading(true);
    try {
      // Resim sıkıştırma (Sadece resim dosyaları için)
      if (file.type.startsWith('image/')) {
        const options = {
          maxSizeMB: 1, // Maksimum 1MB
          maxWidthOrHeight: 1920, // Maksimum 1920px genişlik/yükseklik
          useWebWorker: true,
        };
        try {
          const compressedBlob = await imageCompression(file, options);
          // Blob'u tekrar File nesnesine dönüştür (orijinal ismi koruyarak)
          file = new File([compressedBlob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
        } catch (compressionError) {
          console.warn('Resim sıkıştırılamadı, orijinal dosya yükleniyor:', compressionError);
        }
      }

      // 1. Get signed URL from our API
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          userId: auth.currentUser.uid,
        }),
      });

      if (!res.ok) throw new Error('Yükleme URL\'i alınamadı');
      const { uploadUrl, fileKey } = await res.json();

      // 2. Upload directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) throw new Error('Dosya yüklenemedi');

      // 3. Add to attachments list
      const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-eec60fefa25a4b12abac15c90f68e4b2.r2.dev";
      const newAttachment: Attachment = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        url: `${publicUrlBase}/${fileKey}`,
        type: file.type,
        size: file.size,
      };

      setAttachments([...attachments, newAttachment]);
    } catch (error) {
      console.error('Yükleme hatası:', error);
      alert('Dosya yüklenirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

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
                    attachments: attachments.length > 0 ? attachments : undefined,
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

              <div>
                <label className="mb-2 flex items-center justify-between text-sm">
                  <span>Dosya Ekleri</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5" />
                    )}
                    {uploading ? 'Yükleniyor...' : 'Dosya Ekle'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </label>
                
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file) => {
                      const isImage = file.type.startsWith('image/');
                      return (
                        <div key={file.id} className="group relative flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2 transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/50">
                          {isImage ? (
                            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                              <Image 
                                src={file.url} 
                                alt={file.name} 
                                fill 
                                className="object-cover" 
                                unoptimized
                              />
                            </div>
                          ) : (
                            <FileIcon className="h-4 w-4 text-zinc-500" />
                          )}
                          <span className="max-w-[120px] truncate text-xs font-medium">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) {
                                removeAttachment(file.id);
                              }
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-700 dark:text-zinc-400"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
