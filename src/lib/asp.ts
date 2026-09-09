// Stands in for the Classic ASP runtime when previewing a component.
//
// Components ship into an ASP platform, so their markup contains server-side
// blocks that no browser will ever evaluate. Rather than implement ASP, we
// substitute the two shapes that actually appear in the source:
//
//   <%=TXT_IMG_PATH%>                        a variable  -> its stored value
//   <% = txtRetriever("landing","C2") %>     a call      -> a named placeholder
//
// Anything else is left as a placeholder too, since guessing at it would make
// the preview lie about what the real platform will render.

/** Matches an ASP block and captures its inner expression. */
const ASP_BLOCK = /<%\s*=?\s*([\s\S]*?)\s*%>/g;

/** A bare variable reference, e.g. TXT_IMG_PATH or my_var2. */
const SIMPLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** A function call, e.g. txtRetriever("landing","Content2"). */
const FUNCTION_CALL = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(/;

export interface AspResolution {
	code: string;
	/**
	 * Variable names the code referenced that are defined nowhere. They render
	 * as an empty string (which is what ASP itself does), so the editor lists
	 * them instead — an invisible gap is otherwise very hard to diagnose.
	 */
	missing: string[];
	/** Function calls that were replaced by a placeholder. */
	placeholders: string[];
}

/**
 * Substitutes ASP blocks using the given variables.
 *
 * `variables` should already be the merged map: global values with the
 * component's own overrides applied on top. See mergeVariables().
 */
export function resolveAsp(
	aspCode: string,
	variables: Record<string, string>,
): AspResolution {
	const missing = new Set<string>();
	const placeholders = new Set<string>();

	const code = aspCode.replace(ASP_BLOCK, (_match, rawExpression: string) => {
		const expression = rawExpression.trim();

		if (!expression) return '';

		if (SIMPLE_NAME.test(expression)) {
			const value = variables[expression];

			if (value === undefined) {
				missing.add(expression);
				// Empty string, matching what ASP prints for an undefined
				// variable. The name is reported through `missing` instead.
				return '';
			}

			return value;
		}

		const call = FUNCTION_CALL.exec(expression);

		if (call) {
			placeholders.add(call[1]);
			return `[${call[1]}]`;
		}

		// Some other server-side expression. Show it is a placeholder rather
		// than dropping it silently.
		placeholders.add(expression);
		return `[${expression}]`;
	});

	return { code, missing: [...missing], placeholders: [...placeholders] };
}

/**
 * Global variables with the component's own on top.
 *
 * Component-level entries win, which is the point of having both: a component
 * can preview against a specific value without changing what every other
 * component sees.
 */
export function mergeVariables(
	global: Record<string, string>,
	component: Record<string, string>,
): Record<string, string> {
	return { ...global, ...component };
}

/**
 * Every variable name an ASP source references, in order of first appearance.
 * Used by the editor to offer the author the names their code actually needs.
 */
export function referencedVariableNames(aspCode: string): string[] {
	const names = new Set<string>();

	for (const match of aspCode.matchAll(ASP_BLOCK)) {
		const expression = match[1].trim();
		if (SIMPLE_NAME.test(expression)) {
			names.add(expression);
		}
	}

	return [...names];
}
