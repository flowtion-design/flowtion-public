import { Component, ElementRef, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { BehaviorSubject, combineLatest, Observable, startWith } from 'rxjs';
import { map } from 'rxjs/operators';
import User from '@interfaces/user.interface';
import {participantsPerGroupValidator} from "@utils/validations";

@Component({
  selector: 'app-workspace-groups-step',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatChipsModule,
    MatIconModule,
    MatAutocompleteModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './workspace-groups-step.component.html',
  styleUrl: './workspace-groups-step.component.scss',
})
export class WorkspaceGroupsStepComponent implements OnInit {
  @Input() form!: FormGroup;
  @Input() minParticipants!: number;
  @Input() maxParticipants!: number;

  @ViewChildren('participantInput') participantInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private _possibleParticipants$ = new BehaviorSubject<User[]>([]);

  @Input() set possibleParticipants(value: User[]) {
    this._possibleParticipants$.next(value || []);
  }

  participantInputControl: FormControl[] = [];
  filteredParticipants: Observable<User[]>[] = [];

  ngOnInit(): void {
    const initialGroup = this.groups.at(0);
    this.participantInputControl.push(
      new FormControl({ value: '', disabled: initialGroup.value.length >= this.maxParticipants })
    );

    this.filteredParticipants.push(
      this.createFilteredObservable(this.participantInputControl[0])
    );
  }

  private createFilteredObservable(control: FormControl): Observable<User[]> {
    return combineLatest([
      control.valueChanges.pipe(startWith('')),
      this._possibleParticipants$,
    ]).pipe(
      map(([inputValue, participants]) => this._filter(participants, inputValue))
    );
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

  get groups(): FormArray {
    return this.form.get('groups') as FormArray;
  }

  get participantControls(): FormControl[] {
    return this.participantInputControl;
  }

  getGroupFormGroup(index: number): FormControl<User[]> {
    return this.groups.at(index) as FormControl<User[]>;
  }

  addGroup(): void {
    this.groups.push(new FormControl([], participantsPerGroupValidator(this.minParticipants, this.maxParticipants)));

    const lastGroup = this.groups.at(this.groups.length - 1);
    const control = new FormControl({value: '', disabled: lastGroup.value.length >= this.maxParticipants});
    this.participantInputControl.push(control);
    this.filteredParticipants.push(this.createFilteredObservable(control));
  }

  onParticipantSelected(participant: User, groupIndex: number): void {
    const group = this.groups.at(groupIndex).value as User[];
    if (group.length < this.maxParticipants && !this.isParticipantSelected(participant)) {
      group.push(participant);
      this.groups.at(groupIndex).setValue(group);
    }
    this.clearParticipantInput(groupIndex);
  }

  isParticipantSelected(participant: User): boolean {
    return this.groups.controls.some((group) =>
      (group.value as User[]).some((p) => p.id === participant.id)
    );
  }

  removeParticipant(groupIndex: number, participantIndex: number): void {
    const group = this.groups.at(groupIndex).value as User[];
    group.splice(participantIndex, 1);
    this.groups.at(groupIndex).setValue(group);
  }

  removeGroup(index: number): void {
    if (this.groups.length > 1) {
      this.groups.removeAt(index);
      this.participantInputControl.splice(index, 1);
      this.filteredParticipants.splice(index, 1);
    }
  }

  clearParticipantInput(groupIndex: number): void {
    const input = this.participantInputs?.toArray()[groupIndex];
    if (input) {
      input.nativeElement.value = '';
      this.participantInputControl[groupIndex].setValue('');
    }
  }

  onInputBlur(groupIndex: number): void {
    setTimeout(() => {
      this.clearParticipantInput(groupIndex);
    }, 200);
  }
}
