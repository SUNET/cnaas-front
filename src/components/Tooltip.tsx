import MuiTooltip, {
  type TooltipProps,
  tooltipClasses,
} from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";

/**
 * Shared Tooltip wrapper around MUI's Tooltip, tuned for this codebase.
 *
 * Replaces the Semantic UI `Popup` used across the app. It is the single
 * source of truth for tooltip look-and-feel, so every tooltip is consistent.
 * The surface styling is applied via `styled` on the portalled popper slot
 * (static, compiled CSS) rather than runtime `sx`, so there is no per-render
 * style serialization:
 *
 *   - `maxWidth: none` mirrors SUIR Popup's `wide` behaviour (MUI's default
 *     300px cap otherwise truncates our rich content).
 *   - Padding + font size (`--size-*` tokens) give comfortable, readable
 *     tooltips matching the old SUIR popups. This is why the child of a
 *     tooltip should NOT set its own `slotProps.tooltip.sx` — keep the look
 *     uniform; extend it here if a genuinely global change is needed.
 *
 * The child is wrapped in a neutral `<span>`. This solves two recurring
 * problems in one place:
 *   - MUI Tooltip requires its child to forward a ref to a DOM element. SUIR
 *     components (Button/Icon) don't, which throws "childNode.getAttribute is
 *     not a function". The span is always a valid ref target.
 *   - MUI copies `title` -> `aria-label` onto the child. When the child is
 *     already labelled (a link/button with text), that clobbers its accessible
 *     name. Labelling the span instead preserves it.
 */
export const Tooltip = styled(
  ({ className, children, ...props }: TooltipProps) => (
    <MuiTooltip {...props} classes={{ popper: className }}>
      <span>{children}</span>
    </MuiTooltip>
  ),
)({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: "none",
    padding: "var(--size-sm) var(--size-md)",
    fontSize: "var(--size-md)",
  },
});
