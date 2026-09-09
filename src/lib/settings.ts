import type { SupabaseClient } from '@supabase/supabase-js';
import type { PreviewSettings } from './preview';

/**
 * Used when the settings row cannot be read. jQuery 1.10.2 is the version the
 * team ships in production, so an unconfigured preview still behaves like the
 * real platform rather than silently dropping jQuery and making every
 * component look broken.
 */
export const DEFAULT_PREVIEW_SETTINGS: PreviewSettings = {
	previewCssUrls: [],
	previewJsUrls: ['//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js'],
	previewLessVariables: '',
};

export async function loadPreviewSettings(db: SupabaseClient): Promise<PreviewSettings> {
	const { data } = await db
		.from('settings')
		.select('preview_css_urls, preview_js_urls, preview_less_variables')
		.eq('id', true)
		.maybeSingle();

	if (!data) {
		return DEFAULT_PREVIEW_SETTINGS;
	}

	return {
		previewCssUrls: data.preview_css_urls ?? [],
		previewJsUrls: data.preview_js_urls ?? [],
		previewLessVariables: data.preview_less_variables ?? '',
	};
}

/**
 * In-memory cache of the settings singleton.
 *
 * The LESS compile needs the site variables, and reading them cost a Supabase
 * round trip (130-500ms) on every compile -- often more than the compile
 * itself. It is one row, edited by hand every few weeks.
 *
 * `settings.save` clears this explicitly, so an edit applies immediately in the
 * process that made it. The TTL is the backstop for every other process: on
 * serverless, invalidation only reaches the instance that handled the save.
 */
const SETTINGS_TTL_MS = 30_000;
let cached: { value: PreviewSettings; at: number } | null = null;

export async function loadPreviewSettingsCached(db: SupabaseClient): Promise<PreviewSettings> {
	if (cached && Date.now() - cached.at < SETTINGS_TTL_MS) {
		return cached.value;
	}

	const value = await loadPreviewSettings(db);
	cached = { value, at: Date.now() };
	return value;
}

export function invalidatePreviewSettings() {
	cached = null;
}

/**
 * The global ASP variables, as the name -> value map the resolver expects.
 * A component's own variables are merged over these; see mergeVariables().
 */
export async function loadGlobalVariables(
	db: SupabaseClient,
): Promise<Record<string, string>> {
	const { data } = await db.from('variables').select('name, value');

	return Object.fromEntries((data ?? []).map((row) => [row.name, row.value ?? '']));
}
