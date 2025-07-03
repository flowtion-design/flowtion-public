import Element from "@interfaces/element.interface";
import User from "@interfaces/user.interface";
import Vote from "@interfaces/vote.interface";

export default interface PopulatedElement {
  element: Element;
  author?: User;
  votes: Vote[];
}
