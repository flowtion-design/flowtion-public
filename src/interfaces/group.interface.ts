import {DocumentReference} from "@angular/fire/firestore";
import User from "./user.interface";
import Element from "./element.interface";

export default interface Group {
  id?: string;
  participants: DocumentReference<User>[];
  elements: DocumentReference<Element>[];
}
