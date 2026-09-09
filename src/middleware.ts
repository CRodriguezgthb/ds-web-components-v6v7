import { defineMiddleware } from 'astro:middleware';
import { supabase } from './lib/supabase';

// '/_actions' is where Astro serves Actions. It has to be listed here or the
// component mutations would run without ever passing the session check, and
// `create` would fail outright since its handler needs the locals.user set below.
const PROTECTED_PREFIXES = ['/admin', '/api/admin', '/_actions'];

/** Matches how signin.ts writes them, so a refresh does not change the shape. */
function sessionCookieOptions(requestUrl: string) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: new URL(requestUrl).protocol === 'https:',
	};
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { cookies, url, redirect, request } = context;
	const isProtected = PROTECTED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

	if (!isProtected) {
		return next();
	}

	const accessToken = cookies.get('sb-access-token')?.value;
	const refreshToken = cookies.get('sb-refresh-token')?.value;

	if (!accessToken || !refreshToken) {
		return redirect('/login');
	}

	// Fast path: verify the JWT locally. This project signs with ES256, so
	// getClaims() checks the signature against the project's JWKS — fetched
	// once and cached — instead of calling Supabase Auth. That is the
	// difference between ~1ms and ~200ms, on every single admin request.
	const { data: verified } = await supabase.auth.getClaims(accessToken);

	if (verified?.claims?.sub) {
		context.locals.user = {
			id: verified.claims.sub,
			email: typeof verified.claims.email === 'string' ? verified.claims.email : null,
		};
		return next();
	}

	// Slow path: the access token is expired or unverifiable. setSession()
	// spends a round trip but will mint a new one from the refresh token, so
	// sessions keep working past the access token's lifetime. Verifying
	// locally without this fallback would log everyone out every hour.
	const { data, error } = await supabase.auth.setSession({
		access_token: accessToken,
		refresh_token: refreshToken,
	});

	if (error || !data.session || !data.user) {
		cookies.delete('sb-access-token', { path: '/' });
		cookies.delete('sb-refresh-token', { path: '/' });
		return redirect('/login');
	}

	// Hand the refreshed tokens back to the browser, or the next request pays
	// for this same refresh again.
	const options = sessionCookieOptions(request.url);
	cookies.set('sb-access-token', data.session.access_token, options);
	cookies.set('sb-refresh-token', data.session.refresh_token, options);

	context.locals.user = { id: data.user.id, email: data.user.email ?? null };

	return next();
});
