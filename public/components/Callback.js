import React from 'react'
import { Container } from 'semantic-ui-react'

import '../styles/reset.css'
import '../styles/main.css'

class Callback extends React.Component {
  errorMessage = "Please be patient, you will be logged in."

  componentDidMount () {
    // First check if logged in
    if (localStorage.getItem('token') !== null) {
      this.setState({ loggedIn: true })
      this.errorMessage = "You're logged in."
      window.location.replace('/')
      return
    }
    // Check if the token is in the url
    let params = new URLSearchParams(location.search)
    if (params.has('refresh_token')) {
      document.cookie = "REFRESH_TOKEN="+params.get('refresh_token')+"; SameSite=None; Secure; HttpOnly; Path=/api/v1.0/auth/refresh";
    }
    if (params.has('email')) {
      localStorage.setItem('email', params.get('email'));
    }
    if (params.has('token')) {
      // Add the token as a parameter in local storage and communicate with the user they are logged in
      // We don't check the validity of the token as this is done with every API call to get any information
      let token = params.get('token')
      localStorage.setItem('token', token)
      this.errorMessage = "You're logged in."
      window.location.replace('/')
    } else {
      this.errorMessage = "Something went wrong. Retry the login."
    }
  }
  render () {
      return (
        <div className='container'>
          <Container>
            <p className='title error'>{this.errorMessage}</p>
          </Container>
        </div>
      )
  //  }
  }
}

export default Callback
