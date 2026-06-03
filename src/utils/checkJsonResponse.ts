const checkJsonResponse = <T = unknown>(response: Response): Promise<T> => {
  return response.json().then((json: T) => {
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

export default checkJsonResponse;
