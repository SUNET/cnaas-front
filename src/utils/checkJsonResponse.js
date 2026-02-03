const checkJsonResponse = (response) => {
  return response.json().then((json) => {
    if (!response.ok) {
      const error = {
        ...json,
        status: response.status,
        statusText: response.statusText,
      };

      return Promise.reject(error);
    }
    return json;
  });
};

module.exports = checkJsonResponse;
