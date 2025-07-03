import { Injectable } from '@angular/core';
import {
  doc,
  addDoc,
  getDoc,
  collection,
  collectionData,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
} from "@angular/fire/firestore";
import ResourceTemplate from "src/interfaces/resource-template.interface";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export default class ResourceTemplateService {

  private resourceTemplateCollection: CollectionReference<ResourceTemplate>;
  private collectionName: string = 'resourceTemplate'

  constructor(private firestore: Firestore) {
    this.resourceTemplateCollection = collection(this.firestore, this.collectionName) as CollectionReference<ResourceTemplate>
  }

  create(resourceTemplate: ResourceTemplate) {
    return addDoc(this.resourceTemplateCollection, resourceTemplate);
  }

  async getByReference(resourceTemplateReference: DocumentReference<ResourceTemplate> ): Promise<ResourceTemplate> {
    const resourceTemplate = await getDoc(resourceTemplateReference);
    if (!resourceTemplate.exists()) {
      throw new Error(`Resource template with reference ${resourceTemplateReference.id} does not exist.`);
    }
    return {id: resourceTemplate.id, ...resourceTemplate.data()} as ResourceTemplate;
  }

  getReferenceById(id: string): DocumentReference<ResourceTemplate> {
    return doc(this.resourceTemplateCollection, id);
  }

  getAll(): Observable<ResourceTemplate[]> {
    return collectionData(this.resourceTemplateCollection, {
      idField: 'id'
    });
  }
}
