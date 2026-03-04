# 48Takvim 🌙

Modern, cross-platform takvim/not uygulaması. Next.js App Router + TypeScript + Firebase (Auth/Firestore) + PWA.

## Özellikler

- Google ile giriş/çıkış (`[Firebase Auth](src/lib/firebase.ts)`)
- Kullanıcıya özel notlar (`[users/{uid}/notes](firestore.rules)` izolasyonu)
- Filtreli günler görünümü (sadece not olan günler)
- Toggle ile tam ay görünümü
- Gün detay paneli + not ekleme/düzenleme/silme
- Light/Dark tema (`[ThemeToggle](src/components/ThemeToggle.tsx)`)
- PWA kurulum butonu (`[InstallPWAButton](src/components/InstallPWAButton.tsx)`)
- Hızlı tarih odaklama (YYYY-MM-DD + Enter)

## Teknoloji

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Firebase Firestore + Auth

## Lokal Kurulum

1. Bağımlılıkları kur:

```bash
npm install
```

2. Ortam değişkenlerini hazırla:

- `[.env.example](.env.example)` dosyasını `[.env.local](.env.local)` olarak kopyala.
- Firebase Console’dan gerçek değerleri doldur.

3. Geliştirme sunucusunu başlat (port **5179**):

```bash
npm run dev
```

4. Tarayıcıda aç:

- `http://localhost:5179`

## Firebase Kurulumu

1. Firebase projesi oluştur.
2. Authentication > Sign-in method > Google sağlayıcısını aç.
3. Firestore Database oluştur (production mode önerilir).
4. Kuralları `[firestore.rules](firestore.rules)` ile güncelle.
5. Firebase Web App oluşturup env değerlerini al.

### Firestore Veri Modeli

- `users/{uid}`
- `users/{uid}/notes/{noteId}`
  - `date: string (YYYY-MM-DD)`
  - `time: string (HH:mm)`
  - `title: string`
  - `content: string`
  - `tags: string[]`
  - `createdAt, updatedAt: serverTimestamp`

## PWA

- Manifest: `[src/app/manifest.ts](src/app/manifest.ts)`
- Service worker: `[public/sw.js](public/sw.js)`
- Iconlar: `[public/icons](public/icons)`

> Not: Bu repoda ikonlar SVG placeholder’dır. İsterseniz CI/CD veya build adımında PNG (`192x192`, `512x512`, `maskable`, `apple-touch-icon`) çıktısı üretip manifest’e ekleyebilirsiniz.

## Arka Plan Bildirimleri (Spark Plan Uyumlu)

Bu repo, Firebase Functions kullanmadan Spark plan üzerinde arka plan bildirimi gönderecek şekilde güncellendi.

Bileşenler:

- Admin SDK init: `[src/lib/firebase-admin.ts](src/lib/firebase-admin.ts)`
- Cron endpoint: `[POST /api/cron/send-notifications](src/app/api/cron/send-notifications/route.ts:343)`
- GitHub cron job: `[.github/workflows/notify-cron.yml](.github/workflows/notify-cron.yml)`

Akış:

1. GitHub Actions her 5 dakikada bir cron endpoint’ini çağırır.
2. Endpoint `users/{uid}/notes` ve `users/{uid}/fcmTokens` verilerini okur.
3. Not zamanı gelen (`due`) ve `reminderDaysBefore` koşuluna uyan (`before`) olayları üretir.
4. `users/{uid}/notificationLogs/{eventId}` ile idempotent rezervasyon yapar.
5. FCM ile push gönderir, geçersiz tokenları temizler.

Neden 5 dakika?

- GitHub Actions minimum 5 dakikalık cron destekler.
- Endpoint içinde `CRON_LOOKBACK_MINUTES` (varsayılan 6) ile geçmiş dakika penceresi tarandığı için kaçan dakikalar yakalanır.

Gerekli ENV (Vercel):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `CRON_SECRET` (zorunlu, endpoint koruması)
- `CRON_LOOKBACK_MINUTES` (opsiyonel, öneri: `6`)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (zorunlu, Firebase service account JSON string)
- `FIREBASE_PROJECT_ID` (opsiyonel, override için)

Gerekli GitHub Secrets:

- `APP_BASE_URL` (ör. `https://senin-vercel-domainin.vercel.app`)
- `CRON_SECRET` (Vercel’dekiyle aynı değer)

Notlar:

- Tarayıcıdan token alımı için `[setupFcmForUser()](src/lib/fcm.ts:22)` içinde `NEXT_PUBLIC_FIREBASE_VAPID_KEY` zorunludur.
- Web push’in cihazda görünmesi için bildirim izni açık olmalıdır.

## Build / Production

```bash
npm run lint
npm run build
npm run start
```

## Vercel Deploy

1. Repoyu GitHub’a push et.
2. Vercel’de “New Project” ile repo bağla.
3. Environment Variables bölümüne `[.env.local](.env.local)` içeriğini ve sunucu değişkenlerini ekle:
    - `NEXT_PUBLIC_FIREBASE_API_KEY`
    - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
    - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    - `NEXT_PUBLIC_FIREBASE_APP_ID`
    - `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
    - `CRON_SECRET`
    - `CRON_LOOKBACK_MINUTES`
    - `FIREBASE_SERVICE_ACCOUNT_JSON`
    - `FIREBASE_PROJECT_ID`
4. Deploy et.
5. GitHub repo secret’larına `APP_BASE_URL` ve `CRON_SECRET` ekle.
6. Her push sonrası Vercel CI/CD ve cron workflow otomatik tetiklenir.

## Firestore Rule Testleri

- Senaryolar: `[docs/firestore-rules-tests.md](docs/firestore-rules-tests.md)`

## Kabul Kriteri Kontrol Listesi

- [x] Google login/logout
- [x] Kullanıcı izolasyonu (rules)
- [x] İlk açılışta filtreli günler
- [x] Toggle ile tüm günler
- [x] Çoklu notta farklı görsel vurgu
- [x] Gün tıklayınca saat sıralı liste
- [x] Not detayını modalde açma/düzenleme
- [x] PWA install butonu (destekli cihazlarda)
- [x] Light default + kalıcı tema
