const formatISODate = (dateString) => {
  return dateString.split(".")[0].replace("T", " ");
};

module.exports = formatISODate;
