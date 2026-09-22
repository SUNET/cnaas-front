import { fetchJobs } from "./jobListApi";
import { getResponse as getResponseImport } from "../../../utils/getData";

jest.mock("../../../utils/getData");

const getResponse = getResponseImport as jest.MockedFunction<
  typeof getResponseImport
>;

function mockResponse(jobs: unknown[] = [], totalCount = "0") {
  return {
    ok: true,
    headers: { get: () => totalCount },
    json: () => Promise.resolve({ data: { jobs } }),
  } as unknown as Response;
}

describe("fetchJobs", () => {
  it("excludes the filter param when filterValue is empty", async () => {
    getResponse.mockResolvedValue(mockResponse());

    await fetchJobs("token", "-id", "id", "", 1);

    const url = getResponse.mock.calls[0][0];
    expect(url).not.toContain("filter[");
  });

  it("excludes the filter param when filterField is null", async () => {
    getResponse.mockResolvedValue(mockResponse());

    await fetchJobs("token", "-id", null, "some-value", 1);

    const url = getResponse.mock.calls[0][0];
    expect(url).not.toContain("filter[");
  });

  it("includes the filter param when both filterField and filterValue are set", async () => {
    getResponse.mockResolvedValue(mockResponse());

    await fetchJobs("token", "-id", "status", "FINISHED", 1);

    const url = getResponse.mock.calls[0][0];
    expect(url).toContain("filter[status]=FINISHED");
  });

  it("uses the [contains] operator for string fields", async () => {
    getResponse.mockResolvedValue(mockResponse());

    await fetchJobs("token", "-id", "comment", "test comment", 1);

    const url = getResponse.mock.calls[0][0];
    expect(url).toContain("filter[comment][contains]=test%20comment");
  });
});
