import React from 'react'
import { Container } from 'semantic-ui-react'
import '../styles/reset.css'
import '../styles/main.css'
import getData from "../utils/getData";

class Callback extends React.Component {
  errorMessage = "Please be patient, you will be logged in."

  
  getPermissions = (token) => {
    this.setState({loading: true, error: null});

    getData(process.env.API_URL + "/api/v1.0/auth/permissions", token)
    .then(data => {
      localStorage.setItem('permissions', JSON.stringify(data))
      this.setState({ loggedIn: true })
      window.location.replace('/')
      return true
    })
    .catch((error) => {
      console.log(error)
      return false
    });
  };

  parseJwt = (token)  =>{
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}
  componentDidMount () {
    // First check if logged in
    let token = localStorage.getItem('token');
    if (token == null) {
      // Check if the token is in the url
      let params = new URLSearchParams(location.search)
      if (params.has('token')) {
        // Add the token as a parameter in local storage and communicate with the user they are logged in
        // We don't check the validity of the token as this is done with every API call to get any information
        token = params.get('token')
        let decoded_token = this.parseJwt(token)
        localStorage.setItem('token', token)
        localStorage.setItem('expire', decoded_token['exp'])
      } else {
        this.errorMessage = "Something went wrong. Retry the login."
        return
      }
    }
    if(localStorage.getItem('expire') > Date.now()){
      this.errorMessage = "Token expired. Logout"
      this.setState({ loggedIn: false })
      return
    }
    if (localStorage.getItem('permissions') == null){
      if(!this.getPermissions(token)) {
        this.errorMessage = "Error with permissions"
        this.setState({ loggedIn: false })
      }
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
