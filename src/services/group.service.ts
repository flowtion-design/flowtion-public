import {
  CollectionReference,
  Firestore,
  addDoc,
  collection,
  DocumentReference,
  docData,
  updateDoc, arrayUnion, doc, getDoc,
  arrayRemove
} from '@angular/fire/firestore';

import { Injectable } from '@angular/core';
import {Observable} from "rxjs";
import Group from "src/interfaces/group.interface";
import Element from "src/interfaces/element.interface";
import User from "../interfaces/user.interface";

@Injectable({
  providedIn: 'root'
})
export default class GroupService {
  private groupCollection: CollectionReference<Group>;

  constructor(private firestore: Firestore) {
    this.groupCollection = collection(this.firestore, 'group') as CollectionReference<Group>
  }

  create(group: Group) {
    return addDoc(this.groupCollection, group);
  }

  getReferenceById(id: string): DocumentReference<Group> {
    return doc(this.groupCollection, id);
  }

  async getByReference(groupReference: DocumentReference<Group>): Promise<Group> {
    const group = await getDoc(groupReference);
    if (!group.exists()) {
      throw new Error(`User with reference ${groupReference.id} does not exist.`);
    }
    return {id: group.id, ...group.data()} as Group;
  }

  observeByReference(groupReference: DocumentReference<Group>): Observable<Group> {
    return docData(groupReference, { idField: 'id' }) as Observable<Group>;
  }

  addElement(groupReference: DocumentReference<Group>, elementReference: DocumentReference<Element>) {
    return updateDoc(groupReference, {elements: arrayUnion(elementReference)});
  }

  removeElement(groupReference: DocumentReference<Group>, elementReference  : DocumentReference<Element>) {
    return updateDoc(groupReference, {elements: arrayRemove(elementReference)});
  }

  async getUserGroupInWorkspace(userReference: DocumentReference<User>, groupReferences: DocumentReference<Group>[]): Promise<Group> {
    for (let groupReference of groupReferences) {
      const groupSnapshot = await getDoc(groupReference);
      if (groupSnapshot.exists()) {
        const group = { id: groupSnapshot.id, ...groupSnapshot.data() } as Group;
        if (group.participants.map(participant => participant.path).includes(userReference.path)) {
          return group;
        }
      }
    }

    throw new Error(`User ${userReference.id} is not part of any group in this workspace.`);
  }
}
