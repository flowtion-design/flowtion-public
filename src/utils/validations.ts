import {AbstractControl, FormArray, ValidationErrors, ValidatorFn} from "@angular/forms";

export function participantsPerGroupValidator(minParticipants: number, maxParticipants: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const participants = control.value;

    if (!Array.isArray(participants)) {
      return { invalidParticipants: true };
    }

    if (participants.length < minParticipants) {
      return { minParticipantsPerGroup: true };
    }

    if (participants.length > maxParticipants) {
      return { maxParticipantsPerGroup: true };
    }

    return null;
  };
}

export function groupsValidator(minGroups: number, maxGroups: number): ValidatorFn {
  return (control: AbstractControl) => {
    if (control instanceof FormArray) {
      const length = control.length;
      if (length < minGroups) {
        return { minGroups: { requiredMin: minGroups, actual: length } };
      }
      if (length > maxGroups) {
        return { maxGroups: { allowedMax: maxGroups, actual: length } };
      }
    }
    return null;
  };
}
