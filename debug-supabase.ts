import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Using URL:', supabaseUrl);
  
  // Try to fetch from products
  const { data, error } = await supabase.from('products').select('*').limit(1);
  
  if (error) {
    console.log('Error fetching products:', error);
  } else {
    console.log('Products table exists! Sample data:', data);
  }

  // Try to fetch from orders
  const { data: orders, error: orderError } = await supabase.from('orders').select('*').limit(1);
  if (orderError) {
    console.log('Error fetching orders:', orderError);
  } else {
    console.log('Orders table exists!');
  }
}

checkTables();
