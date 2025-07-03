import {DocumentReference} from "@angular/fire/firestore";
import Resource from "./resource.interface";
import Group from "./group.interface";

export default interface Workspace {
    id?: string;
    name: string;
    description: string;
    resources: DocumentReference<Resource>[]
    groups: DocumentReference<Group>[]
    isVisible: boolean;
    image: string;
    templateName: string;
    creationDate: Date;
    activeResourceIndex: number;
    persistentResourceIndexes: number[];
}
