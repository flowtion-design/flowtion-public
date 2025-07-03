import RoleConfiguration from "src/interfaces/role-configuration.inteface";
import { Role } from "./enums";

export const getConfigurationByRole = (role: Role): RoleConfiguration => {
    switch (role) {
      case Role.Facilitator:
        return {
          canAddElements: false,
          canRemoveElements: false,
          canEditElements: false,
          canDragElements: false,
          canVote: false,
          canComment: false,
          canEditWorkspace: true,
          canEditResource: true,
          canTakeScreenshots: true,
        }
      case Role.CoFacilitator:
        return {
          canAddElements: false,
          canRemoveElements: false,
          canEditElements: false,
          canDragElements: false,
          canVote: false,
          canComment: false,
          canEditWorkspace: false,
          canEditResource: true,
          canTakeScreenshots: true,
        }
      case Role.TechAssistant:
        return {
          canAddElements: false,
          canRemoveElements: false,
          canEditElements: false,
          canDragElements: false,
          canVote: false,
          canComment: false,
          canEditWorkspace: false,
          canEditResource: false,
          canTakeScreenshots: false,
        }
      case Role.Observer:
        return {
          canAddElements: false,
          canRemoveElements: false,
          canEditElements: false,
          canDragElements: false,
          canVote: false,
          canComment: false,
          canEditWorkspace: false,
          canEditResource: false,
          canTakeScreenshots: true,
        }
      case Role.Participant:
        return {
          canAddElements: true,
          canRemoveElements: true,
          canEditElements: true,
          canDragElements: true,
          canVote: true,
          canComment: true,
          canEditWorkspace: false,
          canEditResource: false,
          canTakeScreenshots: false,
        }
    }
}
