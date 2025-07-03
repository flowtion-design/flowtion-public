import {
  Component,
  ElementRef,
  Input,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatFormFieldModule
} from '@angular/material/form-field';
import {
  MatChipsModule
} from '@angular/material/chips';
import {
  MatIconModule
} from '@angular/material/icon';
import {
  MatAutocompleteModule
} from '@angular/material/autocomplete';
import {
  MatInputModule
} from '@angular/material/input';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  startWith
} from 'rxjs';
import {
  map
} from 'rxjs/operators';
import {
  CommonModule
} from '@angular/common';
import User from '@interfaces/user.interface';


type HelperRole = 'coFacilitators' | 'techAssistants' | 'observers';

@Component({
  selector: 'app-workspace-helpers-step',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatChipsModule,
    MatIconModule,
    MatAutocompleteModule,
    MatInputModule,
  ],
  templateUrl: './workspace-helpers-step.component.html',
  styleUrl: './workspace-helpers-step.component.scss',
})
export class WorkspaceHelpersStepComponent implements OnInit {
  @Input() form!: FormGroup;

  private _possibleParticipants$ = new BehaviorSubject<User[]>([]);

  @Input() set possibleParticipants(value: User[]) {
    this._possibleParticipants$.next(value || []);
  }

  @ViewChildren('helperInput')
  helperInputs!: QueryList<ElementRef<HTMLInputElement>>;

  roles: HelperRole[] = ['coFacilitators', 'techAssistants', 'observers'];

  roleLabels: Record<HelperRole, string> = {
    coFacilitators: 'Co-facilitadores',
    techAssistants: 'Asistente técnico',
    observers: 'Observadores',
  };

  roleNames: Record<HelperRole, string> = {
    coFacilitators: 'Co-facilitador',
    techAssistants: 'Asistente técnico',
    observers: 'Observador',
  };

  helperInputControl: Record<HelperRole, FormControl> = {
    coFacilitators: new FormControl(),
    techAssistants: new FormControl({ value: null, disabled: true }),
    observers: new FormControl(),
  };

  filteredHelpers: Record<HelperRole, Observable<User[]>> = {
    coFacilitators: new Observable<User[]>(),
    techAssistants: new Observable<User[]>(),
    observers: new Observable<User[]>(),
  };

  ngOnInit(): void {
    this.roles.forEach((role) => {
      this.filteredHelpers[role] = combineLatest([
        this.helperInputControl[role].valueChanges.pipe(startWith('')),
        this._possibleParticipants$,
      ]).pipe(
        map(([inputValue, participants]) =>
          this._filter(participants, inputValue)
        )
      );
    });
    this.helperInputControl.techAssistants.disable();
  }

  private _filter(participants: User[], value: any): User[] {
    let filterValue = '';
    if (typeof value === 'string') {
      filterValue = value.toLowerCase();
    }

    return participants.filter((p) =>
      p.displayName?.toLowerCase().includes(filterValue) && p.displayName?.startsWith("Usuario")
    ).sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));
  }

  get helpers(): FormGroup {
    return this.form.get('helpers') as FormGroup;
  }

  onHelperSelected(helper: User, role: HelperRole): void {
    const current = (this.helpers.get(role)?.value || []) as User[];

    if (!this.isHelperSelected(helper, role)) {
      this.helpers.get(role)?.setValue([...current, helper]);
    }

    this.clearHelperInput(role);
  }

  isHelperSelected(helper: User, role: HelperRole): boolean {
    const currentList = (this.helpers.get(role)?.value || []) as User[];
    return currentList.some((p) => p.id === helper.id);
  }

  removeHelper(role: HelperRole, helperIndex: number): void {
    const usersInRole = (this.helpers.get(role)?.value || []) as User[];
    usersInRole.splice(helperIndex, 1);
    this.helpers.get(role)?.setValue(usersInRole);
  }

  clearHelperInput(role: HelperRole): void {
    const input = this.helperInputs.toArray()[this.roles.indexOf(role)];
    if (input) {
      input.nativeElement.value = '';
      this.helperInputControl[role].setValue('');
    }
  }

  onInputBlur(role: HelperRole): void {
    setTimeout(() => {
      this.clearHelperInput(role);
    }, 200);
  }
}
