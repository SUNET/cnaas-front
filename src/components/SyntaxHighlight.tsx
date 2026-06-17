import "../styles/prism.css";
import { useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-diff.js";

type SyntaxHighlightProps = {
  readonly index?: number;
  readonly syntaxLanguage?: string;
  readonly code?: string;
};

function SyntaxHighlight({
  index = 0,
  syntaxLanguage,
  code = "",
}: SyntaxHighlightProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      Prism.highlightAllUnder(preRef.current);
    }
  }, []);

  const normalizeDiffSymbols = (diff: string): string => {
    return diff
      .split("\n")
      .map((line) => line.replace(/^(\s+)([+-])(\S)/, "$2$1$3"))
      .join("\n");
  };

  return (
    <pre ref={preRef} key={index + 1} className={syntaxLanguage}>
      <code className={syntaxLanguage}>{normalizeDiffSymbols(code)}</code>
    </pre>
  );
}

export default SyntaxHighlight;
