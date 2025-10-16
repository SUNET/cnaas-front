import "../styles/prism.css";
import { useEffect } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-diff.js";

function SyntaxHighlight({ index, syntaxLanguage, code }) {
  useEffect(() => {
    Prism.highlightAll();
  }, []);

  return (
    <pre key={index + 1} className={syntaxLanguage}>
      <code className={syntaxLanguage}>{code}</code>
    </pre>
  );
}

export default SyntaxHighlight;
