import { Injectable } from '@angular/core';
import {
  CollectionReference,
  DocumentReference,
  Firestore,
  addDoc,
  collection,
  getDoc,
  docData,
  updateDoc,
  doc,
  arrayUnion,
  deleteDoc,
  deleteField,
  arrayRemove,
} from '@angular/fire/firestore';

import Element from '@interfaces/element.interface'
import Vote from '@interfaces/vote.interface';

import { Observable } from 'rxjs';

import { createDateConverter } from "@utils/timestamp";

@Injectable({
  providedIn: 'root'
})
export default class ElementService {
  private elementCollection: CollectionReference<Element>;
  private dateConverter = createDateConverter<Element>(['creationDate'])

  constructor(private firestore: Firestore) {
    this.elementCollection = collection(this.firestore, 'element')
      .withConverter(this.dateConverter) as CollectionReference<Element>;
  }

  create(element: Element): Promise<DocumentReference<Element>> {
    return addDoc(this.elementCollection, element);
  }

  delete(elementReference: DocumentReference<Element>): Promise<void> {
    return deleteDoc(elementReference);
  }

  async getByReference(elementReference: DocumentReference<Element>): Promise<Element> {
    const element = await getDoc(elementReference.withConverter(this.dateConverter));
    if (!element.exists()) {
      throw new Error(`Element with reference ${elementReference.id} does not exist.`);
    }
    return {id: element.id, ...element.data()} as Element;
  }

  getReferenceById(id: string): DocumentReference<Element> {
    return doc(this.elementCollection, id);
  }

  observeByReference(elementReference: DocumentReference<Element>): Observable<Element> {
    return docData(elementReference.withConverter(this.dateConverter), { idField: 'id' }) as Observable<Element>;
  }

  addVote(elementReference: DocumentReference, voteReference: DocumentReference<Vote>): Promise<void> {
    return updateDoc(elementReference, { votes: arrayUnion(voteReference) });
  }

  removeVote(elementReference: DocumentReference, voteReference: DocumentReference<Vote>): Promise<void> {
    return updateDoc(elementReference, { votes: arrayRemove(voteReference) });
  }

  updateContent(elementReference: DocumentReference, content: string): Promise<void> {
    return updateDoc(elementReference, { content });
  }

  updateImage(elementReference: DocumentReference, image: string): Promise<void> {
    return updateDoc(elementReference, { image });
  }

  updateAudio(elementReference: DocumentReference, audio: string): Promise<void> {
    return updateDoc(elementReference, { audio });
  }

  updateElement(elementReference: DocumentReference, element: Partial<Element>): Promise<void> {
    return updateDoc(elementReference, element);
  }

  deleteImage(elementReference: DocumentReference): Promise<void> {
    return updateDoc(elementReference, { image: deleteField() });
  }

  deleteAudio(elementReference: DocumentReference): Promise<void> {
    return updateDoc(elementReference, { audio: deleteField() });
  }
}
