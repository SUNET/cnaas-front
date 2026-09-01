import { SyntheticEvent } from "react";
import Button from "@mui/material/Button";

type LoginOIDCProps = {
  readonly login: (event?: SyntheticEvent) => void;
  readonly errorMessage?: string;
};

function LoginOIDC({ login, errorMessage }: LoginOIDCProps) {
  return (
    <form onSubmit={login}>
      <p className="title error">{errorMessage}</p>
      <Button className="submit" type="submit" variant="contained">
        Login with SSO
      </Button>
    </form>
  );
}

export default LoginOIDC;
