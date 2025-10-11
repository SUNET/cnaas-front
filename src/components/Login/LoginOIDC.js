function LoginOIDC({ login, errorMessage }) {
  return (
    <div className="container">
      <form onSubmit={login}>
        <p className="title error">{errorMessage}</p>
        <button className="submit" type="submit">
          Login with SSO
        </button>
      </form>
    </div>
  );
}

export default LoginOIDC;
