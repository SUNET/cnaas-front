import React from "react";

class LoginForm extends React.Component {
  state = {
    email: "",
    password: ""
  };

 

  login = (email, password) => {
    event.preventDefault();
    // const url = "url to jwt api";
    // fetch(url, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     email,
    //     password
    //   })
    // })
    // .then(res => this.checkStatus(res))
    // .then(res => res.json())
    // .then(token => {
    this.setState(
      {
        showLoginForm: false,
        token: token
      },
      () => {
        localStorage.setItem("token", token);
      }
    );
    // })
    // .catch(error => {
    //   this.setState(
    //     {
    //       showLoginForm: false,
    //       showPortfolioList: false,
    //       showPortfolioDetail: false,
    //       instrumentDetails: false
    //     },
    //     () => {
    //       localStorage.removeItem("token");
    //       this.setState({
    //         showLoginForm: true,
    //         showPortfolioList: false,
    //         showPortfolioDetail: false,
    //         instrumentDetails: false
    //       });
    //     }
    //   );
    // });
  };

  // logout = () => {
  //   localStorage.removeItem("token");
  //   this.setState({
  //     showLoginForm: true,
  //     showPortfolioList: false,
  //     showPortfolioDetail: false,
  //     instrumentDetails: false,
  //     errorMessage: "you have logged out"
  //   });
  // };


  handleInput = event => {
    this.setState({
      [event.target.name]: event.target.value
    });
  };

  render() {
    // if (this.props.show !== true) {
    //   return <div />;
    // }
    return (
      <div className="container">
        <form
          onSubmit={ev =>
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
              type="text"
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
