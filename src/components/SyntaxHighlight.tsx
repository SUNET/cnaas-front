import { memo, useMemo } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-diff";

type SyntaxHighlightProps = {
  readonly index?: number; // kept for API compatibility; no longer needed
  readonly syntaxLanguage: string; // e.g. "language-diff diff-highlight"
  readonly code: string;
};

/** Pull the Prism language id out of a className like "language-diff diff-highlight". */
function languageFromClass(className: string): string {
  const match = /(?:^|\s)language-([\w-]+)/.exec(className);
  return match?.[1] ?? "plain";
}

/** Moves the +/- marker to the start of the line: "  +foo" -> "+  foo". */
function normalizeDiffSymbols(diff: string): string {
  return diff
    .split("\n")
    .map((line) => line.replace(/^(\s+)([+-])(\S)/, "$2$1$3"))
    .join("\n");
}

/**
 * Normalizes and highlights during render instead of mutating the DOM in an
 * effect, so React re-renders, remounts and filtering can't strip the highlighting.
 */
function SyntaxHighlightInner({ syntaxLanguage, code }: SyntaxHighlightProps) {
  const language = languageFromClass(syntaxLanguage);

  const html = useMemo(() => {
    const grammar = Prism.languages[language];
    if (!grammar) return null;

    const source = language === "diff" ? normalizeDiffSymbols(code) : code;
    return Prism.highlight(source, grammar, language);
  }, [code, language]);

  return (
    <pre className={syntaxLanguage}>
      {html === null ? (
        <code className={syntaxLanguage}>{code}</code>
      ) : (
        <code
          className={syntaxLanguage}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </pre>
  );
}

const SyntaxHighlight = memo(SyntaxHighlightInner);
export default SyntaxHighlight;
