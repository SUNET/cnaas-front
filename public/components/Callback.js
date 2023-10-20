import React from 'react'
import { Container } from 'semantic-ui-react'

import '../styles/reset.css'
import '../styles/main.css'

class Callback extends React.Component {
  render () {
    let params = new URLSearchParams(location.search)
    let token = ''
    if (params.has('token')) {
      token = params.get('token')
      const url = process.env.API_URL + '/api/v1.0/auth/identity'
      fetch(url, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        redirect: 'follow'
      })
        .then(response => {
          if (response.ok) {
            localStorage.setItem('token', token)
            window.location.replace('/')
            return (
              <div className='container'>
                <Container>
                  Please be patient, you will be sent to the next page if the
                  login is successful.
                </Container>
              </div>
            )
          } else {
            return (
              <div className='container'>
                <Container>
                  Something went wrong, please try to login again.
                </Container>
              </div>
            )
          }
        })
        .catch(error => console.log('error', error))
      return (
        <div className='container'>
          <Container>
            Please be patient, you will be sent to the next page if the login is
            successful.
          </Container>
        </div>
      )
    } else {
      return (
        <div className='container'>
          <Container>
            Something went wrong, please try to login again.
          </Container>
        </div>
      )
    }
  }
}

export default Callback
