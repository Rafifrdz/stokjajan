import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '').replace(/\/rest\/v1$/, '');
const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer setup
const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

const mapId = (item: any) => {
  if (!item) return item;
  const { id, ...rest } = item;
  return { _id: id, ...rest };
};

// --- API ROUTES (Defined at Top Level for Vercel) ---

app.get("/api/health", async (req, res) => {
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    res.json({ 
      status: "ok", 
      supabase: error ? "error" : "connected", 
      details: error ? error.message : "Ready" 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    res.json((data || []).map(mapId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", upload.single("image"), async (req: any, res) => {
  try {
    const { name, price, stock, category, description } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";
    const { data, error } = await supabase
      .from('products')
      .insert([{ 
        name, 
        price: parseFloat(price) || 0, 
        stock: parseInt(stock) || 0, 
        category: category || "", 
        description: description || "", 
        image: imageUrl 
      }])
      .select();
    if (error) throw error;
    res.status(201).json(mapId(data[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(order => ({
      ...mapId(order),
      items: order.items.map(mapId),
      customerName: order.customer_name,
      totalPrice: order.total_price,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      amountPaid: order.amount_paid,
      orderStatus: order.order_status,
      createdAt: order.created_at
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const { customerName, items, totalPrice, paymentStatus, paymentMethod, amountPaid } = req.body;
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{ 
        customer_name: customerName, 
        total_price: totalPrice, 
        payment_status: paymentStatus,
        payment_method: paymentMethod || 'Tunai',
        amount_paid: amountPaid || 0
      }])
      .select().single();
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })));
    if (itemsError) throw itemsError;

    res.status(201).json(mapId(order));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { orderStatus, paymentStatus, paymentMethod, amountPaid } = req.body;
    const updateData: any = {};
    if (orderStatus !== undefined) updateData.order_status = orderStatus;
    if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
    if (paymentMethod !== undefined) updateData.payment_method = paymentMethod;
    if (amountPaid !== undefined) updateData.amount_paid = amountPaid;
    
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json(mapId(data[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- VITE / STATIC CONFIG (Local only) ---
async function startVite() {
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
    }
    app.listen(PORT, () => console.log(`Server at http://localhost:${PORT}`));
  }
}

startVite();

export default app;
