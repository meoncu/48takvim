# Firestore Rules Test Senaryoları

Aşağıdaki senaryolar Firebase Emulator Suite ile doğrulanmalıdır.

## Pozitif Senaryolar

1. Kullanıcı A, `[users/{uidA}](firestore.rules)` dökümanını okuyabilir/yazabilir.
2. Kullanıcı A, `[users/{uidA}/notes/{noteId}](firestore.rules)` içine geçerli şemayla not ekleyebilir.
3. Kullanıcı A, kendi notunu güncelleyebilir (createdAt değişmeden).
4. Kullanıcı A, kendi notunu silebilir.

## Negatif Senaryolar

1. Kullanıcı A, `[users/{uidB}](firestore.rules)` veya alt notlarını okuyamaz.
2. Kullanıcı A, `[users/{uidB}/notes/{noteId}](firestore.rules)` altına yazamaz/silemez.
3. Auth olmayan istekler tüm koleksiyonlarda reddedilir.
4. `date` formatı `YYYY-MM-DD` değilse create/update reddedilir.
5. `time` formatı `HH:mm` değilse create/update reddedilir.
6. `title` boş veya >200 karakterse reddedilir.
7. `content` >5000 karakterse reddedilir.
8. `createdAt` alanını update sırasında değiştirme denemesi reddedilir.
