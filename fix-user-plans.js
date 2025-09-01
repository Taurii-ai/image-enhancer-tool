import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://unqckiscoatacfbfwrho.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixUserPlans() {
  console.log('🔧 Starting to fix user plans...')
  
  try {
    // Get all users with stripe_customer_id but plan = 'free'
    const { data: usersToFix, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .not('stripe_customer_id', 'is', null)
      .eq('plan', 'free')
    
    if (fetchError) {
      console.error('Error fetching users:', fetchError)
      return
    }
    
    console.log(`Found ${usersToFix.length} users to fix:`)
    usersToFix.forEach(user => {
      console.log(`- ${user.email}: ${user.plan} plan, ${user.credits_remaining} credits`)
    })
    
    // Fix each user
    for (const user of usersToFix) {
      console.log(`\n🛠️ Fixing user: ${user.email}`)
      
      // Calculate correct credits (150 for basic plan minus any used)
      const { data: usage } = await supabase
        .from('usage_tracking')
        .select('images_processed')
        .eq('user_id', user.id)
        .eq('month', 9) // September
        .eq('year', 2025)
        .single()
      
      const imagesUsed = usage?.images_processed || 0
      const correctCredits = Math.max(0, 150 - imagesUsed)
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          plan: 'basic',
          credits_remaining: correctCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (updateError) {
        console.error(`❌ Error updating ${user.email}:`, updateError)
      } else {
        console.log(`✅ Fixed ${user.email}: basic plan, ${correctCredits} credits`)
      }
      
      // Also fix usage tracking
      await supabase
        .from('usage_tracking')
        .upsert({
          user_id: user.id,
          month: 9,
          year: 2025,
          images_processed: imagesUsed,
          images_limit: 150
        }, {
          onConflict: 'user_id,month,year'
        })
    }
    
    console.log('\n🎉 All users have been fixed!')
    
    // Verify the fixes
    const { data: verifyUsers } = await supabase
      .from('profiles')
      .select('email, plan, credits_remaining')
      .not('stripe_customer_id', 'is', null)
    
    console.log('\n📊 Current status of all paid users:')
    verifyUsers.forEach(user => {
      console.log(`- ${user.email}: ${user.plan} plan, ${user.credits_remaining} credits`)
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

fixUserPlans()