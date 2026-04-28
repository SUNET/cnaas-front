import { getResponse } from "../utils/getData";
import checkJsonResponse from "../utils/checkJsonResponse";
import type { Job } from "../store/jobList/jobListReducer";

export interface FetchJobsResult {
  readonly jobs: Job[];
  readonly totalPages: number;
  readonly error?: undefined;
}

export interface FetchJobsError {
  readonly jobs?: undefined;
  readonly totalPages?: undefined;
  readonly error: string;
}

const PER_PAGE = 20;

const STRING_FIELDS = new Set([
  "function_name",
  "scheduled_by",
  "ticket_ref",
  "comment",
]);

/**
 * Fetch paginated jobs from the API.
 * Returns { jobs, totalPages } on success, or { error } on failure.
 */
export async function fetchJobs(
  token: string,
  sortField: string,
  filterField: string | null,
  filterValue: string | null,
  page: number,
): Promise<FetchJobsResult | FetchJobsError> {
  try {
    let filterParams = "";
    if (filterField != null && filterValue != null) {
      const operator = STRING_FIELDS.has(filterField) ? "[contains]" : "";
      filterParams = `&filter[${filterField}]${operator}=${encodeURIComponent(filterValue)}`;
    }

    const url = `${process.env.API_URL}/api/v1.0/jobs?sort=${sortField}${filterParams}&page=${page}&per_page=${PER_PAGE}`;
    const response = await getResponse(url, token);

    const totalCountHeader = response.headers.get("X-Total-Count");
    let totalPages = 1;
    if (totalCountHeader != null && !Number.isNaN(Number(totalCountHeader))) {
      totalPages = Math.ceil(Number(totalCountHeader) / PER_PAGE);
    }

    const data = await checkJsonResponse(response);
    return { jobs: data.data.jobs, totalPages };
  } catch (error: unknown) {
    let message = "Unknown error";
    if (
      error != null &&
      typeof error === "object" &&
      "json" in error &&
      typeof (error as { json: unknown }).json === "function"
    ) {
      const responseError = error as Response;
      try {
        const jsonError: unknown = await responseError.json();
        if (
          jsonError != null &&
          typeof jsonError === "object" &&
          "message" in jsonError &&
          typeof (jsonError as { message: unknown }).message === "string"
        ) {
          message = (jsonError as { message: string }).message;
        } else if (
          "status" in responseError &&
          typeof responseError.status === "number"
        ) {
          message =
            responseError.statusText != null && responseError.statusText !== ""
              ? `${responseError.status} ${responseError.statusText}`
              : String(responseError.status);
        }
      } catch {
        if (
          "status" in responseError &&
          typeof responseError.status === "number"
        ) {
          message =
            responseError.statusText != null && responseError.statusText !== ""
              ? `${responseError.status} ${responseError.statusText}`
              : String(responseError.status);
        }
      }
    } else if (error instanceof Error) {
      message = error.message;
    } else if (
      error != null &&
      typeof error === "object" &&
      "message" in error
    ) {
      message = String((error as { message: unknown }).message);
    }
    console.error("Failed to fetch jobs:", message);
    return { error: message };
  }
}
