const checkResponseStatus = response => {
  console.log("response status:", response.status);
  if (response.status === 200) {
    // console.log("response 200");
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

module.exports = checkResponseStatus;
