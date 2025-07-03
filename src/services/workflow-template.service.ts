import {
  CollectionReference,
  Firestore,
  addDoc,
  collection,
  collectionData,
} from '@angular/fire/firestore';

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import WorkflowTemplate from "src/interfaces/workflow-template.interface";


@Injectable({
  providedIn: 'root'
})
export default class WorkflowTemplateService {
  private templateCollection: CollectionReference<WorkflowTemplate>;

  constructor(private firestore: Firestore) {
    this.templateCollection = collection(this.firestore, 'workflowTemplate') as CollectionReference<WorkflowTemplate>;
  }

  create(object: WorkflowTemplate) {
    return addDoc(this.templateCollection, object);
  }

  getAll(): Observable<WorkflowTemplate[]> {
    return collectionData(this.templateCollection, {
      idField: 'id'
    });
  }
}
