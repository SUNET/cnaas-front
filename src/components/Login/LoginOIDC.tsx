import { SyntheticEvent } from "react";

type LoginOIDCProps = {
  readonly login: (event?: SyntheticEvent) => void;
  readonly errorMessage?: string;
};

function LoginOIDC({ login, errorMessage }: LoginOIDCProps) {
  return (
    <form onSubmit={login}>
      <p className="title error">{errorMessage}</p>
      <button className="submit" type="submit">
        Login with SSO
      </button>
    </form>
  );
}

export default LoginOIDC;
