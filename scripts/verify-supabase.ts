/**
 * Script to verify Supabase connection and tables
 * Run with: npx tsx scripts/verify-supabase.ts
 */

import { requireSupabase } from '../lib/supabase/server'

async function verifySupabase() {
  try {
    console.log('🔍 Verifying Supabase connection...\n')
    
    const supabase = requireSupabase()
    console.log('✅ Supabase client created successfully\n')
    
    // Check if tables exist by trying to query them
    console.log('📊 Checking tables...\n')
    
    // Check statements table
    try {
      const { data, error } = await supabase
        .from('statements')
        .select('count', { count: 'exact', head: true })
      
      if (error) {
        console.error('❌ Error querying statements table:', error.message)
        console.error('   This usually means the table does not exist.')
        console.error('   Please run the migration: supabase/migrations/001_initial_schema.sql\n')
      } else {
        console.log('✅ statements table exists')
      }
    } catch (err) {
      console.error('❌ Failed to query statements table:', err)
    }
    
    // Check flows table
    try {
      const { data, error } = await supabase
        .from('flows')
        .select('count', { count: 'exact', head: true })
      
      if (error) {
        console.error('❌ Error querying flows table:', error.message)
      } else {
        console.log('✅ flows table exists')
      }
    } catch (err) {
      console.error('❌ Failed to query flows table:', err)
    }
    
    // Check verifications table
    try {
      const { data, error } = await supabase
        .from('verifications')
        .select('count', { count: 'exact', head: true })
      
      if (error) {
        console.error('❌ Error querying verifications table:', error.message)
      } else {
        console.log('✅ verifications table exists\n')
      }
    } catch (err) {
      console.error('❌ Failed to query verifications table:', err)
    }
    
    // Check storage buckets
    console.log('📦 Checking storage buckets...\n')
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets()
      
      if (error) {
        console.error('❌ Error listing buckets:', error.message)
      } else {
        const bucketNames = buckets?.map(b => b.name) || []
        console.log('Available buckets:', bucketNames)
        
        if (bucketNames.includes('pdf-uploads')) {
          console.log('✅ pdf-uploads bucket exists')
        } else {
          console.log('❌ pdf-uploads bucket missing')
        }
        
        if (bucketNames.includes('diagrams')) {
          console.log('✅ diagrams bucket exists')
        } else {
          console.log('❌ diagrams bucket missing')
        }
      }
    } catch (err) {
      console.error('❌ Failed to list buckets:', err)
    }
    
    console.log('\n✨ Verification complete!')
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

verifySupabase()

