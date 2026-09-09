/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly SUPABASE_URL: string;
	readonly SUPABASE_PUBLISHABLE_KEY: string;
	readonly SUPABASE_SECRET_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare namespace App {
	interface Locals {
		/**
		 * Just what the app actually reads, not the full Supabase User: the
		 * middleware verifies the JWT locally and builds this from its claims,
		 * so there is no user record to hand over on the fast path.
		 */
		user: { id: string; email: string | null } | null;
	}
}
