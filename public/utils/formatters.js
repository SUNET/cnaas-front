const formatISODate = (dateString) => {
  if (typeof dateString === 'string' || dateString instanceof String) {
    return dateString.split(".")[0].replace("T", " ");
  } else {
    return "NA";
  }
};

module.exports = formatISODate;
