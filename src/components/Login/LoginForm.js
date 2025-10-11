function LoginForm({ handleSubmit, setValue, formValues, errorMessage }) {
  const handleInput = (event) => {
    const { name, value } = event.target;
    setValue(name, value);
  };

  const handleClick = (event) => {
    event.preventDefault();
    handleSubmit(formValues.email, formValues.password);
  };

  return (
    <div className="container">
      <form>
        <label htmlFor="login-form-email" className="title">
          Email
        </label>
        <input
          id="login-form-email"
          type="email"
          name="email"
          onChange={handleInput}
          required
        />
        <label htmlFor="login-form-password" className="title">
          Password
        </label>
        <input
          id="login-form-password"
          type="password"
          name="password"
          onChange={handleInput}
          required
        />
        <p className="title error">{errorMessage}</p>
        <button className="submit" type="submit" onClick={handleClick}>
          Login
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
