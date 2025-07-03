import { DocumentReference } from "@angular/fire/firestore";
import Workspace from "./workspace.interface";
import { Role } from "src/utils/enums";

export default interface RoleInWorkspace {
  id?: string;
  workspace: DocumentReference<Workspace>;
  role: Role;
  user: string;
  color?: string;
}
