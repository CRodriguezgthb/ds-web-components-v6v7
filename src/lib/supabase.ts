import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
	import.meta.env.SUPABASE_URL,
	import.meta.env.SUPABASE_PUBLISHABLE_KEY,
);

// Per-request client scoped to the signed-in user's access token, so RLS
// policies see the real auth.uid() instead of relying on shared client state.
export function createUserClient(accessToken: string) {
	return createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_PUBLISHABLE_KEY, {
		global: { headers: { Authorization: `Bearer ${accessToken}` } },
		auth: { autoRefreshToken: false, persistSession: false },
	});
}
