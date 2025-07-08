import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://whniavaoosspqskqveuz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobmlhdmFvb3NzcHFza3F2ZXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNTQxMjAsImV4cCI6MjA2NjgzMDEyMH0.oiFfNUNH9XIcvtyriBstYvo8GG0AFbG44fT79E4SpuQ'

export const supabase = createClient(supabaseUrl, supabaseKey)

