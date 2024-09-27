import React from "react";

function LoginForm({ handleSubmit, setValue, formValues, errorMessage }) {
  const handleInput = (event) => {
    const { name, value } = event.target;
    setValue(name, value);
  };

  const handleClick = (event) => {
    event.preventDefault();
    handleSubmit(event, formValues.email, formValues.password);
  };

  return (
    <div className="container">
      <form>
        <label htmlFor="login-form-email" className="title">
          Email
          <input
            id="login-form-email"
            type="email"
            name="email"
            onChange={handleInput}
            required
          />
        </label>
        <label htmlFor="login-form-password" className="title">
          Password
          <input
            id="login-form-password"
            type="password"
            name="password"
            onChange={handleInput}
            required
          />
        </label>
        <p className="title error">{errorMessage}</p>
        <button className="submit" type="submit" onClick={handleClick}>
          Login
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
