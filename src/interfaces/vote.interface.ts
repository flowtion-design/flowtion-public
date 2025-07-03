import { DocumentReference } from "@angular/fire/firestore";
import User from "./user.interface";

export default interface Vote {
  id?: string;
  author: DocumentReference<User>;
}
