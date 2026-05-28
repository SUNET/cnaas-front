import { Icon, Button } from "semantic-ui-react";

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
      disabled={editDisabled || bounceDisabled}
      loading={bounceDisabled}
      icon
      labelPosition="right"
      onClick={handleClick}
      size="small"
    >
      Bounce interface <Icon name="retweet" />
    </Button>
  );
}
