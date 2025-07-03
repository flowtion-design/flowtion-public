import { CommonModule } from "@angular/common";
import { Component, Inject } from "@angular/core";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MAT_SNACK_BAR_DATA } from "@angular/material/snack-bar";

@Component({
  standalone: true,
  selector: 'app-progress-snackbar',
  imports: [CommonModule, MatProgressBarModule],
  templateUrl: './progress-snackbar.component.html',
  styleUrl: './progress-snackbar.component.scss' 
})
export class ProgressSnackbarComponent {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: { message: string; progress: number }) {}
}