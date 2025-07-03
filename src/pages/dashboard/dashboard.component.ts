import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatGridListModule } from "@angular/material/grid-list";
import { CreateWorkspaceComponent } from 'src/components/create-workspace/create-workspace.component';
import { WorkspaceListComponent } from 'src/components/workspace-list/workspace-list.component';
import { WorkspaceFilterComponent } from "src/components/workspace-filter/workspace-filter.component";
import UserService from "src/services/user.service";
import User from 'src/interfaces/user.interface';
import { ResourceStatus } from '@utils/enums';
import {MatTooltipModule} from "@angular/material/tooltip";
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule, WorkspaceListComponent, WorkspaceFilterComponent, MatGridListModule, MatTooltipModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  protected isFacilitator: boolean;

  formData: { status: ResourceStatus, name: string};

  constructor(
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.userService.getUserObservable().subscribe((user: User | null) => {
      if (user) {
        this.isFacilitator = user.facilitator ?? false;
      }
    });
  }

  openCreateWorkspaceModal(): void {
    const dialogRef = this.dialog.open(CreateWorkspaceComponent, {
      panelClass: 'create-workspace-modal',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open(result.message, "x", {
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
          duration: 4000,
          panelClass: result.type
        });
      }
    });
  }

  onFormChange(value: { status: ResourceStatus; name: string}) {
    this.formData = value;
  }
}
