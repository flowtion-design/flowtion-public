import { DocumentReference } from "@angular/fire/firestore";
import ResourceTemplate from "./resource-template.interface";
import {ResourceStatus} from "src/utils/enums";

export default interface Resource {
    id?: string;
    resourceTemplate: DocumentReference<ResourceTemplate>;
    assignment: string;
    timer?: string;
    xAxis?: string;
    yAxis?: string;
    totalVotes?: number | 'UNLIMITED_VOTES';
    numberOfRotations?: number | 'UNLIMITED_ROTATIONS';
    status: ResourceStatus;
    startTime?: Date;
    finishTime?: Date;
    stoppedAt?: Date;
    currentRotation?: number;
  }
