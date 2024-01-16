import React from 'react'
import { Container } from 'semantic-ui-react'
import '../styles/reset.css'
import '../styles/main.css'
import { getData } from "../utils/getData";

class Callback extends React.Component {

  errorMessage = "Please be patient, you will be logged in."
  
  getPermissions = (token) => {
    this.setState({loading: true, error: null});
    if (process.env.PERMISSIONS_DISABLED){
      this.checkSuccess()
      return
    } else {
      getData(process.env.API_URL + "/api/v1.0/auth/permissions", token)
      .then(data => {
        localStorage.setItem('permissions', JSON.stringify(data))
        this.errorMessage = "Permissions are retrieved."
        
      })
      .catch((error) => {
        this.errorMessage = "There is an error with collecting the permissions. Please try to reload this page or login again."
        console.log(error)
      }); 
    }
  };

  parseJwt = (token)  =>{
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  checkSuccess = () => {
    if ((localStorage.hasOwnProperty('permissions') || process.env.PERMISSIONS_DISABLED) && localStorage.getItem('expiration_time') * 1000 > new Date() && localStorage.hasOwnProperty('token')) {
      this.errorMessage = "Everything is loaded, you should be sent to the homepage in a second."
      this.setState({ loggedIn: true })
      window.location.replace('/')
      return true
    } else if (localStorage.getItem('expiration_time') * 1000 < new Date()){
      this.errorMessage = "The token has expired. Please login again."
      return false
    }
    return false
  }

  componentDidMount () {
    if(localStorage.hasOwnProperty('token')){ 
      if(this.checkSuccess()){
        return
      }
    }
    let params = new URLSearchParams(location.search)
    let token = params.get('token')
    localStorage.setItem('token', token)

    let decoded_token = this.parseJwt(token)
    localStorage.setItem('expiration_time', decoded_token['exp'])
    
    this.getPermissions(token)

  }
  render () { 
    return (
      <div className='container'>
        <Container>
          <p className='title error'>{this.errorMessage}</p>
        </Container>
      </div>
    )
  }
}

export default Callback
