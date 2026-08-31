import Button from "@mui/material/Button";
import AutorenewIcon from "@mui/icons-material/Autorenew";

export function BounceInterfaceButton({
  handleClick,
  editDisabled,
  bounceDisabled,
}: {
  readonly handleClick: () => void;
  readonly editDisabled: boolean;
  readonly bounceDisabled: boolean;
}) {
  return (
    <Button
      variant="contained"
      disabled={editDisabled || bounceDisabled}
      loading={bounceDisabled}
      onClick={handleClick}
      size="small"
      endIcon={<AutorenewIcon />}
    >
      Bounce interface
    </Button>
  );
}
