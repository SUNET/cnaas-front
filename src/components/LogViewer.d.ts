import { type ComponentType } from "react";

interface LogViewerProps {
  readonly logs: string[];
}

declare const LogViewer: ComponentType<LogViewerProps>;
export default LogViewer;
