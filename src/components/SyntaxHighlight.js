import "../styles/prism.css";
import { useEffect } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-diff.js";

function SyntaxHighlight({ index, syntaxLanguage, code }) {
  useEffect(() => {
    Prism.highlightAll();
  }, []);

  const normalizeDiffSymbols = (code) => {
    return code
      .split("\n")
      .map((line) => line.replace(/^(\s*)([+-])(\S)/, "$2$1$3"))
      .join("\n");
  };

  return (
    <pre key={index + 1} className={syntaxLanguage}>
      <code className={syntaxLanguage}>{normalizeDiffSymbols(code)}</code>
    </pre>
  );
}

export default SyntaxHighlight;
