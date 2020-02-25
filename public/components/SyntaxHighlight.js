import React from "react";
import Prism from "prismjs";

// import "../../node_modules/prismjs/components/prism-diff.min.js";
import "../styles/prism.css";

class SyntaxHighlight extends React.Component {
  componentDidMount() {
    Prism.highlightAll();
  }
  render() {
    return (
      <pre className="diff-highlight" key={this.props.index + 1}>
        <code className={this.props.syntaxLanguage}>{this.props.code}</code>
      </pre>
    );
  }
}

export default SyntaxHighlight;
