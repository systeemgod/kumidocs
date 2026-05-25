import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import type { LanguageName } from "@uiw/codemirror-extensions-langs";
import { loadLanguage } from "@uiw/codemirror-extensions-langs";
import { useTheme } from "@/store/theme";

interface CodeEditorProps {
  value: string;
  language: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onSave?: () => void;
}

const EXT_TO_LANG: Record<string, string> = {
  bash: "sh",
  cjs: "js",
  fish: "sh",
  gql: "graphql",
  htm: "html",
  jsonc: "json",
  kt: "kotlin",
  kts: "kotlin",
  mjs: "js",
  scss: "sass",
  tf: "hcl",
  tfvars: "hcl",
  yml: "yaml",
  zsh: "sh",
};

const resolveLanguage = (ext: string): NonNullable<ReturnType<typeof loadLanguage>>[] => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const name = (EXT_TO_LANG[ext] ?? ext) as LanguageName;
  try {
    const lang = loadLanguage(name);
    let result: NonNullable<ReturnType<typeof loadLanguage>>[] = [];
    if (lang) {
      result = [lang];
    }
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
          if ((event.ctrlKey || event.metaKey) && event.key === "s") {
            event.preventDefault();
            onSave();
          }
        },
      }),
    ];
  }

  const extensions = [...resolveLanguage(language), EditorView.lineWrapping, ...onSaveExtension];

  let resolvedTheme = githubLight;
  if (theme === "dark") {
    resolvedTheme = githubDark;
  }

  return (
    <div className="h-full overflow-auto text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:min-h-full [&_.cm-editor.cm-focused]:outline-none">
      <CodeMirror
        value={value}
        height="100%"
        theme={resolvedTheme}
        extensions={extensions}
        readOnly={readOnly}
        basicSetup={{
          autocompletion: false,
          closeBrackets: false,
          foldGutter: true,
          highlightActiveLine: !readOnly,
          highlightSelectionMatches: true,
          lineNumbers: true,
        }}
        onChange={onChange}
      />
    </div>
  );
};

export default CodeEditor;
