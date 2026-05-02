import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Clean the URL if it has /rest/v1/
const cleanUrl = supabaseUrl.split('/rest/v1/')[0];

const supabase = createClient(cleanUrl, supabaseKey);

async function test() {
  console.log('Testing connection to:', cleanUrl);
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error('Error connecting to Supabase:', error.message);
  } else {
    console.log('Successfully connected! Data:', data);
  }
}

test();
