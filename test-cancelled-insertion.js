// Simple test to insert data into cancelled_users table
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInsert() {
  try {
    console.log('🧪 Testing cancelled_users table insertion...');
    
    // Try simple insert
    const { data, error } = await supabase
      .from('cancelled_users')
      .insert({
        user_id: '12345678-1234-1234-1234-123456789012',
        email: 'test@example.com',
        plan_name: 'Basic',
        cancellation_date: new Date().toISOString(),
        credits_remaining: 100,
        cancellation_reason: 'Test insertion'
      })
      .select();

    if (error) {
      console.error('❌ Insert failed:', error);
      
      // Try to check if table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('cancelled_users')
        .select('count')
        .limit(1);
        
      if (tableError) {
        console.error('❌ Table may not exist:', tableError);
        
        // Try to create table
        console.log('🔧 Attempting to create table...');
        const createSQL = `
          CREATE TABLE IF NOT EXISTS cancelled_users (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid NOT NULL,
            email text NOT NULL,
            plan_name text NOT NULL,
            cancellation_date timestamp with time zone DEFAULT now(),
            cancellation_reason text,
            stripe_subscription_id text,
            credits_remaining integer DEFAULT 0,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
          );
        `;
        
        const { error: createError } = await supabase.rpc('exec_sql', { 
          sql: createSQL 
        });
        
        if (createError) {
          console.error('❌ Failed to create table:', createError);
        } else {
          console.log('✅ Table created, retrying insert...');
          const { data: retryData, error: retryError } = await supabase
            .from('cancelled_users')
            .insert({
              user_id: '12345678-1234-1234-1234-123456789012',
              email: 'test@example.com',
              plan_name: 'Basic',
              cancellation_date: new Date().toISOString(),
              credits_remaining: 100,
              cancellation_reason: 'Test insertion after table creation'
            })
            .select();
            
          if (retryError) {
            console.error('❌ Retry insert failed:', retryError);
          } else {
            console.log('✅ SUCCESS! Data inserted:', retryData);
          }
        }
      }
    } else {
      console.log('✅ SUCCESS! Test data inserted:', data);
    }
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testInsert();