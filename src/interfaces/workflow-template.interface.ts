import ResourceTemplate from "./resource-template.interface";
import { DocumentReference } from "@angular/fire/firestore";

export default interface WorkflowTemplate {
    id?: string;
    name: string;
    description: string;
    image: string;
    resources: DocumentReference<ResourceTemplate>[];
    persistentResourceIndexes: number[];
}
