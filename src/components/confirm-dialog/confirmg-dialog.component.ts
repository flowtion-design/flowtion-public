import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {MatButtonModule} from "@angular/material/button";


@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})

export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string, cancelText?: string, confirmText?: string, confirmResult?: any, cancelResult?: any }
  ) {}

  cancel(): void {
    this.dialogRef.close(this.data.cancelResult !== undefined ? this.data.cancelResult : false);
  }

  confirm(): void {
    this.dialogRef.close(this.data.confirmResult !== undefined ? this.data.confirmResult : true);
  }
}
