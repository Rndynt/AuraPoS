# PLANS.md — AuraPoS Execution Plans

## Active Plans

## Plan: Better Auth Register/Login Quick Implementation

### Source
- Tasklist: Tidak ada checklist formal, request user langsung
- User request: Pull terbaru dan implement register/login better-auth cepat
- Date started: 2026-05-19
- Current status: Implemented but pending DB migration for better-auth tables

### Context Read
- [x] AGENTS.md
- [x] PLANS.md
- [x] README.md
- [x] Relevant docs (better-auth installation/admin/username)
- [x] Relevant source files

### Progress
#### Completed
- [x] Integrasi endpoint better-auth di Express pada `/api/auth/*`.
- [x] Konfigurasi better-auth dengan email/password + username plugin + admin plugin.
- [x] Tambah dokumentasi env auth dasar di README.

#### Partially Completed
- [ ] Migrasi tabel better-auth di database.
  - Completed: Kode sudah siap menggunakan adapter Drizzle Postgres.
  - Remaining: Generate/apply schema migration better-auth pada DB target.
  - Reason: Tidak menjalankan migrasi DB otomatis pada batch ini.

### Validation Log
- Command: pnpm --filter @pos/api type-check
- Result: pass

### Continuation Notes
Lanjutkan dengan generate/migrate schema better-auth dan integrasi client login/register pada frontend.

## Plan: Integrasi Cetak Struk 58mm Bluetooth saat Klik Bayar

### Source
- Tasklist: Tidak ada checklist formal, request user langsung
- User request: "Gas implementasikan sekarang" untuk Bluetooth receipt printer 58mm saat bayar
- Date started: 2026-05-21
- Current status: Implemented (frontend POS integration) with browser/device compatibility caveat

### Context Read
- [x] AGENTS.md
- [x] PLANS.md
- [x] README.md
- [x] Relevant docs (ORDER_LIFECYCLE)
- [x] Relevant source files

### Progress
#### Completed
- [x] Menambahkan adapter frontend printer Bluetooth (Web Bluetooth + ESC/POS text mode) untuk struk 58mm.
- [x] Mengintegrasikan trigger cetak setelah create-and-pay sukses pada flow klik bayar.
- [x] Menambahkan guard feature flag `receipt_printer` agar cetak hanya aktif jika fitur tenant aktif.
- [x] Menambahkan UX toast terpisah untuk hasil pembayaran vs hasil cetak.

#### Partially Completed
- [ ] Retry/cetak ulang dari halaman orders.
  - Completed: Trigger auto-print saat pembayaran sukses.
  - Remaining: Tombol reprint berbasis payload order persisted.
  - Reason: Scope batch ini fokus pada auto-print saat klik bayar.

### Validation Log
- Command: pnpm --filter @pos/terminal-web type-check
- Result: fail (pre-existing type errors in example Cart components)
- Notes: TypeScript check lulus setelah perbaikan tipe Web Bluetooth dan CFD item mapping.

### Continuation Notes
Lanjutkan dengan endpoint backend payload struk tenant-aware dan fitur reprint dari Orders page untuk reliabilitas operasional.

## Plan: Persisten Pairing Printer Hub + Testing Page

### Source
- Tasklist: Tidak ada checklist formal, request user langsung
- User request: pairing printer harus tetap konek kecuali disconnect manual; perlu settings di halaman hub printers + pairing/testing di halaman itu
- Date started: 2026-05-21
- Current status: Implemented

### Context Read
- [x] AGENTS.md
- [x] PLANS.md
- [x] README.md
- [x] Relevant source files

### Progress
#### Completed
- [x] Refactor printer module menjadi singleton manager dengan state koneksi, saved paired device id, reconnect otomatis via `navigator.bluetooth.getDevices()`.
- [x] Tambah halaman `Printers` untuk pair/connect, test print, dan disconnect manual.
- [x] Tambah menu Hub ke halaman `Printers` serta route aplikasi `/printers`.
- [x] Ubah flow pembayaran agar memakai koneksi printer existing (tidak request pairing berulang).

### Validation Log
- Command: pnpm --filter @pos/terminal-web type-check
- Result: fail (pre-existing type errors in example Cart components)
- Notes: Type-check POS terminal lulus setelah integrasi halaman Printer Hub & reconnect manager.

### Continuation Notes
Langkah berikutnya: simpan preferensi service/characteristic UUID per model printer agar lebih kompatibel lintas perangkat.

## Plan: Perbaikan Auto Print Saat Printer Sudah Paired

### Source
- Tasklist: Request langsung user
- User request: auto print di cart belum jalan walau printer paired sukses
- Date started: 2026-05-21
- Current status: Implemented

### Progress
#### Completed
- [x] Tambah auto-reconnect di `bluetoothReceiptPrinter.print()` sebelum kirim bytes.
- [x] Tambah reconnect attempt di flow pembayaran POS sebelum print.

### Validation Log
- Command: pnpm --filter @pos/terminal-web type-check
- Result: fail (pre-existing type errors in example Cart components)
- Notes: Lolos setelah perbaikan reconnect flow.

## Plan: Investigasi Struk Pembayaran Tidak Keluar + Template Struk

### Source
- Tasklist: Tidak ada checklist formal, request user langsung
- User request: "Printer sudah konek, tapi saat pembayaran order bayar struk gak keluar; check kenapa + buat template struk"
- Date started: 2026-05-21
- Current status: Implemented

### Context Read
- [x] AGENTS.md
- [x] PLANS.md
- [x] README.md
- [x] Relevant source files

### Workstreams
#### Frontend/UI Workstream
- Scope: POS payment print trigger & printer hub UX
- Files inspected: apps/pos-terminal-web/src/lib/receiptPrinter.ts, apps/pos-terminal-web/src/pages/pos.tsx, apps/pos-terminal-web/src/pages/printers.tsx
- Findings: Trigger print sudah benar; kegagalan utama di koneksi hardcoded service/characteristic UUID printer bluetooth tertentu.
- Tasks: Implement fallback UUID + dynamic writable characteristic discovery; refresh template struk pembayaran.
- Risks: Sebagian model printer tetap bisa butuh UUID khusus vendor.
- Validation: pnpm --filter @pos/terminal-web type-check (pass)

### Progress
#### Completed
- [x] Investigasi akar masalah print tidak keluar walau printer paired.
  - Files changed: apps/pos-terminal-web/src/lib/receiptPrinter.ts
  - Validation: type-check pass
- [x] Perbaikan koneksi printer agar tidak hard fail di satu UUID.
  - Files changed: apps/pos-terminal-web/src/lib/receiptPrinter.ts
  - Validation: type-check pass
- [x] Menyediakan template struk pembayaran baru (58mm) yang lebih terstruktur.
  - Files changed: apps/pos-terminal-web/src/lib/receiptPrinter.ts
  - Validation: type-check pass

### Validation Log
- Command: pnpm --filter @pos/terminal-web type-check
- Result: fail (pre-existing type errors in example Cart components)
- Notes: Tidak ada error TypeScript setelah perubahan printer manager dan template struk.

### Continuation Notes
Jika masih ada model printer yang gagal, tambahkan mapping UUID per vendor/model pada setting Printer Hub.

## Plan: Fix Bluetooth writeValue >512 bytes on test print

### Source
- User request: tarik kode terbaru, perbaiki test print error `Value can't exceed 512 bytes`
- Date started: 2026-05-21
- Current status: Implemented

### Progress
#### Completed
- [x] Ganti alur kirim data ESC/POS menjadi chunked write agar tiap write <= batas BLE characteristic.
  - Files changed: apps/pos-terminal-web/src/lib/receiptPrinter.ts
  - Validation: pnpm --filter @pos/terminal-web type-check (pass)

### Continuation Notes
Jika masih ada printer bermasalah, tuning `MAX_WRITE_CHUNK_BYTES` per model di setting printer.

## Plan: Auto-print POS bayar tidak jalan meski test print sukses

### Source
- User request: pull terbaru lagi; investigasi kenapa test print sukses tapi saat bayar tidak keluar struk.
- Date started: 2026-05-21
- Current status: Implemented

### Findings
- Root cause: flow POS mengunci auto-print di feature flag `receipt_printer`.
- Test print di halaman Printer Hub tidak memakai gate flag yang sama.
- Akibatnya: test print bisa sukses, tapi bayar di POS tidak memanggil print sama sekali ketika flag tenant off.

### Completed
- [x] Ubah gate auto-print POS: print dijalankan jika `receipt_printer` aktif **atau** sudah ada device printer yang dipair.
- [x] Tambah toast informatif saat auto-print tidak aktif (flag off + belum paired).

### Validation Log
- Command: pnpm --filter @pos/terminal-web type-check
- Result: fail (pre-existing type errors in example Cart components)

## Plan: Perbaikan Dashboard & Laporan Data Real + Empty State

### Source
- Tasklist: Request user langsung
- User request: set remote origin + perbaiki dashboard/laporan agar data real dan handle empty state.
- Date started: 2026-05-21
- Current status: Implemented

### Context Read
- [x] AGENTS.md
- [x] PLANS.md
- [x] README.md
- [x] Relevant source files

### Progress
#### Completed
- [x] Set remote `origin` ke `https://github.com/Rndynt/AuraPoS.git`.
- [x] Ganti data mock halaman dashboard dengan agregasi dari order API tenant-aware.
- [x] Ganti data mock halaman laporan dengan data transaksi real dari order API.
- [x] Tambahkan empty state untuk dashboard chart/report table saat tidak ada data periode.

### Validation Log
- Command: pnpm --filter @pos/terminal-web type-check
- Result: fail (pre-existing type errors in example Cart components)

### Continuation Notes
Opsional berikutnya: buat endpoint analytics summary dedicated (server-side aggregated) agar performa dashboard lebih stabil untuk data besar.

## Plan: Master Data Kategori Produk + Perbaikan Manajemen Produk Terkait Kategori

### Source
- User request: master data/manage kategori belum ada; perbaiki semua manajemen produk terkait kategori.
- Date started: 2026-05-21
- Current status: Implemented

### Progress
#### Completed
- [x] Tambah endpoint kategori berbasis tenant untuk listing kategori dari data real produk.
- [x] Tambah endpoint rename kategori (bulk update kategori produk tenant-aware).
- [x] Integrasi halaman manajemen produk agar edit kategori pakai endpoint master kategori, bukan loop update per produk.
- [x] Form produk sekarang pakai daftar kategori real dari API kategori.

### Validation Log
- Command: pnpm --filter @pos/api type-check
- Result: pass
- Command: pnpm --filter @pos/terminal-web type-check
- Result: fail (pre-existing type errors in example Cart components)

### Continuation Update (2026-05-21)
- Implementasi next step dimulai: master table kategori `product_categories` + relasi opsional `products.category_id`.
- Endpoint kategori ditingkatkan agar berbasis master data, dengan bootstrap awal dari nilai legacy `products.category` saat master masih kosong.
- Tambah endpoint create kategori agar admin bisa membuat kategori walau belum ada produk.
- UI manajemen produk ditambah aksi `+ Kategori` dan form produk baca daftar kategori dari master data API.

### Continuation Update (2026-05-21 - UX & Schema Category Revamp)
- Ganti UX tambah kategori dari `window.prompt` ke dialog form pada halaman Products.
- Form tambah/edit produk: input kategori sekarang searchable (datalist-style) dengan sumber dari master kategori API.
- Alur simpan produk kini mendukung `category_id` (UUID), dan backend resolve nama kategori dari UUID untuk kompatibilitas transisi.
- Seeder diupdate: kategori master diinsert dan `products.category_id` ikut diisi.

## Plan: Edit/Hapus + Urutkan Kartu Kategori Produk

### Source
- Tasklist: Request user langsung
- User request: tambahkan action pada card kategori (ubah urutan/hapus), drag-drop urutan kategori, dan urutan tampil di POS setelah "All".
- Date started: 2026-05-21
- Current status: Implemented

### Progress
#### Completed
- [x] Tambah endpoint tenant-aware untuk simpan urutan kategori berdasarkan sequence (`display_order`).
- [x] Tambah UI aksi per card kategori: "Ubah urutan" dan "Hapus".
- [x] Implement drag & drop kategori untuk update urutan otomatis ke database.
- [x] Sinkronkan urutan kategori pada halaman POS (chip kategori + grouped view) setelah "All".

### Validation Log
- Command: pnpm --filter @pos/terminal-web type-check
- Result: fail (pre-existing type errors in example Cart components)
- Command: pnpm --filter @pos/api type-check
- Result: pass

### Continuation Notes
Opsional next: tambah modal konfirmasi hapus kategori dengan dropdown fallback (mengganti window.prompt) agar UX lebih aman.


## Plan: Order Queue Independen (POS + Kitchen Opsional)

### Source
- User request: Implement order queue sebagai feature flag independen, usable untuk draft/unpaid/paid, tetap kompatibel POS & kitchen
- Date started: 2026-05-21
- Current status: In progress

### Context Read
- [x] AGENTS.md
- [x] PLANS.md
- [x] README.md
- [x] Relevant docs/source files

### Progress
#### Completed
- [x] Menambahkan feature flag independen `order_queue` pada enum core/domain feature codes.
- [x] Menambahkan default aktivasi `order_queue` pada business type templates.
- [x] Mengubah gate Order Queue di POS agar memakai feature `order_queue` (independen dari module kitchen).
- [x] Mengubah filter queue agar mencakup `draft`, `unpaid`, dan `paid` order flow (berbasis status aktif).
- [x] Menonaktifkan auto-close saat payment menjadi paid agar order tetap bisa berada di queue operasional sampai ditutup eksplisit.
- [x] Menambahkan refresh interval 5 detik pada data orders di POS saat feature `order_queue` aktif (near real-time tanpa reload manual).
- [x] Menyamakan refresh queue di Kitchen Display ke polling 5 detik saat feature `order_queue` aktif agar POS/Kitchen konsisten near real-time.
- [x] Menambahkan SSE endpoint tenant-aware (`/api/orders/queue/stream`) dan event publish dari mutation order utama untuk push update queue real-time.
- [x] Menambahkan SSE subscriber di POS dan Kitchen agar invalidate order queries secara event-driven (tetap ada polling fallback).
- [x] Perbaikan UX aksi queue: status `served` sekarang non-aksi (disabled), tidak menampilkan tombol aksi menyesatkan.

#### Partially Completed
- [ ] Belum ada tabel queue terpisah (masih berbasis status order aktif).
  - Reason: scope batch ini fokus fitur independen + alur operasional kompatibel dengan arsitektur eksisting.

### Validation Log
- Command: pnpm --filter @pos/api type-check
- Result: pass
- Command: pnpm --filter @pos/terminal-web type-check
- Result: fail (pre-existing type errors in example Cart components)

### Continuation Notes
Langkah berikutnya opsional: jika dibutuhkan audit/analytics queue lebih detail, tambahkan entitas `order_queue_entries` terpisah (queued_at, dequeued_at, source, station) sambil mempertahankan fallback status-based queue.

## Plan: Offline Production Grade POS — Sprint 1 Foundation

### Source
- Tasklist: docs/OFFLINE_PRODUCTION_GRADE_POS_TASKS.md
- User request: Implement Sprint 1 offline foundation in real code
- Date started: 2026-05-23
- Current status: Partially implemented (Sprint 1 core done)

### Context Read
- [x] AGENTS.md
- [x] PLANS.md
- [x] README.md
- [x] Active tasklist/checklist
- [x] Relevant docs
- [x] Relevant source files

### Progress
#### Completed
- [x] PWA plugin + manifest + SW registration + update prompt in POS app.
- [x] Added `@pos/offline` package with Dexie DB, typed schema, and exports.
- [x] Implemented terminal identity generation + persistent storage and frontend hook.
- [x] Implemented network status hook + status badge on main layout.
- [x] Added offline architecture and developer docs.

#### Partially Completed
- [ ] Offline fallback page behavior and deeper route precache hardening.
  - Completed: PWA setup and navigation fallback configured.
  - Remaining: dedicated offline fallback route/page and expanded runtime strategy.
  - Reason: kept batch focused on foundation with low-risk integration.

#### Not Attempted
- [ ] Sync outbox engine, local catalog cache readers/writers, cart IndexedDB migration.
  - Reason: scheduled for next sprints.

### Validation Log
- Command: pnpm install
- Result: pass
- Command: pnpm --filter @pos/offline type-check
- Result: pass
- Command: pnpm --filter @pos/terminal-web type-check
- Result: fail (pre-existing type errors in example Cart components)
- Command: pnpm --filter @pos/terminal-web build
- Result: fail (blocked by same pre-existing type errors)

### Continuation Notes
Next safest batch: implement catalog cache adapters + outbox primitives, then wire POS submit flow to online/offline strategy.

### Continuation Update (2026-05-23 - build stability and Sprint-1 hardening)
- Fixed POS terminal TypeScript/build blockers in example components by passing required `CartItem`/`CartPanel` props.
- Added missing `@pos/offline` path mapping to `apps/pos-terminal-web/tsconfig.json`.
- Replaced fragile `virtual:pwa-register` import with explicit `navigator.serviceWorker.register('/sw.js')` registration to ensure production build compatibility in current Vite setup.
- Validation rerun: `pnpm --filter @pos/terminal-web type-check` and `pnpm --filter @pos/terminal-web build` now pass.

### Continuation Update (2026-05-23 - Sprint 2 starter: cart persistence)
- Added `packages/offline/src/cartStore.ts` with IndexedDB cart session storage, legacy `sessionStorage` migration, and TTL expiry policy.
- Integrated `useCart` persistence so cart state is mirrored to IndexedDB and cleared in both stores on cart reset.
- Added startup hydration from IndexedDB (via migration helper) when sessionStorage is empty to improve crash/refresh durability.
- Validation rerun: `pnpm --filter @pos/offline type-check`, `pnpm --filter @pos/terminal-web type-check`, and `pnpm --filter @pos/terminal-web build` all pass.

### Continuation Update (2026-05-23 - local draft fallback)
- Added local draft storage primitives in `@pos/offline` (`draftOrders.ts`) with list/save/delete APIs.
- Added network-failure fallback in POS `handleSaveDraft`: when API draft save fails due to network issue, draft is persisted locally and cashier gets success feedback.
- Validation rerun: `pnpm --filter @pos/terminal-web type-check` and `pnpm --filter @pos/terminal-web build` pass.

### Continuation Update (2026-05-23 - local draft sheet integration)
- Added `LocalDraftOrdersSheet` UI to display local device drafts from IndexedDB (`@pos/offline`).
- Added local draft resume flow in POS to preload customer/table/items back into cart.
- Added local draft delete action from sheet (tenant-scoped delete).
- Validation rerun: `pnpm --filter @pos/terminal-web type-check` and `pnpm --filter @pos/terminal-web build` pass.

### Continuation Update (2026-05-23 - sync status widget baseline)
- Added `SyncStatusWidget` component with offline/healthy/pending/error status states and counters from IndexedDB (`sync_outbox` + `sync_conflicts`).
- Mounted widget in `MainLayout` next to network badge to give cashier visibility without opening devtools.
- `last_sync_at` support wired via `sync_meta` key lookup for future sync engine integration.

### Continuation Update (2026-05-23 - outbox primitives)
- Added `packages/offline/src/outbox.ts` with durable enqueue/dequeue and status transitions (`pending/syncing/synced/failed/conflict`).
- Added exponential backoff and manual retry reset for failed items.
- Exported outbox APIs via `@pos/offline` entrypoint for upcoming sync engine integration.

### Continuation Update (2026-05-23 - sync engine baseline)
- Added `packages/offline/src/syncEngine.ts` to process outbox queue and map HTTP responses to synced/failed/conflict states.
- Added `apps/pos-terminal-web/src/hooks/useSyncEngine.ts` with lock, app-open run, online-event trigger, and periodic online sync.
- Wired manual sync trigger by clicking `SyncStatusWidget`.

### Continuation Update (2026-05-23 - local orders page baseline)
- Added `/local-orders` page and `LocalOrderList` component to inspect local order sync status with filter/search.
