import { Icon, Button } from "semantic-ui-react";

export function BounceInterfaceButton({
  handleClick,
  editDisabled,
  bounceDisabled,
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
      Bounce interface {<Icon name="retweet" />}
    </Button>
  );
}
