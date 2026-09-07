import { defineMiddleware } from 'astro:middleware';
import { supabase } from './lib/supabase';

const PROTECTED_PREFIXES = ['/admin', '/api/admin'];

export const onRequest = defineMiddleware(async (context, next) => {
	const { cookies, url, redirect } = context;
	const isProtected = PROTECTED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

	if (!isProtected) {
		return next();
	}

	const accessToken = cookies.get('sb-access-token')?.value;
	const refreshToken = cookies.get('sb-refresh-token')?.value;

	if (!accessToken || !refreshToken) {
		return redirect('/login');
	}

	const { data, error } = await supabase.auth.setSession({
		access_token: accessToken,
		refresh_token: refreshToken,
	});

	if (error || !data.user) {
		cookies.delete('sb-access-token', { path: '/' });
		cookies.delete('sb-refresh-token', { path: '/' });
		return redirect('/login');
	}

	context.locals.user = data.user;

	return next();
});
