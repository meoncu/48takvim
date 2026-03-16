import { useState, useEffect } from "react";
import { Trash2, AlertTriangle, RefreshCw, FileIcon, CheckCircle2, ChevronRight, HardDrive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type OrphanedFile = {
  key: string;
  size: number;
  lastModified: string;
  url: string;
};

type StorageStats = {
  orphanedFiles: OrphanedFile[];
  totalCount: number;
  referencedCount: number;
  orphanedCount: number;
};

export function R2StorageManager({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orphaned-files");
      if (!res.ok) throw new Error("Stats fetch failed");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      setFeedback("Veriler alınırken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const deleteFile = async (key: string) => {
    setDeleting(key);
    try {
      const res = await fetch("/api/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey: key }),
      });
      if (!res.ok) throw new Error("Delete failed");
      
      // Update local state
      setStats(prev => prev ? {
        ...prev,
        orphanedFiles: prev.orphanedFiles.filter(f => f.key !== key),
        orphanedCount: prev.orphanedCount - 1
      } : null);
      
      setFeedback("Dosya başarıyla silindi.");
    } catch (err) {
      console.error(err);
      setFeedback("Dosya silinirken hata oluştu.");
    } finally {
      setDeleting(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalOrphanedSize = stats?.orphanedFiles.reduce((acc, f) => acc + (f.size || 0), 0) || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-4 bottom-20 z-40 max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-indigo-600">
          <HardDrive className="h-5 w-5" />
          <h2 className="font-bold text-lg">Depo Yönetimi</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} onClick={(e) => { e.stopPropagation(); fetchStats(); }} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Sahipsiz dosyalar taranıyor...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kullanılan</p>
              <p className="text-xl font-bold text-slate-900">{stats?.referencedCount}</p>
              <p className="text-[10px] text-slate-500">bağlı dosya</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Boşa Çıkacak</p>
              <p className="text-xl font-bold text-amber-900">{formatSize(totalOrphanedSize)}</p>
              <p className="text-[10px] text-amber-600">{stats?.orphanedCount} gereksiz dosya</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
            <h3 className="text-xs font-bold text-slate-500 ml-1">SİLİNMESİ ÖNERİLEN DOSYALAR</h3>
            {stats?.orphanedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-indigo-50/50 rounded-2xl border border-dashed border-indigo-100">
                <CheckCircle2 className="h-8 w-8 text-indigo-300 mb-2" />
                <p className="text-sm font-medium text-indigo-900">Tertemiz!</p>
                <p className="text-[10px] text-indigo-500">Tüm dosyalar notlarla ilişkili.</p>
              </div>
            ) : (
              stats?.orphanedFiles.map((file) => (
                <div key={file.key} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-colors group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                      {file.key.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                        <img src={file.url} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <FileIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-slate-800 truncate">{file.key.split('/').pop()}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteFile(file.key)}
                    disabled={deleting === file.key}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                  >
                    {deleting === file.key ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pt-2">
            <button 
              onClick={onClose}
              className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-900 text-white text-[10px] font-bold rounded-full shadow-lg">
          {feedback}
        </div>
      )}
    </motion.div>
  );
}
