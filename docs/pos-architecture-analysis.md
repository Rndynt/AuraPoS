# POS Architecture Analysis & Recommendations

## 1. Memecah Struktur Proyek Supaya Tidak Menumpuk di Satu File

### Kondisi Saat Ini
- Seluruh orkestrasi layar POS masih dipusatkan di `client/src/pages/pos.tsx`, termasuk pemanggilan hook cart, variant selector, dan aksi fitur (DP/kitchen). Hal ini membuat file tumbuh besar karena ia menangani state, event handler, dan komposisi layout sekaligus.【F:client/src/pages/pos.tsx†L1-L152】
- Hook keranjang (`client/src/hooks/useCart.ts`) menyimpan seluruh logika order item di satu tempat sehingga sulit diuji ketika nanti bisnis proses bertambah (pajak berlapis, diskon, dsb.).【F:client/src/hooks/useCart.ts†L1-L84】
- Backend Express (`server/routes.ts`) belum memiliki modul atau route apa pun, sementara domain type berada di `packages/core/types.ts`. Artinya belum ada layer yang menjembatani domain dengan delivery/API.【F:server/routes.ts†L1-L15】【F:packages/core/types.ts†L1-L66】

### Usulan Struktur Modular
Gunakan struktur multi-app + packages agar tiap bounded context memiliki folder sendiri:

```
apps/
  web/                  # client (React/Vite)
    src/
      app/              # komposisi router & shell layout
      modules/
        pos/
          pages/
          components/
          hooks/
          services/
        dashboard/
          ...
      shared/
        ui/
        lib/
  api/                  # backend Express/Node
    src/
      app.ts
      http/
        routes/
        controllers/
      modules/
        catalog/
        orders/
        tenants/
packages/
  domain/               # entity + value object per bounded context
    catalog/
    pricing/
    orders/
  application/          # use-case/interactor layer
  infrastructure/       # repository, data mappers, integrations
shared/
  schema.ts             # tetap untuk Drizzle model
```

Pemisahan di atas membantu:
- **Delivery layer** (React route, Express controller) fokus menangani I/O.
- **Application layer** berisi use-case (CreateOrder, CalculatePayment) yang memanfaatkan domain service.
- **Domain layer** tetap framework-agnostic, memuat entity + value object yang sudah ada di `packages/core` tetapi dipecah per konteks.

Dengan modul per fitur (`modules/pos`, `modules/dashboard`), kita bisa memecah component besar jadi slice kecil (misal `modules/pos/features/cart`, `modules/pos/features/catalog`).

## 2. Dukungan Multi-Variant (Size + Extra + Preference)

### Kemampuan Saat Ini
- Produk hanya menyimpan daftar `variants: ProductVariant[]` sederhana dengan `price_delta` tunggal.【F:client/src/lib/mockData.ts†L13-L157】
- `VariantSelector` memakai radio button untuk satu pilihan saja, sehingga pengguna hanya bisa memilih **satu** variant per produk (misalnya "Large").【F:client/src/components/pos/VariantSelector.tsx†L1-L120】
- `useCart` mengidentifikasi item berdasarkan kombinasi `product.id` dan `variant.id`, jadi tambahan topping tidak bisa dibedakan karena struktur varian tunggal.【F:client/src/hooks/useCart.ts†L8-L31】

### Rencana Multi-Variant / Modifier
1. **Model data baru** – tambahkan tipe `ProductOptionGroup` dengan properti `selection_type: "single" | "multiple"`, `min/max`, dan `options` yang punya `price_delta`, `inventory_sku`, dll. Produk bisa memiliki banyak group seperti `Size`, `Sugar Level`, `Add-ons`.
2. **State cart** – ubah item cart agar menyimpan array `selectedOptions: SelectedOption[]` selain variant utama. `SelectedOption` menyimpan `group_id`, `option_id`, dan `price_delta`. Penentuan item unik menggunakan kombinasi `product_id + serialized(selectedOptions)` sehingga "extra shot" tidak bercampur dengan pesanan biasa.
3. **UI** – ganti `VariantSelector` dengan komponen dinamis yang merender:
   - RadioGroup untuk group `single` (misal Size).
   - Checkbox/stepper untuk group `multiple` (misal Extra Shot, Less Sugar).
   - Validasi min/max sebelum tombol "Add to Cart" aktif.
4. **Pricing** – kalkulasi total per item = `base_price + primary_variant + sum(selectedOptions.price_delta)` sebelum dikali qty.
5. **Backend** – di domain order item (`packages/core/types.ts`) tambahkan field `modifiers` yang menyimpan pilihan multi-varian agar histori order tetap lengkap.

Dengan struktur ini, kasus kopi "medium + extra shot + less sugar" dapat direpresentasikan sebagai: `primary_variant = Size:Medium`, `selectedOptions = [{group:"Extra Shot", option:"+1"}, {group:"Sugar", option:"Less"}]`.

## 3. Transformasi ke Domain-Driven / Microservice Siap Komersial

### Bounded Context Prioritas
1. **Catalog Context** – menangani produk, variant, stok per tenant.
2. **Ordering Context** – keranjang, order, pembayaran (partial/settlement) dan kitchen ticket.
3. **Tenant & Subscription Context** – mengaitkan fitur (feature flag, monetisasi) dengan tenant serta integrasi AuthCore.
4. **Reporting Context** – agregasi penjualan untuk dashboard.

### Layering yang Disarankan
- **Domain Layer (`packages/domain`)**: entity `Product`, `Variant`, `Modifier`, `Order`, `TenantFeature` lengkap dengan rule (misal validasi multi-tenant, inventory deduction). Domain event seperti `OrderPaid`, `KitchenTicketRequested` bisa diterbitkan dari sini.
- **Application Layer (`packages/application`)**: use-case/command seperti `CreateOrder`, `RecordPartialPayment`, `SyncTenantFeatures`. Layer ini menerima interface repository.
- **Infrastructure Layer (`packages/infrastructure`)**: implementasi repository (Postgres/Drizzle), adapter AuthCore (mengambil tenant & user), queue publisher untuk kitchen printer.
- **Interface/Delivery**: `apps/api` (REST/gRPC) dan `apps/web` (React) memanggil application service.

### Multi-Tenant + AuthCore
- Simpan `tenant_id` pada seluruh entity seperti yang sudah disiapkan di `packages/core/types.ts` (field `tenant_id` di `Product` dan `Order`).【F:packages/core/types.ts†L10-L66】
- Tambahkan middleware di `apps/api` untuk membaca identitas tenant dari token AuthCore dan menyuntikkan ke request context.
- Repository harus otomatis membatasi query berdasarkan `tenant_id`. Di React, gunakan `TenantContext` yang mendapatkan data tenant dari AuthCore SDK sehingga UI berhenti menggunakan konstanta `CURRENT_TENANT_ID`.

### Evolusi ke Microservice
1. **Mulai dengan modul DDD terpisah** dalam monorepo. Pastikan setiap bounded context sudah punya interface sendiri.
2. **Ekstraksi**: ketika modul siap dipisah, pindahkan `catalog` atau `ordering` ke service tersendiri (misal NestJS atau Go) namun tetap memakai kontrak event/API yang sudah didefinisikan di domain layer.
3. **Komunikasi**: gunakan event bus (Kafka/NATS) untuk event lintas konteks seperti `OrderCreated`, `InventoryAdjusted`. Dashboard tinggal subscribe.
4. **Observability & Deployment**: siapkan pipeline CI/CD per service, logging terpusat, serta contract test antar service untuk memastikan integritas multi-tenant.

Dengan tahapan di atas, kode lebih mudah dirawat, siap menyambut fitur seperti POS dashboard multi-tenant, sekaligus memberikan fondasi kuat untuk komersialisasi karena setiap domain jelas batasannya.
