import { Component } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { MatMiniFabButton } from "@angular/material/button";
import { MatIcon } from "@angular/material/icon";
import { Output, EventEmitter } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { ResourceStatus } from '@utils/enums';
import {ResourceStatusLabels} from "@utils/identifiers";

@Component({
  selector: 'app-workspace-filter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatMiniFabButton,
    MatIcon,
    NgFor, MatSelectModule],
  templateUrl: './workspace-filter.component.html',
  styleUrls: ['./workspace-filter.component.scss']
})
export class WorkspaceFilterComponent {
  @Output() formChanged = new EventEmitter<{ status: ResourceStatus; name: string }>();
  protected readonly ResourceStatusLabels = ResourceStatusLabels;

  formGroup = new FormGroup({
    status: new FormControl('', []),
    name: new FormControl('', [])
  });

  sendFormChanged() {
    const formValue = { ...this.formGroup.value };
    if (formValue.status == 'all') {
      formValue.status = null;
    }
    this.formChanged.emit(formValue as { status: ResourceStatus; name: string });
  }
}
