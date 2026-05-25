import { getResponse } from "../../../utils/getData";
import checkJsonResponse from "../../../utils/checkJsonResponse";
import type { Job } from "../../../types/job";

export type FetchJobsResult = {
  readonly jobs: Job[];
  readonly totalPages: number;
};

export type FetchJobsError = {
  readonly error: string;
};

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
    const url = buildJobsUrl(sortField, filterField, filterValue, page);
    const response = await getResponse(url, token);
    const totalPages = parseTotalPages(response.headers.get("X-Total-Count"));
    const data = await checkJsonResponse(response);
    return { jobs: data.data.jobs, totalPages };
  } catch (error: unknown) {
    const message = await extractErrorMessage(error);
    console.error("Failed to fetch jobs:", message);
    return { error: message };
  }
}

function buildJobsUrl(
  sortField: string,
  filterField: string | null,
  filterValue: string | null,
  page: number,
): string {
  let filterParams = "";
  if (filterField != null && filterValue != null) {
    const operator = STRING_FIELDS.has(filterField) ? "[contains]" : "";
    filterParams = `&filter[${filterField}]${operator}=${encodeURIComponent(filterValue)}`;
  }
  return `${process.env.API_URL}/api/v1.0/jobs?sort=${sortField}${filterParams}&page=${page}&per_page=${PER_PAGE}`;
}

function parseTotalPages(header: string | null): number {
  if (header == null || Number.isNaN(Number(header))) return 1;
  return Math.ceil(Number(header) / PER_PAGE);
}

async function extractErrorMessage(error: unknown): Promise<string> {
  if (isResponseLike(error)) {
    return extractResponseMessage(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (hasMessageField(error)) {
    return String(error.message);
  }
  return "Unknown error";
}

function isResponseLike(error: unknown): error is Response {
  return (
    error != null &&
    typeof error === "object" &&
    "json" in error &&
    typeof error.json === "function"
  );
}

function hasMessageField(error: unknown): error is { message: unknown } {
  return error != null && typeof error === "object" && "message" in error;
}

async function extractResponseMessage(response: Response): Promise<string> {
  try {
    const jsonError: unknown = await response.json();
    if (hasStringMessage(jsonError)) return jsonError.message;
  } catch {
    // fall through to status fallback
  }
  return formatStatusFallback(response);
}

function hasStringMessage(value: unknown): value is { message: string } {
  return (
    value != null &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  );
}

function formatStatusFallback(response: Response): string {
  if (typeof response.status !== "number") return "Unknown error";
  if (response.statusText != null && response.statusText !== "") {
    return `${response.status} ${response.statusText}`;
  }
  return String(response.status);
}
