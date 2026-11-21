// Public API of the team member feature. Import from
// "@/features/teamMember/index.js", never reach into hooks/, store/, or
// definitions/ from outside this folder.
export { useTeamMembers } from "./hooks/useTeamMembers.js";
export {
  TEAM_MEMBER_STATUS,
  TEAM_MEMBER_STATUSES,
  TEAM_MEMBER_NAME_MAX,
  TEAM_MEMBER_DESIGNATION_MAX,
  TEAM_MEMBER_LINKEDIN_MAX,
  TEAM_MEMBER_AVATAR_TYPES,
  TEAM_MEMBER_AVATAR_MAX_BYTES,
  DESIGNATION_SUGGESTIONS,
  getTeamMemberStatus,
  buildTeamMemberAvatarUrl,
  normalizeLinkedinUrl,
  shortLinkedinLabel,
} from "./definitions/teamMembers.js";
export { teamMemberValidationSchema } from "./definitions/teamMemberValidation.js";
export {
  default as teamMemberReducer,
  fetchTeamMembers,
  createTeamMember,
  updateTeamMember,
  updateTeamMemberStatus,
  deleteTeamMember,
  reorderTeamMembers,
} from "./store/teamMemberSlice.js";
