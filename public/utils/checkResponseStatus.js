const checkResponseStatus = response => {
  if (response.status === 200) {
    return Promise.resolve(response);
  } else if (response.status === 400 || response.status === 401) {
    console.log("response 400/401");
    return Promise.resolve(response);
  } else if (response.staus === 500) {
    console.log("response 500");
    return Promise.resolve(response);
  } else {
    console.log("unhandled status code: ", response.status)
  }
};

module.exports = checkResponseStatus;
