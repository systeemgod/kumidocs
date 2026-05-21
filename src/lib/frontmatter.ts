/**
 * Minimal client-side frontmatter parser for KumiDocs metadata.
 * Only reads the fields KumiDocs manages; all other YAML fields are intentionally
 * discarded — KumiDocs does not attempt to round-trip arbitrary frontmatter.
 *
 * Server-side code (filestore.ts, search.ts) uses gray-matter for full parsing.
 * This module exists to avoid a gray-matter browser-compatibility dependency.
 */

/** Whitelisted KumiDocs frontmatter fields. */
interface PageMeta {
	emoji?: string;
	slides?: boolean;
	/** Deck-level theme for slide presentations: 'default' | 'dark' | 'corporate' | 'minimal' | 'gradient' */
	theme?: string;
	/** When true, slide numbers are shown on each slide canvas */
	paginate?: boolean;
	/** Custom variables substituted into theme element content strings via {{key}} */
	themeVars?: Record<string, string>;
}

/** Apply a single key/value pair parsed from frontmatter to the PageMeta accumulator. */
const applyKv = (data: PageMeta, key: string, val: string): void => {
	const trimmedVal = val.trim();
	if (key === 'emoji') { data.emoji = trimmedVal; }
	if (key === 'slides' && trimmedVal === 'true') { data.slides = true; }
	if (key === 'theme') { data.theme = trimmedVal; }
	if (key === 'paginate' && trimmedVal === 'true') { data.paginate = true; }
	if (key.startsWith('theme-var-')) {
		const THEME_VAR_PREFIX = 'theme-var-';
		const varName = key.slice(THEME_VAR_PREFIX.length);
		if (varName) { (data.themeVars ??= {})[varName] = trimmedVal; }
	}
};

/** Parse only the whitelisted KumiDocs frontmatter fields from a raw markdown string. */
const parseFrontmatter = (raw: string): { data: PageMeta; content: string } => {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u.exec(raw);
	if (!match) { return { data: {}, content: raw }; }
	const fullMatch = match.at(0) ?? '';
	const block = match.at(1) ?? '';
	const content = raw.slice(fullMatch.length);
	const data: PageMeta = {};
	for (const line of block.split('\n')) {
		const kv = /^([\w-]+):\s*(.*)$/u.exec(line.trim());
		if (kv) {
			const key = kv.at(1);
			const val = kv.at(2) ?? '';
			if (key) { applyKv(data, key, val); }
		}
	}
	return { data, content };
};

/** Serialise only the whitelisted KumiDocs frontmatter fields back to a YAML block. */
const buildFrontmatter = (meta: PageMeta): string => {
	const lines: string[] = [];
	if (meta.emoji) { lines.push(`emoji: ${meta.emoji}`); }
	if (meta.slides) { lines.push('slides: true'); }
	if (meta.theme && meta.theme !== 'default') { lines.push(`theme: ${meta.theme}`); }
	if (meta.paginate) { lines.push('paginate: true'); }
	if (meta.themeVars) {
		for (const [varKey, varValue] of Object.entries(meta.themeVars)) {
			lines.push(`theme-var-${varKey}: ${varValue}`);
		}
	}
	if (lines.length === 0) { return ''; }
	return `---\n${lines.join('\n')}\n---\n`;
};

/** Return the text of the first `# Heading` line in a markdown body, or undefined. */
const extractHeadingTitle = (body: string): string | undefined => {
	const HEADING_PREFIX = '# ';
	for (const line of body.split('\n')) {
		if (line.startsWith(HEADING_PREFIX)) { return line.slice(HEADING_PREFIX.length).trim(); }
	}
};

export type { PageMeta };
export { parseFrontmatter, buildFrontmatter, extractHeadingTitle };

