import {
  CollectionReference,
  Firestore,
  collection,
  collectionData,
  setDoc,
  getDoc,
  doc,
  DocumentReference,
} from '@angular/fire/firestore';

import { Injectable } from '@angular/core';
import User from "src/interfaces/user.interface";
import {BehaviorSubject, Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export default class UserService {
  private userCollection: CollectionReference<User>;
  private collectionName: string = 'user'
  private readonly USER_KEY = 'currentUser';
  private userSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());


  constructor(private firestore: Firestore) {
    this.userCollection = collection(this.firestore, this.collectionName) as CollectionReference<User>;
  }

  create(user: User, userId: string) {
    return setDoc(doc(this.userCollection, userId), user);
  }

  getReferenceById(id: string): DocumentReference<User> {
    return doc(this.userCollection, id);
  }

  async getByReference(userReference: DocumentReference<User>): Promise<User> {
    const user = await getDoc(userReference);
    if (!user.exists()) {
      throw new Error(`User with reference ${userReference.id} does not exist.`);
    }
    return {id: user.id, ...user.data()} as User;
  }

  getAll(): Observable<User[]> {
    return collectionData(this.userCollection, {
      idField: 'id'
    });
  }

  getUserObservable(): Observable<User | null> {
    return this.userSubject.asObservable();
  }

  getUserFromStorage(): User | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  getUserIdFromStorage(): string | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user).id : null;
  }

  updateUserFromStorage(userId: string | undefined) {
    if (userId) {
      const userReference = this.getReferenceById(userId);
      this.getByReference(userReference)
        .then((user) => {
          console.debug("Updated user in storage", user);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          this.userSubject.next(user);
        })
        .catch((error) => {
          console.error("Error updating user in storage", error);
          localStorage.removeItem(this.USER_KEY);
          this.userSubject.next(null);
        })
    } else {
      localStorage.removeItem(this.USER_KEY);
      this.userSubject.next(null);
    }

  }

  async isFacilitator(id: string) {
    const user = await this.getByReference(this.getReferenceById(id));
    return user.facilitator;
  }
}
