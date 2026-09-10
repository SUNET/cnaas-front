import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import type { ReactNode } from "react";
import { Tooltip } from "./Tooltip";

// Buttons in this app get a theme-wide margin (see MuiButton styleOverrides
// in App.tsx). Badge positions itself relative to its child's margin box, so
// without this offset the badge would float away from the button's visible
// corner by that same margin. Nudge it back in by that amount.
const OffsetBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    top: theme.spacing(1),
    right: theme.spacing(1),
  },
}));

type BadgeButtonProps = {
  readonly children: ReactNode;
  readonly badgeCount: number | null;
  readonly disabled?: boolean;
  readonly hidden?: boolean;
  readonly onClick: () => void;
};

function getBadgeContent(badgeCount: number | null) {
  if (badgeCount === null) return "?";
  if (badgeCount === 0) return "\u2713"; // ✓
  return badgeCount;
}

function getBadgeColor(badgeCount: number | null) {
  if (badgeCount === null) return "warning";
  if (badgeCount === 0) return "success";
  return "primary";
}

function getBadgeTooltip(badgeCount: number | null) {
  if (badgeCount === null) return "Unknown";
  if (badgeCount === 0) return "Up to date";
  return `${badgeCount} commit${badgeCount === 1 ? "" : "s"} behind`;
}

// Button decorated with a badge showing:
// a number, a checkmark when 0, or "?" when unknown.
export function BadgeButton({
  children,
  badgeCount,
  disabled,
  hidden,
  onClick,
}: BadgeButtonProps) {
  return (
    <Tooltip title={getBadgeTooltip(badgeCount)}>
      <OffsetBadge
        hidden={hidden}
        badgeContent={getBadgeContent(badgeCount)}
        color={getBadgeColor(badgeCount)}
        max={100}
      >
        <Button
          variant="contained"
          color="secondary"
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </OffsetBadge>
    </Tooltip>
  );
}
