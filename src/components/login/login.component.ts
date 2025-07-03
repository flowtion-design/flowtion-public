import { Component } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import AuthenticationService from 'src/services/authentication.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    ReactiveFormsModule,
    NgIf,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  constructor(
    private authenticationService: AuthenticationService,
    public dialogRef: MatDialogRef<LoginComponent>,
  ) {}

  hidePassword = true;
  hideConfirmPassword = true;
  active: boolean = false;
  disableRegisterAndGoogle: boolean = false;

  passwordMatchingValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password?.value !== confirmPassword?.value) {
      confirmPassword?.setErrors({'notmatched': true})
    }
    return null

  }

  signInFormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  signUpFormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.pattern('^(?=.*\\d)(?=.*[a-z])(?=.*[a-zA-Z0-9]).{8,}$')]),
    confirmPassword: new FormControl('', [Validators.required]),
    image: new FormControl<File | null>(null, [])
  }, {validators: this.passwordMatchingValidator});

  activeForm: FormGroup<any> = this.signInFormGroup;

  switchPanel() {
    this.active = !this.active
    this.signInFormGroup.reset()
    this.signUpFormGroup.reset()
    if (this.active) {
      this.activeForm = this.signUpFormGroup;
    } else {
      this.activeForm = this.signInFormGroup;
    }
  }

  getNameErrorMessage() {
    return this.activeForm.get('email')?.hasError('required') ? 'El campo es obligatorio' : '';
  }

  getEmailErrorMessage() {
    if (this.activeForm.get('email')?.hasError('required')) {
      return 'El campo es obligatorio';
    }
    return this.activeForm.get('email')?.hasError('email') ? 'El email ingresado no es válido' : '';
  }

  getPasswordErrorMessage() {
    if (this.activeForm.get('password')?.hasError('required')) {
      return 'El campo es obligatorio';
    }
    if (this.activeForm.get('password')?.hasError('minlength')) {
      return 'Debe tener al menos 8 caracteres';
    }
    return this.activeForm.get('password')?.hasError('pattern') ? 'Al menos una letra y un número' : '';
  }

  getConfirmPasswordErrorMessage() {
    if (this.activeForm.get('confirmPassword')?.hasError('required')) {
      return 'El campo es obligatorio';
    }
    return this.activeForm.get('confirmPassword')?.hasError('notmatched') ? 'Las contraseñas no coinciden' : '';
  }

  getImage(): string | null {
    const image = this.signUpFormGroup.get('image')?.value;
    if (image instanceof File) {
      return URL.createObjectURL(image);
    }
    return null;
  }

  onFileChange(event: any) {
    const files = event.target.files as FileList;

    if (files.length > 0) {
      const file = files[0];
      this.signUpFormGroup.patchValue({image: file})
      this.resetInput();
    }
  }

  resetInput(){
    const input = document.getElementById('avatar-input-file') as HTMLInputElement;
    if(input){
      input.value = "";
    }
  }

  toggleFileAction(event: Event): void {
    if (this.signUpFormGroup.get('image')?.value) {
      this.signUpFormGroup.patchValue({image: null});
      event.preventDefault();
    }
  }

  logInWithGoogle() {
    this.authenticationService.signInWithGoogle()
      .then((user) => {
        this.dialogRef.close({message: "Ha iniciado sesión correctamente", type: "success"});
      })
      .catch((error) => {
        this.dialogRef.close({message: "Error al iniciar sesión con Google", type: "error"});
      })
  }

  signUp() {
    if(this.active && this.activeForm.valid) {
      const data = this.activeForm.getRawValue()
      this.authenticationService.signUp(data.email!, data.password!, data.name!, data.image!)
      .then((user) => {
        this.dialogRef.close({message: "Se ha registrado e iniciado sesión correctamente", type: "success"});
      })
      .catch((error) => {
        // https://firebase.google.com/docs/reference/js/auth?hl=es#autherrorcodes
        this.dialogRef.close({message: "Error al registrarse", type: "error"})
      })
    } else {
      this.activeForm.markAllAsTouched()
    }
  }

  signIn() {
    if((!this.active) && this.activeForm.valid) {
      const data = this.activeForm.getRawValue()
      this.authenticationService.signIn(data.email!, data.password!)
      .then((user) => {
        this.dialogRef.close({message: "Ha iniciado sesión correctamente", type: "success"});
      })
      .catch((error) => {
        this.dialogRef.close({message: "Error al iniciar sesión", type: "error"})
      })
    } else {
      this.activeForm.markAllAsTouched()
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
