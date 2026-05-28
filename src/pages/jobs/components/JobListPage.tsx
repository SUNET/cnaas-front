import { JobListProvider } from "../stores/JobListContext";
import { JobList } from "./JobList";

/**
 * Route-level component for /jobs.
 * Wraps JobList in the context provider.
 */
export function JobListPage() {
  return (
    <JobListProvider>
      <JobList />
    </JobListProvider>
  );
}
