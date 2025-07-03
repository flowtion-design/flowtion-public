import { DocumentReference } from "@angular/fire/firestore";
import User from "./user.interface";
import Group from "./group.interface";
import Workspace from "./workspace.interface";

export default interface WorkspaceSummary {
    id?: string;
    participant?: DocumentReference<User>;
    group: DocumentReference<Group>;
    image: string;
    time: Date;
    workspace: DocumentReference<Workspace>;
    resourceTemplateName: string;
}