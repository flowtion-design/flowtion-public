import {
  CollectionReference,
  Firestore,
  addDoc,
  collection,
  DocumentReference,
  updateDoc,
  docData,
  deleteField,
  doc,
  getDoc
} from '@angular/fire/firestore';

import { Injectable } from '@angular/core';
import Resource from 'src/interfaces/resource.interface';
import {ResourceStatus} from "src/utils/enums";
import {Observable} from "rxjs";
import {createDateConverter} from 'src/utils/timestamp';

@Injectable({
  providedIn: 'root'
})
export default class ResourceService {
  private resourceCollection: CollectionReference<Resource>;
  private dateConverter = createDateConverter<Resource>(['startTime', 'finishTime', 'stoppedAt'])

  constructor(private firestore: Firestore) {
    this.resourceCollection = collection(this.firestore, 'resource')
      .withConverter(this.dateConverter) as CollectionReference<Resource>
  }

  create(resource: Resource) {
    return addDoc(this.resourceCollection, resource);
  }

  observeByReference(resourceReference: DocumentReference<Resource>): Observable<Resource> {
    return docData(resourceReference.withConverter(this.dateConverter), { idField: 'id' }) as Observable<Resource>;
  }

  updateStatus(resourceReference: DocumentReference<Resource>, status: ResourceStatus) {
    const updatedResource: Partial<Resource> = { status };

    switch (status) {
      case ResourceStatus.Finished:
        updatedResource.finishTime = new Date();
        break;
      case ResourceStatus.Ongoing:
        updatedResource.startTime = new Date();
        break;
      default:
        break;
    }
    return updateDoc(resourceReference, updatedResource)
  }

  updateResource(resourceReference: DocumentReference<Resource>, fieldsToUpdate: Partial<Resource & { deleteFields?: (keyof Resource)[] }>) {
    const updateObject: any = { ...fieldsToUpdate };

    if (fieldsToUpdate.deleteFields) {
      fieldsToUpdate.deleteFields.forEach(field => {
        updateObject[field] = deleteField();
      });
      delete updateObject.deleteFields;
    }
    return updateDoc(resourceReference, updateObject);
  }

  getReferenceById(id: string): DocumentReference<Resource> {
    return doc(this.resourceCollection, id)
  }

  async getByReference(resourceReference: DocumentReference<Resource>): Promise<Resource> {
    const resource = await getDoc(resourceReference.withConverter(this.dateConverter));
    if (!resource.exists()) {
      throw new Error(`Resource with reference ${resourceReference.id} does not exist.`);
    }
    return {id: resource.id, ...resource.data()} as Resource;
  }
}
