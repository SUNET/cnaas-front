const checkResponseStatus = (response) => {
  if (response.ok) {
    return Promise.resolve(response);
  }
  return Promise.reject(response);
};

module.exports = checkResponseStatus;
