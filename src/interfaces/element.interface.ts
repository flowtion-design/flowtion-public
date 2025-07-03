import { DocumentReference } from "@angular/fire/firestore";
import User from "./user.interface";
import Vote from "./vote.interface";

export default interface Element {
  id?: string;
  content?: string;
  audio?: string;
  image?: string;
  author?: DocumentReference<User>;
  x: number;
  y: number;
  votes: DocumentReference<Vote>[];
  color: string;
  positioned: boolean;
  creationDate: Date;
  pageId?: string;
}
