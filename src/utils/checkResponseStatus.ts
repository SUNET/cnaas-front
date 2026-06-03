const checkResponseStatus = (response: Response): Promise<Response> => {
  if (response.ok) {
    return Promise.resolve(response);
  }
  return Promise.reject(response);
};

export default checkResponseStatus;
