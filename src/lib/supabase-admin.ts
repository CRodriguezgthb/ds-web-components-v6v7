import { createClient } from '@supabase/supabase-js';

// Server-only client using the secret key. Never import this from
// client-rendered components — only from API routes / server code.
export const supabaseAdmin = createClient(
	import.meta.env.SUPABASE_URL,
	import.meta.env.SUPABASE_SECRET_KEY,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	},
);
