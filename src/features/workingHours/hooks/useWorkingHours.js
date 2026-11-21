import { useSelector } from "react-redux";

// Read-only access to the working-hours slice ({ config, status, error }).
export function useWorkingHours() {
  return useSelector((state) => state.workingHours);
}
