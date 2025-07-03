import { Injectable } from '@angular/core';
import { CollectionReference, Firestore, addDoc, collection, getDoc, DocumentReference, docData, doc, deleteDoc} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import Vote from 'src/interfaces/vote.interface';

@Injectable({
  providedIn: 'root'
})
export default class VoteService {
  private voteCollection: CollectionReference<Vote>;

  constructor(private firestore: Firestore) {
    this.voteCollection = collection(this.firestore, 'vote') as CollectionReference<Vote>;
  }

  create(vote: Vote): Promise<DocumentReference<Vote>> {
    return addDoc(this.voteCollection, vote);
  }

  delete(voteReference: DocumentReference<Vote>): Promise<void> {
    return deleteDoc(voteReference);
  }

  async getByReference(voteReference: DocumentReference<Vote>): Promise<Vote> {
    const vote = await getDoc(voteReference);
    if (!vote.exists()) {
      throw new Error(`Vote with reference ${voteReference.id} does not exist.`);
    }
    return {id: vote.id, ...vote.data()} as Vote;
  }

  getReferenceById(id: string): DocumentReference<Vote> {
    return doc(this.voteCollection, id);
  }

  observeByReference(voteReference: DocumentReference<Vote>): Observable<Vote> {
    return docData(voteReference, { idField: 'id' }) as Observable<Vote>;
  }

  deleteById(id: string) {
    const voteRef = this.getReferenceById(id)
    return deleteDoc(voteRef)
  }
}
