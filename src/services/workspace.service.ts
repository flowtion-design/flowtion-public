import { Injectable } from '@angular/core';
import {
  CollectionReference,
  DocumentReference,
  Firestore,
  addDoc,
  collection,
  getDoc,
  doc,
  docData,
  updateDoc,
} from '@angular/fire/firestore';

import Workspace from '@interfaces/workspace.interface';

import { createDateConverter } from "@utils/timestamp";

import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export default class WorkspaceService {
  private workspaceCollection: CollectionReference<Workspace>;
  private dateConverter = createDateConverter<Workspace>(['creationDate'])


  constructor(private firestore: Firestore) {
    this.workspaceCollection = collection(this.firestore, 'workspace')
      .withConverter(this.dateConverter) as CollectionReference<Workspace>;
  }

  create(object: Workspace): Promise<DocumentReference<Workspace>> {
    return addDoc(this.workspaceCollection, object);
  }

  getReferenceById(id: string): DocumentReference<Workspace> {
    return doc(this.workspaceCollection, id);
  }

  async getByReference(workspaceReference: DocumentReference<Workspace>): Promise<Workspace> {
    const workspace = await getDoc(workspaceReference.withConverter(this.dateConverter));
    if (!workspace.exists()) {
      throw new Error(`Workspace with reference ${workspaceReference.id} does not exist.`);
    }
    return {id: workspace.id, ...workspace.data()} as Workspace;
  }

  observeByReference(workspaceReference: DocumentReference<Workspace>): Observable<Workspace> {
    return docData(workspaceReference.withConverter(this.dateConverter), { idField: 'id' }) as Observable<Workspace>;
  }

  updateWorkspaceStatus(workspaceReference: DocumentReference, isVisible: boolean): Promise<void> {
    return updateDoc(workspaceReference, { isVisible });
  }

  updateActiveResourceIndex(workspaceReference: DocumentReference, activeResourceIndex: number): Promise<void> {
    return updateDoc(workspaceReference, { activeResourceIndex });
  }
}
