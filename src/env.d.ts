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
		user: import('@supabase/supabase-js').User | null;
	}
}
