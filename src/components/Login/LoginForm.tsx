import { ChangeEvent, MouseEvent } from "react";

type LoginFormValues = {
  readonly email: string;
  readonly password: string;
};

type LoginFormProps = {
  readonly handleSubmit: (email: string, password: string) => void;
  readonly setValue: (name: string, value: string) => void;
  readonly formValues: LoginFormValues;
  readonly errorMessage?: string;
};

function LoginForm({
  handleSubmit,
  setValue,
  formValues,
  errorMessage,
}: LoginFormProps) {
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValue(name, value);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    handleSubmit(formValues.email, formValues.password);
  };

  return (
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
  );
}

export default LoginForm;
