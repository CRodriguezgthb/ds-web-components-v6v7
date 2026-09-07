export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const formData = await request.formData();
	const email = formData.get('email')?.toString();
	const password = formData.get('password')?.toString();

	if (!email || !password) {
		return redirect('/login?error=missing_fields');
	}

	const { data, error } = await supabase.auth.signInWithPassword({ email, password });

	if (error || !data.session) {
		return redirect('/login?error=invalid_credentials');
	}

	const { access_token, refresh_token } = data.session;
	const secure = new URL(request.url).protocol === 'https:';

	cookies.set('sb-access-token', access_token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
	});
	cookies.set('sb-refresh-token', refresh_token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
	});

	return redirect('/admin');
};
