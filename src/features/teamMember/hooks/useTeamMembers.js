import { useSelector } from "react-redux";

// Read-only access to the team member slice ({ items, status, error }).
// Loading is done by dispatching the slice's thunks.
export function useTeamMembers() {
  return useSelector((state) => state.teamMember);
}
