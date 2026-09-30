import { SyntheticEvent } from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

type LoginOIDCProps = {
  readonly login: (event?: SyntheticEvent) => void;
  readonly errorMessage?: string;
};

function LoginOIDC({ login, errorMessage }: LoginOIDCProps) {
  return (
    <form onSubmit={login}>
      <Typography color="error">{errorMessage}</Typography>
      <Button type="submit" variant="contained">
        Login with SSO
      </Button>
    </form>
  );
}

export default LoginOIDC;
