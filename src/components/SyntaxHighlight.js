import "../styles/prism.css";
import { useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-diff.js";
import PropTypes from "prop-types";

function SyntaxHighlight({ index, syntaxLanguage, code }) {
  const preRef = useRef();

  useEffect(() => {
    Prism.highlightAllUnder(preRef.current);
  }, []);

  const normalizeDiffSymbols = (code) => {
    return code
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

SyntaxHighlight.propTypes = {
  index: PropTypes.number,
  syntaxLanguage: PropTypes.string,
  code: PropTypes.string,
};

export default SyntaxHighlight;
