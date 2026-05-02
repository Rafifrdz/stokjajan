import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Package, 
  ShoppingCart, 
  Truck, 
  LayoutDashboard, 
  Upload, 
  Search, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { Product, Order } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const [pRes, oRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders')
      ]);
      
      if (!pRes.ok) {
        const errData = await pRes.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${pRes.status}`);
      }

      const [pData, oData] = await Promise.all([pRes.json(), oRes.json()]);
      setProducts(Array.isArray(pData) ? pData : []);
      setOrders(Array.isArray(oData) ? oData : []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setDbError(err.message || 'Failed to fetch data');
      setProducts([]);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Jajananku<span className="text-blue-600">.</span></h1>
        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
          <Package size={20} />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        {dbError && (
          <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-pulse">
            <div className="bg-red-600 text-white p-1 rounded-full"><Package size={14} /></div>
            <div className="text-xs">
              <p className="font-bold">Database Error:</p>
              <p>{dbError}. Periksa SUPABASE_URL di Vercel Settings.</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard products={products} orders={orders} />
            </motion.div>
          )}
          {activeTab === 'stock' && (
            <motion.div key="stock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StockView products={products} refresh={fetchData} />
            </motion.div>
          )}
          {activeTab === 'cashier' && (
            <motion.div key="cashier" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CashierView products={products} refresh={fetchData} />
            </motion.div>
          )}
          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <OrdersView orders={orders} refresh={fetchData} />
            </motion.div>
          )}
          {activeTab === 'add' && (
            <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AddProductView refresh={fetchData} setActiveTab={setActiveTab} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-3 flex justify-around items-center z-50 rounded-t-2xl shadow-[0_-1px_15px_rgba(0,0,0,0.05)]">
        <NavButton icon={<LayoutDashboard size={22} />} label="Dash" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavButton icon={<Package size={22} />} label="Stok" active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} />
        <NavButton icon={<ShoppingCart size={22} />} label="Kasir" active={activeTab === 'cashier'} onClick={() => setActiveTab('cashier')} />
        <NavButton icon={<Truck size={22} />} label="Kirim" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
        <NavButton icon={<Plus size={22} />} label="Tambah" active={activeTab === 'add'} onClick={() => setActiveTab('add')} />
      </nav>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}
    >
      <div className={`p-1 rounded-xl transition-all ${active ? 'bg-blue-50' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );
}

// --- VIEWS ---

function Dashboard({ products, orders }: { products: Product[], orders: Order[] }) {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  
  const totalStock = safeProducts.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalRevenue = safeOrders.filter(o => o && o.paymentStatus === 'Paid').reduce((acc, o) => acc + (o.totalPrice || 0), 0);
  const pendingOrders = safeOrders.filter(o => o && o.orderStatus !== 'Delivered').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-200">
        <p className="text-blue-100 text-sm font-medium">Total Omset (Lunas)</p>
        <h2 className="text-3xl font-bold mt-1">Rp {totalRevenue.toLocaleString()}</h2>
        <div className="mt-4 flex items-center gap-2 bg-blue-500/30 w-fit px-3 py-1 rounded-full text-xs">
          <TrendingUp size={14} />
          <span>Update real-time</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="bg-orange-100 text-orange-600 p-2 rounded-lg w-fit mb-3">
            <Package size={20} />
          </div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Stok Produk</p>
          <p className="text-2xl font-bold mt-1">{totalStock}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="bg-purple-100 text-purple-600 p-2 rounded-lg w-fit mb-3">
            <Truck size={20} />
          </div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Antrian</p>
          <p className="text-2xl font-bold mt-1">{pendingOrders}</p>
        </div>
      </div>

      <section>
        <h3 className="text-lg font-bold mb-4">Aktivitas Terakhir</h3>
        <div className="space-y-3">
          {orders.slice(0, 5).map(order => (
            <div key={order._id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm">{order.customerName}</p>
                <p className="text-slate-400 text-[11px]">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">Rp {order.totalPrice.toLocaleString()}</p>
                <div className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full mt-1 ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {order.paymentStatus}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function StockView({ products, refresh }: { products: Product[], refresh: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Cari produk..." 
          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map(product => (
          <div key={product._id} className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4 items-center">
            <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon size={24} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800">{product.name}</h4>
              <p className="text-slate-500 text-xs mt-0.5">Rp {product.price.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${product.stock < 10 ? 'text-red-500' : 'text-slate-800'}`}>
                {product.stock} pcs
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Stok</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function CashierView({ products, refresh }: { products: Product[], refresh: () => void }) {
  const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);
  const [customer, setCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'TF'>('Tunai');
  const [paymentType, setPaymentType] = useState<'Lunas' | 'DP'>('Lunas');
  const [amountPaid, setAmountPaid] = useState<string>('');

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  const remaining = total - (parseInt(amountPaid) || 0);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product._id === product._id);
    if (existing) {
      setCart(cart.map(item => item.product._id === product._id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    const existing = cart.find(item => item.product._id === productId);
    if (existing && existing.qty > 1) {
      setCart(cart.map(item => item.product._id === productId ? { ...item, qty: item.qty - 1 } : item));
    } else {
      setCart(cart.filter(item => item.product._id !== productId));
    }
  };

  const handleCheckout = async () => {
    if (!customer || cart.length === 0) return alert("Lengkapi data!");
    
    const isFullPayment = paymentType === 'Lunas';
    const finalAmountPaid = isFullPayment ? total : (parseInt(amountPaid) || 0);
    const isPaid = isFullPayment || finalAmountPaid >= total;

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer,
          items: cart.map(i => ({ productId: i.product._id, name: i.product.name, quantity: i.qty, price: i.product.price })),
          totalPrice: total,
          paymentStatus: isPaid ? 'Paid' : 'Unpaid',
          paymentMethod,
          amountPaid: finalAmountPaid
        })
      });
      setCart([]);
      setCustomer('');
      setAmountPaid('');
      refresh();
      alert(isPaid ? "Transaksi Berhasil (Lunas)!" : "Pesanan Disimpan (DP)!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6 pb-20"
    >
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="text-blue-600" size={20} />
          <h3 className="font-bold text-lg">Ringkasan Belanja</h3>
        </div>

        <input 
          type="text" 
          placeholder="Nama Customer" 
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
        />

        <div className="max-h-60 overflow-y-auto space-y-3 border-y border-slate-100 py-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="text-center py-6">
              <Package className="mx-auto text-slate-200 mb-2" size={32} />
              <p className="text-slate-400 text-sm italic">Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-100">
                    {item.product.image ? (
                      <img src={item.product.image} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={16} /></div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold truncate w-24">{item.product.name}</p>
                    <p className="text-[10px] text-slate-500">Rp {item.product.price.toLocaleString()} x {item.qty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => removeFromCart(item.product._id)} className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-red-500 hover:bg-red-50 font-bold">-</button>
                  <span className="text-xs font-black">{item.qty}</span>
                  <button onClick={() => addToCart(item.product)} className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-500 hover:bg-blue-50 font-bold">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4 pt-2">
          {/* Payment Type Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              onClick={() => setPaymentType('Lunas')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${paymentType === 'Lunas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              Lunas
            </button>
            <button 
              onClick={() => setPaymentType('DP')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${paymentType === 'DP' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
            >
              DP / Tempo
            </button>
          </div>

          {/* Payment Methods */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Tunai', 'QRIS', 'TF'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === method 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100">
            <span className="font-bold text-slate-500 text-sm">Total Tagihan</span>
            <span className="text-2xl font-black text-slate-900">Rp {total.toLocaleString()}</span>
          </div>

          {paymentType === 'DP' && (
            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Jumlah DP</label>
                <input 
                  type="number" 
                  placeholder="Rp 0"
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2 px-3 text-sm font-bold text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Sisa Tagihan</label>
                <div className="py-2 px-3 rounded-xl text-sm font-black bg-slate-50 text-slate-700">
                  Rp {Math.max(0, remaining).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {paymentType === 'Lunas' && paymentMethod === 'Tunai' && (
            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
               <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Uang Tunai</label>
                <input 
                  type="number" 
                  placeholder="Rp 0"
                  className="w-full bg-blue-50 border border-blue-100 rounded-xl py-2 px-3 text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kembalian</label>
                <div className="py-2 px-3 rounded-xl text-sm font-black bg-green-50 text-green-600">
                  Rp {Math.max(0, (parseInt(amountPaid) || 0) - total).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:grayscale mt-2 ${
            paymentType === 'Lunas' ? 'bg-blue-600 shadow-blue-200' : 'bg-orange-600 shadow-orange-200'
          }`}
        >
          {paymentType === 'Lunas' ? 'Selesaikan & Bayar Lunas' : 'Simpan Pesanan DP'}
        </button>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Pilih Produk</h4>
          <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-bold">{products.length} Tersedia</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {products.map(p => (
            <button 
              key={p._id} 
              onClick={() => addToCart(p)}
              disabled={p.stock <= 0}
              className="group bg-white p-2 rounded-2xl border border-slate-100 text-left hover:border-blue-400 hover:shadow-lg hover:shadow-blue-50 transition-all disabled:opacity-50 relative overflow-hidden"
            >
              <div className="aspect-square w-full rounded-xl bg-slate-50 mb-2 overflow-hidden relative">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={32} /></div>
                )}
                {p.stock <= 5 && p.stock > 0 && (
                  <div className="absolute top-1 left-1 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">Limit!</div>
                )}
              </div>
              <div className="px-1">
                <p className="font-bold text-xs truncate text-slate-800">{p.name}</p>
                <p className="text-blue-600 text-xs font-black mt-0.5">Rp {p.price.toLocaleString()}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[9px] text-slate-400">Stok: {p.stock}</span>
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Plus size={12} />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function OrdersView({ orders, refresh }: { orders: Order[], refresh: () => void }) {
  const updateStatus = async (id: string, next: string, isPayment: boolean = false) => {
    const body = isPayment ? { paymentStatus: next } : { orderStatus: next };
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    refresh();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {orders.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Truck size={48} className="mx-auto mb-4 opacity-20" />
          <p>Belum ada pesanan masuk</p>
        </div>
      ) : orders.map(order => (
        <div key={order._id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <h4 className="font-bold text-slate-800">{order.customerName}</h4>
              <p className="text-slate-400 text-[10px]">{new Date(order.createdAt).toLocaleString('id-ID')}</p>
              <div className="flex gap-2 mt-1">
                <div className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                  order.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {order.paymentStatus === 'Paid' ? 'Lunas' : `DP: Rp ${order.amountPaid?.toLocaleString()}`}
                </div>
                <div className="bg-slate-100 text-slate-500 w-fit px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                  {order.paymentMethod}
                </div>
              </div>
            </div>
            <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
              order.orderStatus === 'Delivered' ? 'bg-green-100 text-green-600' :
              order.orderStatus === 'Shipped' ? 'bg-blue-100 text-blue-600' :
              order.orderStatus === 'Cancelled' ? 'bg-red-100 text-red-600' :
              'bg-orange-100 text-orange-600'
            }`}>
              {order.orderStatus === 'Pending' ? 'Pesanan Baru' : 
               order.orderStatus === 'Shipped' ? 'Dikirim' : 
               order.orderStatus === 'Delivered' ? 'Diterima' : 'Dibatalkan'}
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-500 border-t border-dashed border-slate-100 pt-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.name} x{item.quantity}</span>
                <span>Rp {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
               <span className="text-lg font-black text-slate-800">Rp {order.totalPrice.toLocaleString()}</span>
               {order.totalPrice - (order.amountPaid || 0) > 0 && (
                 <p className="text-[10px] font-bold text-red-500 mt-1">Kurang: Rp {(order.totalPrice - (order.amountPaid || 0)).toLocaleString()}</p>
               )}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-end">
              {/* Status Switcher */}
              <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                {(['Pending', 'Shipped', 'Delivered', 'Cancelled'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => updateStatus(order._id, status)}
                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                      order.orderStatus === status 
                      ? 'bg-white shadow-sm text-blue-600' 
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {status === 'Pending' ? 'Baru' : 
                     status === 'Shipped' ? 'Kirim' : 
                     status === 'Delivered' ? 'Selesai' : 'Batal'}
                  </button>
                ))}
              </div>

              {order.paymentStatus === 'Unpaid' && (
                <button 
                  onClick={() => updateStatus(order._id, 'Paid', true)}
                  className="bg-emerald-50 text-emerald-600 py-2 px-3 rounded-xl text-xs font-bold active:scale-95 transition-transform border border-emerald-100"
                >
                  Setel Lunas
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function AddProductView({ refresh, setActiveTab }: { refresh: () => void, setActiveTab: (t: string) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    price: '', // This will hold the numeric value for the API
    displayPrice: '', // This will hold the formatted string for the input
    stock: '',
    category: '',
    description: ''
  });

  const formatRupiah = (value: string) => {
    const numberString = value.replace(/[^0-9]/g, '');
    if (!numberString) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(numberString));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    setFormData({
      ...formData,
      price: rawValue,
      displayPrice: formatRupiah(rawValue)
    });
  };
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const data = new FormData();
    data.append('name', formData.name);
    data.append('price', formData.price);
    data.append('stock', formData.stock);
    data.append('category', formData.category);
    data.append('description', formData.description);
    if (file) data.append('image', file);

    try {
      await fetch('/api/products', {
        method: 'POST',
        body: data
      });
      refresh();
      setActiveTab('stock');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
          <Upload size={20} />
        </div>
        <h3 className="text-lg font-bold">Produk Baru</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Produk</label>
          <input 
            required
            type="text" 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Harga (Rp)</label>
            <input 
              required
              type="text" 
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
              value={formData.displayPrice}
              onChange={handlePriceChange}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stok Awal</label>
            <input 
              required
              type="number" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none"
              value={formData.stock}
              onChange={(e) => setFormData({...formData, stock: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gambar Produk</label>
          <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className="text-slate-400" size={24} />
              <p className="text-xs text-slate-500 font-medium">{file ? file.name : "Klik untuk upload foto"}</p>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-transform disabled:opacity-50 mt-4"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
        </button>
      </form>
    </motion.div>
  );
}
