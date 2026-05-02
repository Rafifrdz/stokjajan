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

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: SUPABASE_URL or SUPABASE_ANON_KEY is missing in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {

  // Multer setup for image uploads (Local fallback)
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

  // Helper to map Supabase 'id' to MongoDB-style '_id' for frontend compatibility
  const mapId = (item: any) => {
    if (!item) return item;
    const { id, ...rest } = item;
    return { _id: id, ...rest };
  };

  // --- API ROUTES ---

  // Health Check
  app.get("/api/health", async (req, res) => {
    try {
      const { error } = await supabase.from('products').select('id').limit(1);
      res.json({ 
        status: "ok", 
        supabase: error ? "error" : "connected", 
        details: error ? error.message : "Ready" 
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      if (error) throw error;
      res.json((data || []).map(mapId));
    } catch (err: any) {
      console.error("GET Products Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/products", upload.single("image"), async (req: any, res) => {
    try {
      const { name, price, stock, category, description } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";
      
      console.log("Attempting to insert product:", { name, price, stock });

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

      if (error) {
        console.error("Supabase Insert Error:", error);
        return res.status(400).json({ error: error.message });
      }

      const newProduct = data && data.length > 0 ? data[0] : null;
      
      if (!newProduct) {
        console.warn("Product inserted but no data returned. Check RLS policies.");
        return res.status(201).json({ _id: "unknown", name, message: "Created (Data hidden by RLS)" });
      }

      console.log("Product created successfully:", newProduct.id);
      res.status(201).json(mapId(newProduct));
    } catch (err: any) {
      console.error("Critical Server Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.put("/api/products/:id/stock", async (req, res) => {
    try {
      const { stock } = req.body;
      const { data, error } = await supabase
        .from('products')
        .update({ stock })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) throw error;
      res.json(mapId(data));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update stock" });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map IDs and ensure structure matches frontend
      const formattedOrders = data.map((order: any) => ({
        ...mapId(order),
        items: order.items.map(mapId),
        customerName: order.customer_name,
        totalPrice: order.total_price,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        amountPaid: order.amount_paid,
        orderStatus: order.order_status,
        createdAt: order.created_at
      }));

      res.json(formattedOrders);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { customerName, items, totalPrice, paymentStatus, paymentMethod, amountPaid } = req.body;

      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{ 
          customer_name: customerName, 
          total_price: totalPrice, 
          payment_status: paymentStatus,
          payment_method: paymentMethod || 'Tunai',
          amount_paid: amountPaid || 0
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Update Stock
      for (const item of items) {
        const { data: prod } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.productId)
          .single();
        
        if (prod) {
          await supabase
            .from('products')
            .update({ stock: prod.stock - item.quantity })
            .eq('id', item.productId);
        }
      }

      res.status(201).json(mapId(order));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const { orderStatus, paymentStatus, paymentMethod, amountPaid } = req.body;
      const orderId = req.params.id;
      
      const updateData: any = {};
      if (orderStatus !== undefined) updateData.order_status = orderStatus;
      if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
      if (paymentMethod !== undefined) updateData.payment_method = paymentMethod;
      if (amountPaid !== undefined) updateData.amount_paid = amountPaid;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update provided" });
      }

      console.log(`Updating order ${orderId}:`, updateData);

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select();

      if (error) {
        console.error("Supabase Patch Error:", error);
        return res.status(400).json({ error: error.message });
      }

      const updated = data && data.length > 0 ? data[0] : null;
      if (!updated) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(mapId(updated));
    } catch (err: any) {
      console.error("Critical PATCH Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // --- VITE / STATIC MIDDLEWARE ---
  // On Vercel, static files are handled by the 'routes' in vercel.json
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
