import React from 'react'

class LoginForm extends React.Component {
  state = {
    email: '',
    password: ''
  }

  handleInput = event => {
    this.setState({
      [event.target.name]: event.target.value
    })
  }


  render () {
    if (this.props.show !== true) {
      return (
        <div>
          <button className='logout' onClick={ev => this.props.logout()}>
            Logout
          </button>
        </div>
      )
    }

    if (process.env.OIDC_ENABLED == "true"){
      return (
        <div className='container'>
          <form onSubmit={this.props.oauthLogin}>
            <p className='title error'>{this.props.errorMessage}</p>
            <button className='submit' type='submit'>
              Login with OAUTH
            </button>
          </form>
        </div>
      )
    }
    return (
      <div className='container'>
        <form
          onSubmit={event =>
            this.props.login(event, this.state.email, this.state.password)
          }
        >
          <label className='form-title'>
            Email</label>
            <input
              type='text'
              name='email'
              onChange={this.handleInput}
              required
            />

          <label className='form-title'>
            Password</label>
            <input
              type='password'
              name='password'
              onChange={this.handleInput}
              required
            />

          <p className='title error'>{this.props.errorMessage}</p>
          <button className='submit' type='submit'>
            Login
          </button>
        </form>
      </div>
    )
  }
}
export default LoginForm
