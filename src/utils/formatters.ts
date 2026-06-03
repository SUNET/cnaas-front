export const formatISODate = (
  dateString: string | null | undefined,
): string => {
  if (typeof dateString === "string") {
    return dateString.split(".")[0].replace("T", " ");
  }
  return "NA";
};

export const secondsToText = (secondsTotal: number): string => {
  const minutes = Math.floor(secondsTotal / 60);
  const seconds = String(secondsTotal % 60).padStart(2, "0");
  return `${minutes}m ${seconds}s`;
};

export const storeValueIsUndefined = (value: unknown): boolean =>
  !value || value === "undefined" || value === "null";
