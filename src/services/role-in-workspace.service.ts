import {Injectable} from '@angular/core';
import {
  CollectionReference,
  Firestore,
  addDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot, DocumentReference, doc,
} from '@angular/fire/firestore';

import RoleInWorkspace from "@interfaces/role-in-workspace.interface";
import Workspace from '@interfaces/workspace.interface';

import {Role} from "@utils/enums";

import {Observable} from "rxjs";



@Injectable({
  providedIn: 'root'
})
export default class RoleInWorkspaceService {
  private roleInWorkspaceCollection: CollectionReference<RoleInWorkspace>;

  constructor(private firestore: Firestore) {
    this.roleInWorkspaceCollection = collection(this.firestore, 'roleInWorkspace') as CollectionReference<RoleInWorkspace>
  }

  create(roleInWorkspace: RoleInWorkspace) {
    return addDoc(this.roleInWorkspaceCollection, roleInWorkspace);
  }

  getReferenceById(id: string): DocumentReference<RoleInWorkspace> {
    return doc(this.roleInWorkspaceCollection, id);
  }

  getUserWorkspacesWithRoles(userId: string): Observable<{
    type: 'added' | 'removed' | 'modified',
    workspace: DocumentReference<Workspace>,
    role: Role
  }[]> {
    const q = query(
      this.roleInWorkspaceCollection,
      where("user", "==", userId)
    );

    return new Observable((observer) => {
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const changes = querySnapshot.docChanges().map(change => ({
          type: change.type,
          workspace: change.doc.data().workspace as DocumentReference<Workspace>,
          role: change.doc.data().role as Role
        }));
        observer.next(changes);
      }, (error: Error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  async getUserRoleInWorkspace(userId: string, workspaceReference: DocumentReference<Workspace>): Promise<RoleInWorkspace> {
    const q = query(
      this.roleInWorkspaceCollection,
      where("user", "==", userId),
      where("workspace", "==", workspaceReference)
    )
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]; // Get the first matching document
      return { id: doc.id, ...doc.data() } as RoleInWorkspace;
    } else {
      throw new Error("Failed to fetch user " + userId + "role in workspace " + workspaceReference);
    }
  }
}
