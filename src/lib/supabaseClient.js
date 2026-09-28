import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rkagdmdxqsjxkaiyjere.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3NLoG2yYX74dhhICxRbxgw_n-921t6Q';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
export const supabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabasePublishableKey !== 'placeholder' &&
  !supabasePublishableKey.includes('your-')
);
