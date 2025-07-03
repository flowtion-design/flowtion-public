import { Injectable } from "@angular/core";
import { addDoc, collection, CollectionReference, doc, DocumentReference, Firestore, getDoc, onSnapshot, query, where } from "@angular/fire/firestore";
import WorkspaceSummary from "@interfaces/workspace-summary.interface";
import Workspace from "@interfaces/workspace.interface";
import { Observable } from "rxjs";
import {createDateConverter} from "@utils/timestamp";

@Injectable({
  providedIn: 'root'
})
export default class WorkspaceSummaryService {
  private workspaceSummaryCollection: CollectionReference<WorkspaceSummary>;
  private dateConverter = createDateConverter<WorkspaceSummary>(['time'])

  constructor(private firestore: Firestore) {
    this.workspaceSummaryCollection = collection(this.firestore, 'workspaceSummary')
      .withConverter(this.dateConverter) as CollectionReference<WorkspaceSummary>
  }

  create(object: WorkspaceSummary): Promise<DocumentReference<WorkspaceSummary>> {
    return addDoc(this.workspaceSummaryCollection, object);
  }

  getReferenceById(id: string): DocumentReference<WorkspaceSummary> {
    return doc(this.workspaceSummaryCollection, id);
  }

  async getByReference(workspaceSummaryReference: DocumentReference<WorkspaceSummary>): Promise<WorkspaceSummary> {
    const workspaceSummary = await getDoc(workspaceSummaryReference.withConverter(this.dateConverter));
    if (!workspaceSummary.exists()) {
      throw new Error(`Workspace Summary with reference ${workspaceSummaryReference.id} does not exist.`);
    }
    return {id: workspaceSummary.id, ...workspaceSummary.data()} as WorkspaceSummary;
  }

  getWorkspaceSummaryByWorkspace(workspaceReference: DocumentReference<Workspace>): Observable<WorkspaceSummary[]> {
  const q = query(
    this.workspaceSummaryCollection,
    where("workspace", "==", workspaceReference)
  );

  return new Observable<WorkspaceSummary[]>(observer => {
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const summaries: WorkspaceSummary[] = [];
      querySnapshot.forEach(doc => {
        summaries.push({ id: doc.id, ...doc.data() } as WorkspaceSummary);
      });
      observer.next(summaries);
    }, error => {
      observer.error(error);
    });

    return () => unsubscribe();
  });
}
}
