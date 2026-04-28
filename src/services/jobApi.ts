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
      filterParams = `&filter[${filterField}]${operator}=${filterValue}`;
    }

    const url = `${process.env.API_URL}/api/v1.0/jobs?sort=${sortField}${filterParams}&page=${page}&per_page=20`;
    const response = await getResponse(url, token);

    const totalCountHeader = response.headers.get("X-Total-Count");
    let totalPages = 1;
    if (totalCountHeader != null && !Number.isNaN(Number(totalCountHeader))) {
      totalPages = Math.ceil(Number(totalCountHeader) / 20);
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
      const jsonError = await (error as Response).json();
      message = jsonError.message ?? "Unknown error";
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
