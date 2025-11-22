import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutGrid,
  Coffee,
  UtensilsCrossed,
  ShoppingBag,
  Settings,
  LogOut,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  Package,
  Save,
  ChefHat,
  X,
  AlertCircle,
  MapPin,
  Edit2,
  Square,
  Clock,
  Users,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Box,
  Users2,
  FileText,
  Store,
  ChevronLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
} from 'lucide-react';

// ==========================================
// DATA: MOCK DATA
// ==========================================

const CATEGORIES = [
  { id: 'all', name: 'Semua', icon: LayoutGrid },
  { id: 'burger', name: 'Burger', icon: UtensilsCrossed },
  { id: 'coffee', name: 'Kopi', icon: Coffee },
  { id: 'pizza', name: 'Pizza', icon: UtensilsCrossed },
];

const PRODUCTS = [
  {
    id: 1,
    name: 'Classic Beef Burger',
    price: 45000,
    category: 'burger',
    stock: 15,
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60',
    variants: [
      {
        name: 'Tingkat Kematangan',
        type: 'radio',
        required: true,
        options: [
          { name: 'Medium Well', price: 0 },
          { name: 'Well Done', price: 0 },
        ],
      },
      {
        name: 'Extra Topping',
        type: 'checkbox',
        required: false,
        options: [
          { name: 'Extra Cheese', price: 5000 },
          { name: 'Egg', price: 4000 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Cappuccino Art',
    price: 25000,
    category: 'coffee',
    stock: 50,
    image:
      'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=60',
    variants: [
      {
        name: 'Temperature',
        type: 'radio',
        required: true,
        options: [
          { name: 'Hot', price: 0 },
          { name: 'Iced', price: 3000 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'French Fries',
    price: 18000,
    category: 'snack',
    stock: 20,
    image:
      'https://images.unsplash.com/photo-1541592103048-4e22ecc25e67?auto=format&fit=crop&w=500&q=60',
    variants: [],
  },
  {
    id: 4,
    name: 'Supreme Pizza',
    price: 85000,
    category: 'pizza',
    stock: 8,
    image:
      'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=60',
    variants: [],
  },
];

const TABLES = [
  {
    id: 'T1',
    name: 'Meja 1',
    capacity: 4,
    status: 'occupied',
    orders: [{ id: '#ORD-001', items: 3, total: 145000, customer: 'Budi S' }],
  },
  { id: 'T2', name: 'Meja 2', capacity: 2, status: 'available', orders: [] },
  { id: 'T3', name: 'Meja 3', capacity: 4, status: 'available', orders: [] },
  { id: 'T4', name: 'Meja 4', capacity: 6, status: 'reserved', orders: [] },
  {
    id: 'T5',
    name: 'VIP 1',
    capacity: 8,
    status: 'occupied',
    orders: [{ id: '#ORD-004', items: 12, total: 850000, customer: 'PT Maju' }],
  },
  { id: 'T6', name: 'Meja 6', capacity: 2, status: 'maintenance', orders: [] },
  { id: 'T7', name: 'Meja 7', capacity: 4, status: 'available', orders: [] },
  { id: 'T8', name: 'Meja 8', capacity: 4, status: 'available', orders: [] },
];

const formatIDR = (price) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

// ==========================================
// COMPONENT: POS VIEW
// ==========================================
const POSView = ({ onGoToTables, onGoToSettings }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine-in');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [customerName, setCustomerName] = useState('Walk-in Guest');
  const [tableNumber, setTableNumber] = useState('12');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOptions, setModalOptions] = useState({});
  const [modalQty, setModalQty] = useState(1);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const matchesCategory =
        activeCategory === 'all' || product.category === activeCategory;
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleProductClick = (product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setModalQty(1);
      const defaultOptions = {};
      product.variants.forEach((v) => {
        if (v.type === 'radio' && v.required && v.options.length > 0)
          defaultOptions[v.name] = v.options[0];
        else if (v.type === 'checkbox') defaultOptions[v.name] = [];
      });
      setModalOptions(defaultOptions);
    } else {
      addToCart(product, [], 1);
    }
  };

  const addToCart = (product, selectedVariants = [], quantity = 1) => {
    const variantPrice = selectedVariants.reduce((acc, curr) => {
      if (Array.isArray(curr.value))
        return acc + curr.value.reduce((sum, item) => sum + item.price, 0);
      return acc + (curr.value.price || 0);
    }, 0);
    const finalPrice = product.price + variantPrice;
    const uniqueId = `${product.id}-${JSON.stringify(selectedVariants)}`;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.uniqueId === uniqueId
      );
      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex].qty += quantity;
        return newCart;
      }
      return [
        ...prev,
        {
          ...product,
          uniqueId,
          price: finalPrice,
          basePrice: product.price,
          qty: quantity,
          selectedVariants,
        },
      ];
    });
    setSelectedProduct(null);
  };

  const updateQty = (uniqueId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.uniqueId === uniqueId
            ? { ...item, qty: Math.max(0, item.qty + delta) }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const handleConfirmModal = () => {
    const variantsArray = Object.keys(modalOptions).map((key) => ({
      name: key,
      value: modalOptions[key],
    }));
    addToCart(selectedProduct, variantsArray, modalQty);
  };

  const calculateModalTotal = () => {
    if (!selectedProduct) return 0;
    let total = selectedProduct.price;
    Object.keys(modalOptions).forEach((key) => {
      const val = modalOptions[key];
      if (Array.isArray(val)) val.forEach((v) => (total += v.price));
      else if (val) total += val.price;
    });
    return total * modalQty;
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.11;
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className='flex flex-col md:flex-row h-full overflow-hidden relative'>
      {selectedProduct && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in'>
          <div className='bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'>
            <div className='p-4 border-b border-slate-100 flex justify-between items-center'>
              <h3 className='text-lg font-bold text-slate-800'>
                {selectedProduct.name}
              </h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className='p-2 hover:bg-slate-100 rounded-full'
              >
                <X size={20} />
              </button>
            </div>
            <div className='flex-1 overflow-y-auto p-4 space-y-6'>
              {selectedProduct.variants.map((variant, idx) => (
                <div key={idx} className='space-y-2'>
                  <div className='flex justify-between'>
                    <h4 className='font-bold text-slate-700 text-sm'>
                      {variant.name}
                    </h4>
                    {variant.required && (
                      <span className='text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full'>
                        Wajib
                      </span>
                    )}
                  </div>
                  {variant.options.map((opt, optIdx) => {
                    const isSelected =
                      variant.type === 'radio'
                        ? modalOptions[variant.name]?.name === opt.name
                        : modalOptions[variant.name]?.some(
                            (i) => i.name === opt.name
                          );
                    return (
                      <label
                        key={optIdx}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected && (
                              <div className='w-1.5 h-1.5 bg-white rounded-full' />
                            )}
                          </div>
                          <span
                            className={`text-sm ${
                              isSelected
                                ? 'font-semibold text-blue-900'
                                : 'text-slate-600'
                            }`}
                          >
                            {opt.name}
                          </span>
                        </div>
                        {opt.price > 0 && (
                          <span className='text-xs font-medium text-slate-500'>
                            +{formatIDR(opt.price)}
                          </span>
                        )}
                        <input
                          type={variant.type === 'radio' ? 'radio' : 'checkbox'}
                          className='hidden'
                          checked={!!isSelected}
                          onChange={() => {
                            setModalOptions((prev) => {
                              if (variant.type === 'radio')
                                return { ...prev, [variant.name]: opt };
                              const list = prev[variant.name] || [];
                              const exists = list.find(
                                (i) => i.name === opt.name
                              );
                              return {
                                ...prev,
                                [variant.name]: exists
                                  ? list.filter((i) => i.name !== opt.name)
                                  : [...list, opt],
                              };
                            });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              ))}
              <div className='pt-4 border-t border-dashed border-slate-200'>
                <p className='font-bold text-sm text-slate-700 mb-3'>Jumlah</p>
                <div className='flex items-center justify-center gap-6'>
                  <button
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className='w-10 h-10 rounded-full border hover:bg-slate-50'
                  >
                    <Minus size={18} />
                  </button>
                  <span className='text-xl font-bold w-8 text-center'>
                    {modalQty}
                  </span>
                  <button
                    onClick={() => setModalQty(modalQty + 1)}
                    className='w-10 h-10 rounded-full border hover:bg-slate-50'
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className='p-4 bg-white border-t border-slate-200'>
              <button
                onClick={handleConfirmModal}
                className='w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-between px-6 hover:bg-blue-700'
              >
                <span>Tambah</span>
                <span>{formatIDR(calculateModalTotal())}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className='flex-1 flex flex-col min-w-0 bg-slate-50/50 relative'>
        <header className='px-4 md:px-8 py-4 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-10'>
          <div>
            <h1 className='text-xl font-extrabold text-slate-800'>
              Resto POS Pro
            </h1>
            <div className='flex items-center gap-2 text-xs text-slate-500 mt-1'>
              <span className='flex items-center gap-1'>
                <MapPin size={12} /> Cabang Pusat
              </span>
              <span>•</span>
              <span className='text-green-600 font-bold'>Online</span>
            </div>
          </div>
          <div className='w-1/3 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4' />
            <input
              type='text'
              placeholder='Cari menu...'
              className='w-full bg-slate-100 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>
        <div className='px-4 md:px-8 py-4'>
          <div className='flex gap-2 overflow-x-auto pb-2 no-scrollbar'>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                <cat.icon size={16} /> {cat.name}
              </button>
            ))}
          </div>
        </div>
        <div className='flex-1 overflow-y-auto px-4 md:px-8 pb-32 md:pb-8'>
          <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4'>
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className='group bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 active:scale-95 hover:shadow-md cursor-pointer relative h-full flex flex-col'
              >
                <div className='relative w-full aspect-[4/3] overflow-hidden rounded-lg mb-2 bg-slate-100'>
                  <img
                    src={product.image}
                    alt={product.name}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                  />
                  <div className='absolute top-1.5 left-1.5 bg-black/60 backdrop-blur text-white text-[10px] font-medium px-2 py-0.5 rounded'>
                    {product.stock} Stok
                  </div>
                  {product.variants?.length > 0 && (
                    <div className='absolute bottom-1.5 right-1.5 bg-white/90 text-slate-800 p-1 rounded shadow-sm'>
                      <SlidersHorizontal size={14} />
                    </div>
                  )}
                </div>
                <div className='flex-1 flex flex-col'>
                  <h3 className='font-bold text-slate-700 text-sm leading-tight mb-1 line-clamp-2'>
                    {product.name}
                  </h3>
                  <div className='mt-auto'>
                    <span className='text-blue-600 font-bold text-base'>
                      {formatIDR(product.price).replace(',00', '')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {isCartOpen && (
        <div
          className='fixed inset-0 bg-black/40 z-[55] md:hidden'
          onClick={() => setIsCartOpen(false)}
        />
      )}
      <aside
        className={`fixed md:relative top-0 bottom-0 right-0 z-[60] bg-white border-l border-slate-200 flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 w-full md:w-[380px] h-[95vh] mt-[5vh] md:mt-0 md:h-auto ${
          isCartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
        } rounded-t-[2rem] md:rounded-none`}
      >
        <div className='flex items-center justify-between p-4 border-b border-slate-100 bg-white rounded-t-[2rem] md:rounded-none relative z-40'>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setIsCartOpen(false)}
              className='md:hidden p-1 bg-slate-100 rounded-full'
            >
              <ChevronDown size={20} />
            </button>
            <h2 className='text-lg font-bold text-slate-800'>Pesanan Baru</h2>
          </div>
          <div className='flex items-center gap-2'>
            <div className='px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md'>
              #ORD-255
            </div>
            <button
              onClick={() => setCart([])}
              className='p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full'
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <div className='flex-1 overflow-y-auto bg-slate-50/50 flex flex-col relative z-0'>
          <div className='p-4 bg-white border-b border-slate-100 shadow-sm z-10'>
            <div className='bg-slate-100 p-1 rounded-xl grid grid-cols-3 gap-1 mb-4'>
              {['dine-in', 'take-away', 'delivery'].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`text-[11px] font-bold py-2 rounded-lg capitalize flex items-center justify-center gap-1 ${
                    orderType === type
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400'
                  }`}
                >
                  {type.replace('-', ' ')}
                </button>
              ))}
            </div>
            <div className='flex gap-3'>
              <div className='flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-3 hover:border-blue-300 transition-colors group'>
                <div className='w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm group-hover:text-blue-500'>
                  <User size={16} />
                </div>
                <div className='flex-1 overflow-hidden'>
                  <p className='text-[10px] text-slate-400 uppercase font-bold'>
                    Pelanggan
                  </p>
                  <input
                    type='text'
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className='bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none'
                  />
                </div>
                <Edit2
                  size={12}
                  className='text-slate-300 opacity-0 group-hover:opacity-100'
                />
              </div>
              {orderType === 'dine-in' && (
                <div className='w-20 bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center hover:border-blue-300 cursor-pointer group'>
                  <p className='text-[10px] text-slate-400 uppercase font-bold text-center'>
                    Meja
                  </p>
                  <div className='flex items-center gap-1'>
                    <span className='text-lg font-black text-slate-700'>
                      {tableNumber}
                    </span>
                    <Edit2
                      size={10}
                      className='text-slate-300 opacity-0 group-hover:opacity-100'
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className='p-4 space-y-3 pb-40 md:pb-6 flex-1'>
            {cart.length === 0 ? (
              <div className='h-40 flex flex-col items-center justify-center text-slate-300'>
                <ShoppingBag size={48} className='mb-3 opacity-50' />
                <p className='text-sm font-medium'>Belum ada pesanan</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.uniqueId}
                  className='flex gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm relative'
                >
                  <div className='w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0'>
                    <img
                      src={item.image}
                      className='w-full h-full object-cover'
                      alt={item.name}
                    />
                  </div>
                  <div className='flex-1 flex flex-col justify-between min-w-0'>
                    <div className='flex justify-between items-start'>
                      <h4 className='font-bold text-slate-700 text-sm truncate pr-4'>
                        {item.name}
                      </h4>
                      <span className='text-blue-600 font-bold text-sm whitespace-nowrap'>
                        {formatIDR(item.price * item.qty)}
                      </span>
                    </div>
                    {item.selectedVariants?.length > 0 && (
                      <div className='text-[10px] text-slate-500 my-1 bg-slate-50 p-1.5 rounded border border-slate-100 w-max max-w-full'>
                        {item.selectedVariants.map((v, i) => (
                          <span key={i} className='block truncate'>
                            • {v.name}:{' '}
                            {Array.isArray(v.value)
                              ? v.value.map((x) => x.name).join(', ')
                              : v.value.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className='flex items-center justify-between mt-2'>
                      <button
                        onClick={() =>
                          setCart((c) =>
                            c.filter((x) => x.uniqueId !== item.uniqueId)
                          )
                        }
                        className='text-slate-300 hover:text-red-500'
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className='flex items-center gap-3 bg-slate-50 rounded-lg p-0.5 border border-slate-100'>
                        <button
                          onClick={() => updateQty(item.uniqueId, -1)}
                          className='w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center'
                        >
                          <Minus size={12} />
                        </button>
                        <span className='text-xs font-bold w-4 text-center'>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.uniqueId, 1)}
                          className='w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center'
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className='absolute md:relative bottom-0 left-0 right-0 z-30'>
          <div
            className={`absolute bottom-full left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-5 rounded-t-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out -z-10 ${
              isSummaryExpanded
                ? 'translate-y-4 opacity-100 visible pb-6'
                : 'translate-y-full opacity-0 invisible'
            }`}
          >
            <div className='space-y-3 pb-2'>
              <div className='flex justify-between text-sm text-slate-500'>
                <span>Subtotal</span>
                <span>{formatIDR(subtotal)}</span>
              </div>
              <div className='flex justify-between text-sm text-slate-500'>
                <span>Pajak (11%)</span>
                <span>{formatIDR(tax)}</span>
              </div>
            </div>
          </div>
          <div className='bg-white border-t border-slate-200 p-5 pb-6 shadow-[0_-5px_25px_rgba(0,0,0,0.1)] relative z-20'>
            <div
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className='absolute -top-3 left-1/2 -translate-x-1/2 bg-white border border-slate-200 text-slate-400 w-12 h-6 flex items-center justify-center rounded-full shadow-sm cursor-pointer hover:bg-slate-50 active:scale-95'
            >
              <ChevronUp
                size={16}
                className={`transition-transform duration-300 ${
                  isSummaryExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
            <div className='flex items-center justify-between mb-4'>
              <div
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className='cursor-pointer group'
              >
                <p className='text-xs text-slate-400 font-medium group-hover:text-blue-600 transition-colors'>
                  Total Tagihan
                </p>
                <div className='flex items-center gap-1'>
                  <span className='text-2xl font-black text-slate-800'>
                    {formatIDR(total)}
                  </span>
                  <span className='text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 md:hidden'>
                    Detail
                  </span>
                </div>
              </div>
            </div>
            <div className='grid grid-cols-[1.5fr_1fr] gap-3'>
              <button
                disabled={cart.length === 0}
                className='bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 active:scale-[0.98] transition-all'
              >
                <div className='flex items-center gap-2 text-sm'>
                  <ChefHat size={18} />
                  <span>Simpan</span>
                </div>
                <span className='text-[10px] opacity-80 font-normal'>
                  Ke Dapur
                </span>
              </button>
              <button
                disabled={cart.length === 0}
                className='bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 py-3.5 rounded-xl font-bold flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 active:scale-[0.98] transition-all'
              >
                <div className='flex items-center gap-2 text-sm'>
                  <Banknote size={18} />
                  <span>Bayar</span>
                </div>
                <span className='text-[10px] opacity-80 font-normal'>
                  Tutup Bill
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE NAVIGATION FOR POS VIEW */}
      <div className='md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-40 pb-safe h-[60px]'>
        <button className='flex flex-col items-center gap-0.5 text-blue-600'>
          <LayoutGrid size={20} />
          <span className='text-[10px]'>Menu</span>
        </button>
        <button
          onClick={onGoToTables}
          className='flex flex-col items-center gap-0.5 text-slate-400'
        >
          <Square size={20} />
          <span className='text-[10px]'>Meja</span>
        </button>
        <div className='relative -top-5'>
          <button
            onClick={() => setIsCartOpen(true)}
            className='bg-slate-800 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-90 border-4 border-slate-50 transition-transform'
          >
            <ShoppingBag size={24} />
            {totalItems > 0 && (
              <span className='absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-800'>
                {totalItems}
              </span>
            )}
          </button>
        </div>
        <button className='flex flex-col items-center gap-0.5 text-slate-400'>
          <CreditCard size={20} />
          <span className='text-[10px]'>Bill</span>
        </button>
        <button
          onClick={onGoToSettings}
          className='flex flex-col items-center gap-0.5 text-slate-400'
        >
          <Settings size={20} />
          <span className='text-[10px]'>Set</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT: TABLE VIEW
// ==========================================
const TableView = ({ onContinueOrder, onGoToPOS, onGoToSettings }) => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchTable, setSearchTable] = useState('');
  const availableCount = TABLES.filter((t) => t.status === 'available').length;
  const occupiedCount = TABLES.filter((t) => t.status === 'occupied').length;
  const filteredTables = TABLES.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch = t.name
      .toLowerCase()
      .includes(searchTable.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-blue-600 text-white shadow-blue-200';
      case 'occupied':
        return 'bg-slate-200 text-slate-600';
      case 'reserved':
        return 'bg-orange-100 text-orange-600 border-orange-200 border';
      case 'maintenance':
        return 'bg-red-600 text-white shadow-red-200';
      default:
        return 'bg-slate-100 text-slate-400';
    }
  };

  return (
    <div className='flex h-full overflow-hidden bg-slate-50 relative'>
      <div className='flex-1 flex flex-col min-w-0 h-full relative pb-[60px] md:pb-0'>
        <div className='bg-white border-b border-slate-200 p-4 md:p-6'>
          <div className='flex justify-between items-center mb-4'>
            <div>
              <h1 className='text-2xl font-bold text-slate-800'>Tables</h1>
              <p className='text-slate-500 text-sm'>
                Manage restaurant tables layout
              </p>
            </div>
            <div className='flex gap-2 text-xs font-bold'>
              <div className='bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg'>
                {availableCount} Avail
              </div>
              <div className='bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg'>
                {occupiedCount} Occu
              </div>
            </div>
          </div>
          <div className='flex flex-col md:flex-row gap-4 justify-between'>
            <div className='relative w-full md:w-96'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4' />
              <input
                type='text'
                placeholder='Search tables...'
                className='w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none'
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
              />
            </div>
            <div className='flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar'>
              {['all', 'available', 'occupied', 'reserved'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${
                    filterStatus === status
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {status}{' '}
                  {status !== 'all' &&
                    `(${TABLES.filter((t) => t.status === status).length})`}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className='flex-1 overflow-y-auto p-4 md:p-6'>
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'>
            {filteredTables.map((table) => (
              <button
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`relative aspect-video md:aspect-[4/3] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group border border-transparent ${
                  selectedTable?.id === table.id
                    ? 'ring-4 ring-blue-500/20 border-blue-500 z-10'
                    : ''
                } ${
                  table.status === 'available'
                    ? 'bg-white border-slate-200 hover:border-blue-300'
                    : table.status === 'occupied'
                    ? 'bg-slate-100 border-slate-200'
                    : table.status === 'maintenance'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-orange-50 border-orange-100'
                }`}
              >
                <div
                  className={`absolute top-3 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${getStatusColor(
                    table.status
                  )}`}
                >
                  {table.status}
                </div>
                <span className='text-3xl font-black text-slate-800 mt-4'>
                  {table.name.replace('Meja ', '')}
                </span>
                <div className='flex items-center gap-1 text-slate-500 text-xs font-medium'>
                  <Users size={14} />
                  <span>{table.capacity}</span>
                </div>
                {table.orders.length > 0 && (
                  <div className='absolute bottom-3 flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm border border-slate-100'>
                    <Clock size={12} className='text-orange-500' />
                    <span className='text-[10px] font-bold text-slate-600'>
                      25m
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      {selectedTable && (
        <div
          className='fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[55] md:hidden'
          onClick={() => setSelectedTable(null)}
        />
      )}
      <div
        className={`fixed md:relative inset-x-0 bottom-0 md:inset-auto md:w-[400px] md:h-full z-[60] bg-white border-l border-slate-200 shadow-2xl md:shadow-none flex flex-col transition-transform duration-300 ease-out ${
          selectedTable
            ? 'translate-y-0'
            : 'translate-y-full md:translate-x-full md:translate-y-0 md:w-0 md:border-none'
        } rounded-t-3xl md:rounded-none h-[85vh] md:h-auto`}
      >
        {selectedTable ? (
          <>
            <div className='p-6 border-b border-slate-100 flex justify-between items-start'>
              <div>
                <h2 className='text-xl font-bold text-slate-800 mb-1'>
                  Table Details
                </h2>
                <div className='flex items-center gap-3 text-sm text-slate-500'>
                  <span className='font-bold text-slate-800 text-lg'>
                    {selectedTable.name}
                  </span>
                  <span>•</span>
                  <div className='flex items-center gap-1'>
                    <Users size={14} /> {selectedTable.capacity} people
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className='p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500'
              >
                <X size={20} />
              </button>
            </div>
            <div className='flex-1 overflow-y-auto p-6 bg-slate-50/50'>
              <div className='mb-6'>
                <h3 className='text-sm font-bold text-slate-400 uppercase tracking-wider mb-3'>
                  Status
                </h3>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold capitalize ${getStatusColor(
                    selectedTable.status
                  )}`}
                >
                  {selectedTable.status === 'maintenance' ? (
                    <AlertTriangle size={16} />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {selectedTable.status}
                </div>
              </div>
              <h3 className='text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2'>
                <ShoppingBag size={16} /> Active Orders (
                {selectedTable.orders.length})
              </h3>
              {selectedTable.orders.length === 0 ? (
                <div className='border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center gap-2 text-slate-400'>
                  <UtensilsCrossed size={32} className='opacity-50' />
                  <p className='text-sm'>No active orders</p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {selectedTable.orders.map((order, idx) => (
                    <div
                      key={idx}
                      className='bg-white p-4 rounded-xl border border-slate-200 shadow-sm'
                    >
                      <div className='flex justify-between items-start mb-3'>
                        <div>
                          <div className='text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit mb-1'>
                            {order.id}
                          </div>
                          <div className='font-bold text-slate-700 text-sm'>
                            {order.customer}
                          </div>
                        </div>
                        <div className='bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded'>
                          UNPAID
                        </div>
                      </div>
                      <div className='space-y-1 mb-3'>
                        <div className='flex justify-between text-xs text-slate-500'>
                          <span>Classic Beef Burger x2</span>
                        </div>
                        <div className='flex justify-between text-xs text-slate-500'>
                          <span>Cappuccino x1</span>
                        </div>
                      </div>
                      <div className='flex justify-between items-center pt-3 border-t border-slate-100'>
                        <span className='text-sm font-bold text-slate-600'>
                          Total
                        </span>
                        <span className='text-lg font-black text-slate-800'>
                          {formatIDR(order.total)}
                        </span>
                      </div>
                      <button
                        onClick={() => onContinueOrder(selectedTable)}
                        className='mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors'
                      >
                        <Edit2 size={14} /> Continue Order
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className='p-6 border-t border-slate-200 bg-white'>
              {selectedTable.status === 'available' ? (
                <button
                  onClick={() => onContinueOrder(selectedTable)}
                  className='w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900'
                >
                  Check In / New Order
                </button>
              ) : (
                <button className='w-full bg-green-50 text-green-700 border border-green-200 py-3 rounded-xl font-bold hover:bg-green-100 flex items-center justify-center gap-2'>
                  <Banknote size={18} /> Checkout & Payment
                </button>
              )}
            </div>
          </>
        ) : (
          <div className='h-full flex items-center justify-center text-slate-400'>
            Select a table
          </div>
        )}
      </div>

      {/* MOBILE NAVIGATION FOR TABLE VIEW (NO FLOATING CART) */}
      <div className='md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-40 pb-safe h-[60px]'>
        <button
          onClick={onGoToPOS}
          className='flex flex-col items-center gap-0.5 text-slate-400'
        >
          <LayoutGrid size={20} />
          <span className='text-[10px]'>Menu</span>
        </button>
        <button
          onClick={() => {}}
          className='flex flex-col items-center gap-0.5 text-blue-600'
        >
          <Square size={20} />
          <span className='text-[10px]'>Meja</span>
        </button>
        <div className='w-14'></div>{' '}
        {/* Spacer for visual balance if needed, or remove */}
        <button className='flex flex-col items-center gap-0.5 text-slate-400'>
          <CreditCard size={20} />
          <span className='text-[10px]'>Bill</span>
        </button>
        <button
          onClick={onGoToSettings}
          className='flex flex-col items-center gap-0.5 text-slate-400'
        >
          <Settings size={20} />
          <span className='text-[10px]'>Set</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT: MANAGEMENT HUB
// ==========================================
const ManagementHub = ({ onBack, onNavigate }) => {
  const MENU_ITEMS = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: BarChart3,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'products',
      title: 'Produk',
      icon: Box,
      color: 'bg-orange-100 text-orange-600',
    },
    {
      id: 'stock',
      title: 'Stok',
      icon: Package,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'employees',
      title: 'Karyawan',
      icon: Users2,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'reports',
      title: 'Laporan',
      icon: FileText,
      color: 'bg-pink-100 text-pink-600',
    },
    {
      id: 'store',
      title: 'Profil Toko',
      icon: Store,
      color: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <div className='flex-1 h-full bg-slate-50 overflow-y-auto pb-20'>
      <header className='bg-white border-b border-slate-200 p-4 sticky top-0 z-10'>
        <h1 className='text-xl font-extrabold text-slate-800'>Manajemen</h1>
        <p className='text-xs text-slate-500'>Pengaturan toko & laporan</p>
      </header>

      {/* Profile Card */}
      <div className='p-4'>
        <div className='bg-slate-800 text-white p-5 rounded-2xl flex items-center gap-4 shadow-lg shadow-slate-300'>
          <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold'>
            AP
          </div>
          <div className='flex-1'>
            <h3 className='font-bold text-lg'>Aura Pos Resto</h3>
            <p className='text-xs text-slate-300'>Cabang Pusat • Owner</p>
          </div>
          <button className='p-2 bg-white/10 rounded-lg hover:bg-white/20'>
            <Edit2 size={16} />
          </button>
        </div>
      </div>

      {/* Menu Grid */}
      <div className='p-4 pt-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className='bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col items-start gap-3'
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}
            >
              <item.icon size={20} />
            </div>
            <div className='text-left'>
              <h4 className='font-bold text-slate-700'>{item.title}</h4>
              <p className='text-[10px] text-slate-400'>
                Kelola {item.title.toLowerCase()}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className='p-4'>
        <button className='w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors'>
          <LogOut size={18} />
          Keluar Aplikasi
        </button>
        <p className='text-center text-[10px] text-slate-400 mt-4'>
          AuraPOS v1.0.2 • Build 20231122
        </p>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT: DASHBOARD VIEW
// ==========================================
const DashboardView = ({ onBack }) => {
  return (
    <div className='flex-1 h-full bg-slate-50 overflow-y-auto'>
      <header className='bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex items-center gap-3'>
        <button
          onClick={onBack}
          className='p-2 hover:bg-slate-100 rounded-full'
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className='text-lg font-bold text-slate-800'>Dashboard</h1>
        </div>
      </header>

      <div className='p-4 space-y-4'>
        {/* Summary Cards */}
        <div className='grid grid-cols-2 gap-3'>
          <div className='bg-white p-4 rounded-xl border border-slate-100 shadow-sm'>
            <div className='flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1'>
              <Wallet size={14} /> Omset Hari Ini
            </div>
            <div className='text-xl font-black text-slate-800'>Rp 2.4jt</div>
            <div className='text-[10px] text-green-600 font-medium flex items-center gap-1 mt-1'>
              <TrendingUp size={10} /> +12% vs Kemarin
            </div>
          </div>
          <div className='bg-white p-4 rounded-xl border border-slate-100 shadow-sm'>
            <div className='flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1'>
              <ShoppingBag size={14} /> Total Order
            </div>
            <div className='text-xl font-black text-slate-800'>48</div>
            <div className='text-[10px] text-slate-500 font-medium mt-1'>
              12 Meja Aktif
            </div>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className='bg-white p-5 rounded-2xl border border-slate-100 shadow-sm'>
          <div className='flex justify-between items-center mb-4'>
            <h3 className='font-bold text-slate-700'>Grafik Penjualan</h3>
            <select className='bg-slate-50 text-xs font-bold text-slate-600 p-2 rounded-lg border-none outline-none'>
              <option>Minggu Ini</option>
            </select>
          </div>
          <div className='h-48 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-col gap-2'>
            <BarChart3 size={32} className='opacity-50' />
            <span className='text-xs'>Chart Visualization Placeholder</span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className='bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden'>
          <div className='p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center'>
            <h3 className='font-bold text-slate-700 text-sm'>
              Transaksi Terakhir
            </h3>
            <button className='text-xs text-blue-600 font-bold flex items-center gap-1'>
              Lihat Semua <ArrowUpRight size={12} />
            </button>
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className='p-4 border-b border-slate-100 last:border-none flex justify-between items-center'
            >
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs'>
                  #{i}2
                </div>
                <div>
                  <p className='text-sm font-bold text-slate-700'>Meja {i}</p>
                  <p className='text-[10px] text-slate-400'>
                    12:3{i} PM • Tunai
                  </p>
                </div>
              </div>
              <span className='text-sm font-bold text-slate-800'>
                Rp {45 + i * 10}.000
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN APP CONTAINER
// ==========================================
export default function App() {
  const [activeView, setActiveView] = useState('pos'); // 'pos' | 'tables' | 'management' | 'dashboard'
  const [currentTable, setCurrentTable] = useState(null);

  const handleContinueOrder = (table) => {
    setCurrentTable(table);
    setActiveView('pos');
    alert(`Membuka pesanan untuk ${table.name}`);
  };

  // Render Content Logic
  const renderContent = () => {
    switch (activeView) {
      case 'pos':
        return (
          <POSView
            onGoToTables={() => setActiveView('tables')}
            onGoToSettings={() => setActiveView('management')}
          />
        );
      case 'tables':
        return (
          <TableView
            onContinueOrder={handleContinueOrder}
            onGoToPOS={() => setActiveView('pos')}
            onGoToSettings={() => setActiveView('management')}
          />
        );
      case 'management':
        return (
          <ManagementHub
            onBack={() => setActiveView('pos')}
            onNavigate={(route) =>
              setActiveView(route === 'dashboard' ? 'dashboard' : 'management')
            }
          />
        );
      case 'dashboard':
        return <DashboardView onBack={() => setActiveView('management')} />;
      default:
        return <POSView />;
    }
  };

  return (
    <div className='flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden'>
      {/* DESKTOP SIDEBAR */}
      <aside className='hidden md:flex w-20 bg-white border-r border-slate-200 flex-col items-center py-6 flex-shrink-0 z-30'>
        <div className='mb-8 p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200'>
          <ShoppingBag className='text-white w-6 h-6' />
        </div>
        <nav className='flex-1 w-full flex flex-col gap-4 px-2'>
          <button
            onClick={() => setActiveView('pos')}
            className={`p-3 rounded-xl transition-all flex justify-center group relative ${
              activeView === 'pos'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={22} />
            <span className='absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none'>
              POS Menu
            </span>
          </button>
          <button
            onClick={() => setActiveView('tables')}
            className={`p-3 rounded-xl transition-all flex justify-center group relative ${
              activeView === 'tables'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Square size={22} />
            <span className='absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none'>
              Tables
            </span>
          </button>
          <button
            onClick={() => setActiveView('management')}
            className={`p-3 rounded-xl transition-all flex justify-center group relative ${
              ['management', 'dashboard'].includes(activeView)
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Settings size={22} />
            <span className='absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none'>
              Management
            </span>
          </button>
        </nav>
        <button className='p-3 text-slate-400 hover:text-red-500'>
          <LogOut size={22} />
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className='flex-1 min-w-0 h-full relative flex flex-col'>
        {renderContent()}

        {/* MOBILE BOTTOM NAV REMOVED FROM HERE TO PREVENT DUPLICATION AND Z-INDEX ISSUES */}
        {/* Navigations are now handled individually inside POSView and TableView */}
      </div>
    </div>
  );
}