import React from "react";

class LoginForm extends React.Component {
  state = {
    email: "",
    password: ""
  };

  handleInput = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  render() {
    if (this.props.show !== true) {
      return (
        <div>
          <button className="logout" onClick={ev => this.props.logout()}>
            logout
          </button>
        </div>
      );
    }
    return (
      <div className="container">
        <form
          onSubmit={event =>
            this.props.login(this.state.email, this.state.password)
          }
        >
          <label className="title">
            Email
            <input
              type="text"
              name="email"
              onChange={this.handleInput}
              required
            />
          </label>
          <label className="title">
            Password
            <input
              type="password"
              name="password"
              onChange={this.handleInput}
              required
            />
          </label>
          <p className="title error">{this.props.errorMessage}</p>
          <button className="submit" type="submit">
            Login
          </button>
        </form>
      </div>
    );
  }
}

export default LoginForm;
