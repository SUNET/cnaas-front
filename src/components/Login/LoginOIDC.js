function LoginOIDC({ login, errorMessage }) {
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
