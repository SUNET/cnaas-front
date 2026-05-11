import { type ComponentType } from "react";

interface SyntaxHighlightProps {
  readonly index?: number;
  readonly syntaxLanguage?: string;
  readonly code?: string;
}

declare const SyntaxHighlight: ComponentType<SyntaxHighlightProps>;
export default SyntaxHighlight;
