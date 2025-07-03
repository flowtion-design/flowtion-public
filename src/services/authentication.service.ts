import {
  Auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  authState,
  getAdditionalUserInfo
} from '@angular/fire/auth';
import { Injectable } from '@angular/core';
import UserService from "./user.service";
import StorageService from "./storage.service";

@Injectable({
  providedIn: 'root'
})
export default class AuthenticationService {

  constructor(private auth: Auth, private userService: UserService, private storageService: StorageService) {
    this.auth.onAuthStateChanged((user) => {
      this.userService.updateUserFromStorage(user?.uid);
    })
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  signUp(email: string, password: string, displayName: string, image?: File) {
    return createUserWithEmailAndPassword(this.auth, email, password)
      .then(credentials => {
        if (image) {
          this.storageService.uploadFile(image, 'users/profilePicture', `${credentials.user.uid}`).then(
            result => {
              this.userService.create({
                displayName: displayName,
                profilePicture: result.fullPath,
                facilitator: false
              }, credentials.user.uid)
            }
          )
        } else {
          this.userService.create({
            displayName: displayName,
            facilitator: false
          }, credentials.user.uid)
        }

      });
  }

  signIn(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password)
  }

  signInWithGoogle(){
    return signInWithPopup(this.auth, new GoogleAuthProvider())
      .then(credentials => {
        const additionalInfo = getAdditionalUserInfo(credentials);
        if(additionalInfo !== null && additionalInfo.isNewUser) {
          this.userService.create({
            ...(credentials.user.displayName && { displayName: credentials.user.displayName }),
            ...(credentials.user.photoURL && { photoURL: credentials.user.photoURL }),
            facilitator: false
          }, credentials.user.uid)
        }
      });
  }

  signOut() {
    return this.auth.signOut();
  }

  getAuthState() {
    return authState(this.auth)
  }

}
