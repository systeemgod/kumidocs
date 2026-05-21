import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { type LanguageName, loadLanguage } from '@uiw/codemirror-extensions-langs';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/store/theme';

interface CodeEditorProps {
	value: string;
	language: string;
	readOnly?: boolean;
	onChange?: (value: string) => void;
	onSave?: () => void;
}

const EXT_TO_LANG: Record<string, string> = {
	mjs: 'js',
	cjs: 'js',
	bash: 'sh',
	zsh: 'sh',
	fish: 'sh',
	htm: 'html',
	scss: 'sass',
	yml: 'yaml',
	jsonc: 'json',
	gql: 'graphql',
	kt: 'kotlin',
	kts: 'kotlin',
	tf: 'hcl',
	tfvars: 'hcl',
};

const resolveLanguage = (ext: string): NonNullable<ReturnType<typeof loadLanguage>>[] => {
	const name = (EXT_TO_LANG[ext] ?? ext) as LanguageName;
	try {
		const lang = loadLanguage(name);
		let result: NonNullable<ReturnType<typeof loadLanguage>>[] = [];
		if (lang) { result = [lang]; }
		return result;
	} catch {
		return [];
	}
};

const CodeEditor = (allProps: CodeEditorProps): JSX.Element => {
	const { value, language, readOnly = false, onChange, onSave } = allProps;
	const { theme } = useTheme();

	let onSaveExtension: ReturnType<typeof EditorView.domEventHandlers>[] = [];
	if (onSave) {
		onSaveExtension = [
			EditorView.domEventHandlers({
				keydown(event) {
					if ((event.ctrlKey || event.metaKey) && event.key === 's') {
						event.preventDefault();
						onSave();
					}
				},
			}),
		];
	}

	const extensions = [
		...resolveLanguage(language),
		EditorView.lineWrapping,
		...onSaveExtension,
	];

	let resolvedTheme = githubLight;
	if (theme === 'dark') { resolvedTheme = githubDark; }

	return (
		<div className="h-full overflow-auto text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:min-h-full [&_.cm-editor.cm-focused]:outline-none">
			<CodeMirror
				value={value}
				height="100%"
				theme={resolvedTheme}
				extensions={extensions}
				readOnly={readOnly}
				basicSetup={{
					lineNumbers: true,
					foldGutter: true,
					highlightActiveLine: !readOnly,
					highlightSelectionMatches: true,
					autocompletion: false,
					closeBrackets: false,
				}}
				onChange={onChange}
			/>
		</div>
	);
};

export { CodeEditor };
