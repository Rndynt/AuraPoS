export const ENTITLEMENT_CATALOG = {
  meta: {
    version: 2,
    currency: 'IDR',
    description: 'Single source of truth for AuraPoS commercial tenant entitlements.',
  },
  billingIntervals: {
    none: { label: 'No billing interval' },
    one_time: { label: 'One time' },
    monthly: { label: 'Monthly' },
    yearly: { label: 'Yearly' },
  },
  plans: {
    starter: {
      label: 'Starter',
      sortOrder: 10,
      price: 0,
      billingInterval: 'monthly',
      included: ['inventory_basic_stock', 'payments_partial_payment'],
    },
    growth: {
      label: 'Growth',
      sortOrder: 20,
      price: 99000,
      billingInterval: 'monthly',
      included: ['orders_queue', 'restaurant_kitchen_ops', 'reports_advanced'],
    },
    pro: {
      label: 'Pro',
      sortOrder: 30,
      price: 199000,
      billingInterval: 'monthly',
      included: [
        'inventory_advanced_stock',
        'payments_multi_payment',
        'payments_split_payment',
        'reports_export',
        'multi_location',
        'integrations_payment_gateway',
        'integrations_api_access',
      ],
    },
  },
  entitlements: {
    inventory_basic_stock: {
      label: 'Stok Dasar', kind: 'module', area: 'inventory',
      category: 'Inventori',
      description: 'Lihat stok per produk, status menipis/habis, & adjust qty.',
      longDesc: 'Fitur stok esensial: aktifkan tracking stok per produk, lihat status (aman, menipis, habis) secara real-time, dan lakukan penyesuaian stok langsung.',
    },
    inventory_advanced_stock: {
      label: 'Stok Lanjutan', kind: 'module', area: 'inventory',
      category: 'Inventori',
      description: 'Mutasi stok bertipe, riwayat audit trail, & laporan pergerakan.',
      longDesc: 'Melengkapi Stok Dasar: catat mutasi stok bertipe (pembelian, rusak, retur), riwayat lengkap setiap pergerakan, dan laporan audit trail.',
    },
    payments_partial_payment: {
      label: 'Pembayaran Sebagian', kind: 'feature', area: 'payments',
      category: 'Pembayaran',
      description: 'Bayar sebagian, lunasi nanti — split bill & cicilan.',
      longDesc: 'Terima pembayaran parsial atau split bill antar pelanggan. Sisa tagihan tercatat dan bisa dilunasi di waktu berbeda dengan metode berbeda.',
    },
    payments_multi_payment: {
      label: 'Multi Pembayaran', kind: 'feature', area: 'payments',
      category: 'Pembayaran',
      description: 'Satu transaksi dibayar dengan beberapa metode sekaligus.',
      longDesc: 'Gabungkan beberapa metode pembayaran dalam satu transaksi (mis. sebagian tunai, sebagian QRIS) dengan rekonsiliasi otomatis.',
    },
    payments_split_payment: {
      label: 'Split Payment', kind: 'feature', area: 'payments',
      category: 'Pembayaran',
      description: 'Pisah tagihan per orang atau per item dalam satu order.',
      longDesc: 'Bagi satu order menjadi beberapa tagihan terpisah per pelanggan atau per item, masing-masing dengan pembayarannya sendiri.',
    },
    receipt_compact: {
      label: 'Struk Ringkas', kind: 'feature', area: 'receipt',
      category: 'Struk',
      description: 'Format struk ringkas hemat kertas untuk printer thermal.',
      longDesc: 'Layout struk yang lebih padat untuk menghemat kertas thermal, tetap memuat info penting transaksi, item, pajak, dan metode bayar.',
    },
    orders_queue: {
      label: 'Antrian Order', kind: 'feature', area: 'orders',
      category: 'Order',
      description: 'Panel antrian semua order aktif real-time di layar kasir.',
      longDesc: 'Panel samping yang menampilkan semua order aktif secara real-time beserta status bayar. Kasir memantau pesanan tanpa berpindah layar.',
    },
    restaurant_table_service: {
      label: 'Layanan Meja', kind: 'module', area: 'restaurant',
      category: 'Restoran',
      description: 'Denah meja real-time, status duduk, & pesanan per meja.',
      longDesc: 'Denah meja interaktif: lihat status meja (tersedia / terisi / reservasi) dan lanjutkan pesanan langsung dari tampilan lantai.',
    },
    restaurant_kitchen_ops: {
      label: 'Operasional Dapur', kind: 'module', area: 'restaurant',
      category: 'Restoran',
      description: 'Tiket dapur, layar KDS, & printer dapur dalam satu paket.',
      longDesc: 'Operasional dapur terintegrasi: tiket pesanan otomatis ke dapur, layar display khusus staf dapur, dan dukungan printer thermal dapur.',
    },
    reports_advanced: {
      label: 'Laporan Lanjutan', kind: 'feature', area: 'reports',
      category: 'Laporan',
      description: 'Dashboard analitik, grafik real-time, & insight penjualan.',
      longDesc: 'Dashboard visual dengan grafik omzet, produk terlaris, rata-rata nilai transaksi, dan insight bisnis. Update real-time, bisa difilter per periode.',
    },
    reports_export: {
      label: 'Ekspor Laporan', kind: 'feature', area: 'reports',
      category: 'Laporan',
      description: 'Ekspor laporan ke Excel/PDF untuk akuntansi & arsip.',
      longDesc: 'Ekspor laporan penjualan dan inventori ke format Excel atau PDF untuk kebutuhan akuntansi, audit, atau arsip bulanan.',
    },
    multi_location: {
      label: 'Multi Lokasi', kind: 'module', area: 'multi_location',
      category: 'Ekspansi',
      description: 'Kelola beberapa cabang dari satu dashboard terpusat.',
      longDesc: 'Buka dan kelola beberapa cabang dari satu akun: laporan per cabang, atur produk & harga per lokasi, dan transfer stok antar cabang.',
    },
    hardware_label_printer: {
      label: 'Printer Label', kind: 'feature', area: 'hardware',
      category: 'Hardware',
      description: 'Cetak label harga, barcode, atau stiker produk.',
      longDesc: 'Cetak label produk dengan barcode, harga, dan nama. Cocok untuk laundry (tag pakaian), retail (label harga), atau usaha dengan banyak SKU.',
    },
    hardware_barcode_scanner: {
      label: 'Scanner Barcode', kind: 'feature', area: 'hardware',
      category: 'Hardware',
      description: 'Scan produk dari kamera atau scanner USB/Bluetooth.',
      longDesc: 'Tambahkan produk ke keranjang dengan scan barcode. Mendukung scanner USB, Bluetooth, dan kamera perangkat untuk checkout retail lebih cepat.',
    },
    integrations_payment_gateway: {
      label: 'Payment Gateway', kind: 'integration', area: 'integrations',
      category: 'Integrasi',
      description: 'Terima QRIS, Virtual Account, GoPay, OVO, & kartu.',
      longDesc: 'Integrasi payment gateway: QRIS, Virtual Account, GoPay, OVO, ShopeePay, dan kartu kredit. Rekonsiliasi otomatis ke laporan penjualan.',
    },
    integrations_accounting: {
      label: 'Akuntansi', kind: 'integration', area: 'integrations',
      category: 'Integrasi',
      description: 'Sinkron transaksi ke Jurnal, Accurate, atau Excel.',
      longDesc: 'Sinkron data penjualan & pembayaran ke software akuntansi (Jurnal, Accurate) atau ekspor otomatis ke Excel setiap tutup hari.',
    },
    integrations_webhook: {
      label: 'Webhook', kind: 'integration', area: 'integrations',
      category: 'Integrasi',
      description: 'Kirim event transaksi otomatis ke sistem eksternal.',
      longDesc: 'Webhook untuk mengirim event (order dibuat, pembayaran selesai, dll.) secara real-time ke sistem eksternal seperti ERP atau notifikasi.',
    },
    integrations_api_access: {
      label: 'API Access', kind: 'integration', area: 'integrations',
      category: 'Integrasi',
      description: 'API key untuk integrasi ke ERP, marketplace, atau internal.',
      longDesc: 'API key & dokumentasi REST untuk integrasi dengan sistem eksternal (ERP, marketplace, akuntansi) atau pengembangan internal.',
    },
  },
  offers: {
    receipt_compact_monthly: {
      entitlement: 'receipt_compact',
      requiredPlan: 'starter',
      price: 15000,
      billingInterval: 'monthly',
      expires: true,
    },
    inventory_advanced_stock_addon: {
      entitlement: 'inventory_advanced_stock',
      requiredPlan: 'growth',
      price: 59000,
      billingInterval: 'monthly',
      expires: true,
    },
    orders_queue_addon: {
      entitlement: 'orders_queue',
      requiredPlan: 'growth',
      price: 25000,
      billingInterval: 'monthly',
      expires: true,
    },
    integrations_webhook_monthly: {
      entitlement: 'integrations_webhook',
      requiredPlan: 'growth',
      price: 49000,
      billingInterval: 'monthly',
      expires: true,
    },
  },
  businessTypes: {
    CAFE_RESTAURANT: {
      label: 'Cafe / Restaurant',
      defaultPlan: 'starter',
      defaultEntitlements: ['inventory_basic_stock'],
      recommendedEntitlements: ['restaurant_table_service', 'restaurant_kitchen_ops', 'reports_advanced', 'inventory_advanced_stock'],
      orderTypes: ['DINE_IN', 'TAKE_AWAY', 'DELIVERY'],
      settings: { default_tax_rate: 0.1, default_service_charge_rate: 0.05, enable_tips: true },
    },
    RETAIL_MINIMARKET: {
      label: 'Retail / Minimarket',
      defaultPlan: 'starter',
      defaultEntitlements: ['inventory_basic_stock'],
      recommendedEntitlements: ['inventory_advanced_stock', 'hardware_barcode_scanner', 'hardware_label_printer'],
      orderTypes: ['WALK_IN'],
      settings: { default_tax_rate: 0.1, enable_barcode_scanner: false, low_stock_alert_enabled: false },
    },
    LAUNDRY: {
      label: 'Laundry',
      defaultPlan: 'starter',
      defaultEntitlements: ['inventory_basic_stock'],
      recommendedEntitlements: ['orders_queue', 'receipt_compact', 'reports_advanced', 'hardware_label_printer'],
      orderTypes: ['WALK_IN'],
      settings: { default_tax_rate: 0.1, enable_item_tagging: false, default_turnaround_days: 3 },
    },
    SERVICE_APPOINTMENT: {
      label: 'Service / Appointment',
      defaultPlan: 'starter',
      defaultEntitlements: ['inventory_basic_stock'],
      recommendedEntitlements: ['orders_queue', 'payments_partial_payment', 'reports_advanced'],
      orderTypes: ['WALK_IN'],
      settings: { default_tax_rate: 0.1, appointment_duration_minutes: 60, booking_buffer_minutes: 15 },
    },
    DIGITAL_PPOB: {
      label: 'Digital / PPOB',
      defaultPlan: 'starter',
      defaultEntitlements: ['inventory_basic_stock'],
      recommendedEntitlements: ['integrations_api_access', 'integrations_webhook', 'reports_advanced'],
      orderTypes: ['WALK_IN'],
      settings: { enable_digital_receipts: true, auto_process_enabled: false },
    },
  },
} as const;

export type EntitlementCatalog = typeof ENTITLEMENT_CATALOG;
export type PlanCode = keyof EntitlementCatalog['plans'];
export type EntitlementCode = keyof EntitlementCatalog['entitlements'];
export type OfferCode = keyof EntitlementCatalog['offers'];
export type BusinessTypeCode = keyof EntitlementCatalog['businessTypes'];
export type BillingIntervalCode = keyof EntitlementCatalog['billingIntervals'];
