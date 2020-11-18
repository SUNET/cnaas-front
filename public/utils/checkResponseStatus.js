const checkResponseStatus = response => {
  if (response.ok) {
    return Promise.resolve(response);
  } else {
    throw Error(response.statusText);
  }
};

module.exports = checkResponseStatus;
