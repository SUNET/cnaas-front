import { getResponse } from "../utils/getData";
import checkJsonResponse from "../utils/checkJsonResponse";
import type { Job } from "../store/jobList/jobListReducer";

export interface FetchJobsResult {
  readonly jobs: Job[];
  readonly totalPages: number;
}

const STRING_FIELDS = new Set([
  "function_name",
  "scheduled_by",
  "ticket_ref",
  "comment",
]);

/**
 * Fetch paginated jobs from the API.
 * Returns { jobs, totalPages } on success, or throws on failure.
 */
export async function fetchJobs(
  token: string,
  sortField: string,
  filterField: string | null,
  filterValue: string | null,
  page: number,
): Promise<FetchJobsResult> {
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
}
