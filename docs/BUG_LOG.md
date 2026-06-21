# BrainLongevity — Bug Log

Multi-iteration bugs and notable crashes. Format: symptom → root cause → fix.

---

## BUG-001 — iOS Build Fails (exit 65) — Podfile Header Stubs

**Date:** ~2026-05-20  
**Iterations:** 2+  
**Symptom:** `expo run:ios` exits with code 65. Linker errors referencing `EXEventEmitter.h`, `EXEventEmitterService.h`, `EXLegacyExpoViewProtocol.h` not found.  
**Root cause:** `expo-av@16` removed those headers from its public umbrella. Pods that depended on them broke at compile time.  
**Fix:** Added stub `.h` files via a `post_install` hook in `Podfile`. Stubs declare the missing interfaces as empty so the linker is satisfied without changing any runtime behavior.

---

## BUG-002 — isGuest Persisting After App Restart

**Date:** ~2026-05-25  
**Iterations:** 2  
**Symptom:** User taps "Guest mode", then kills and relaunches the app. App still opens in guest mode instead of showing the welcome screen.  
**Root cause:** `isGuest` flag was being saved to `SecureStore` / Keychain alongside the auth token. On relaunch, `loadToken` found `isGuest=true` in storage and restored guest state.  
**Fix:** Removed `isGuest` from all persistent storage. It now lives only in Zustand in-memory state. Guest session is always reset on app restart.

---

## BUG-003 — BrainHealthDrawer Not Opening (3 iterations)

**Date:** 2026-06-02  
**Iterations:** 3  
**Symptom:** Tapping the hamburger icon did nothing visible, or the drawer appeared for a split second then vanished. Domain score bars appeared but did not fill.

### Iteration 1 — zIndex approach
Tried rendering the drawer as a plain `View` with high `zIndex`. On iOS, `zIndex` does not cross `UIWindow` boundaries, so the drawer was rendered below the tab bar and other native elements. Not visible.

### Iteration 2 — Modal + setTimeout(50ms)
Switched to a `Modal` (which uses its own `UIWindow`, bypassing zIndex). Started Reanimated animations inside a `setTimeout(50ms)` to give the Modal time to mount before animating. Unreliable: 50ms was sometimes not enough for the native layer to attach the animated views, causing the spring to fire against an unmounted component and produce no visual movement.

### Iteration 3 (fix) — Modal + onShow callback + isOpenRef
Replaced the `setTimeout` with the Modal's `onShow` callback, which fires only after iOS has fully presented the window. Added `isOpenRef` (a `useRef`) to track open state without a stale closure in `useEffect`, fixing the close animation as well.

**Key files:** `components/BrainHealthDrawer.tsx`

---

## BUG-005 — Backend Başlamıyor: .env Whitespace + Fastify Plugin Versiyonları

**Date:** 2026-06-03  
**Iterations:** 3  
**Symptom:** `npm run dev` çalıştırıldığında sunucu ayağa kalkmıyor. `fetch failed: Could not connect to the server` hatası iOS Simulator'dan alınıyor.

### Iteration 1 — .env Whitespace
`JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `NODE_ENV` satırlarının önünde 2 boşluk karakteri vardı. `dotenv` bu satırları parse edemedi, `required('JWT_SECRET')` "Missing required env var: JWT_SECRET" fırlatıyordu.  
**Fix:** `.env` dosyasındaki tüm leading whitespace temizlendi.

### Iteration 2 — Fastify/Plugin Sürüm Uyumsuzluğu
`.env` düzeltmesinin ardından yeni hata: `FST_ERR_PLUGIN_VERSION_MISMATCH — @fastify/multipart expected '5.x' fastify version, '4.29.1' is installed`. `@fastify/multipart@^10` ve `@fastify/jwt@^9` zaten Fastify 5.x gerektiriyordu ama `fastify@^4.28` kuruluydu. `@fastify/cors@9` ve `@fastify/cookie@9` ise Fastify 4.x bekliyordu — tam tersi yöndeydi.  
**Fix:** Fastify 4→5 yükseltildi (`5.8.5`). Tüm `@fastify/*` plugin'leri en son Fastify-5 uyumlu versiyonlara güncellendi (`cors@11`, `cookie@11`, `jwt@10`, `multipart@9`). `package.json` yeni sürümleri yansıtıyor.

### Iteration 3 — @fastify/jwt Namespace API Değişikliği
Fastify 5 + `@fastify/jwt@10` geçişinden sonra register endpointi `Cannot read properties of undefined (reading 'sign')` verdi. `@fastify/jwt` v10'da namespace kullanıldığında decorator artık `fastify.refresh` değil `fastify.jwt.refresh` altına ekleniyor.  
**Fix:** `routes/auth.ts`'de `fastify.refresh.sign/verify` → `fastify.jwt.refresh.sign/verify` olarak güncellendi. TypeScript `declare module` tipi de düzeltildi.

**Key files:** `apps/backend/.env`, `apps/backend/package.json`, `apps/backend/src/routes/auth.ts`

---

## BUG-006 — APS Push Token: Simulator'da Unhandled Rejection

**Date:** 2026-06-03  
**Iterations:** 1  
**Symptom:** Kullanıcı giriş yaptıktan sonra console'da `[Unhandled promise rejection] Error: ... APS environment entitlement not found` hatası. Gezinmeyi engellemez ama Metro log'unu kirletir.  
**Root cause:** `hooks/usePushNotifications.ts` içindeki `Notifications.getExpoPushTokenAsync()` çağrısı iOS Simulator'da APS entitlement olmadığı için exception fırlatır. `registerForPushNotifications` fonksiyonu bu çağrıyı try/catch olmadan yapıyordu.  
**Fix:** `getExpoPushTokenAsync()` try/catch ile sarıldı. Simulator'da (ve entitlement'sız cihazlarda) sessizce `null` döner, push token kaydı atlanır.  
**Key files:** `apps/mobile/hooks/usePushNotifications.ts`

---

## BUG-004 — Expo SDK Crash: ModuleHolder.deinit Null Pointer

**Date:** 2026-06-02  
**Iterations:** N/A (SDK-level crash, no code fix)  
**Symptom:** App crashes with `EXC_BAD_ACCESS SIGSEGV` on the `com.facebook.react.runtime.JavaScript` thread ~1 second after a Fast Refresh is triggered.  
**Root cause:** Race condition in `ExpoModulesCore`. When Fast Refresh tears down the old JS runtime and initializes a new one, `AppContext.__deallocating_deinit` can run while `host:didInitializeRuntime:` callback is still executing. A `JavaScriptObject` inside `ModuleHolder` is accessed after it has been freed (null pointer at `0x0`).  
**Affected versions:** Expo SDK 56 + react-native 0.85.3 + old architecture (`newArchEnabled: false`).  
**Workaround:** Restart the simulator after the crash. Do a full reload (`Cmd+R`) rather than relying on Fast Refresh when iterating on files that touch native modules.  
**Permanent fix:** Upstream issue in `expo-modules-core`; resolved when Expo releases a patch for SDK 56.
