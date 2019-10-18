import React from "react";
import Header from "./Header";
import Panel from "./Panel";
import Footer from "./Footer";


class App extends React.Component {
  // here we set the initial state of the component
  state = {
    // this code is prepared to hold json webtoken (jwt) here
    // token: "",
    // we want to update the state with our API data here when we have it
    devicesData: [],
    // this code is prepared to hold appropriate error messages here - see checkStatus()
    // errorMessage: ""
  };

  // here we check the status of the response and only process the result if status is 200
  checkStatus = response => {
    console.log("we have response");
    if (response.status === 200) {
      console.log("response 200");
      return Promise.resolve(response);
    } else if (response.status === 400 || response.status === 401) {
      this.setState({
        errorMessage: "Your details were not recognised. Try again!"
      });
    } else if (response.staus === 500) {
      this.setState({
        errorMessage: "Something went wrong on our end. Try again later."
      });
    }
  };

  // here we request the data at the URL at teh click of the button
  getDeviceData = () => {
    // check that button click works
    console.log("you clicked the button");
    fetch("https://127.0.0.1:8080/api/v1.0/device/9", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // once jwt has been added token goes here
        // Authorization: `Bearer ${credentials}`
        // "Content-Type": "application/x-www-form-urlencoded"
      }
    })
      .then(response => this.checkStatus(response))
      .then(response => {
      // here we shold eb able to convert response into json, but is coming black blank (and resulting in a json parsing error)
        console.log("this is response:", response.json());
      });
    // here we should get the final data in json format
    // .then(data => console.log("this is data:", data));
        // when we have the data we need to update the state (setState) above to take on the data we want to display
    //   // {
    //   // this.setState({
    //   //   devicesDat: data,
    //   // });
    //   // }
    // );
  };

  // here we render the App page - this code is written in jsx, an extension of js syntax that's HTML-like and easier to read and write
  // App is the parent of 3 child components: Header, Panel and Footer
    // The button that triggers the API request lives in the Panel, so the API request functionality (above) needs to be passed down to the Panel
    // The API request is passed down from the App.js parent as a property (props) to the Panel child via "request.Prop"
    // When App recieved data that too needs to be passed down to the Panel to be furtehr handled
  //
  render() {
    return (
      <div className="container">
        <Header />
        <Panel
          requestData={this.getDeviceData}
        />
        <Footer />
      </div>
    );
  }
}

export default App;
