import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import UserService from '@services/user.service';
import User from 'src/interfaces/user.interface';
import { LoginComponent } from '@components/login/login.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private router: Router
  ) {}

  user: User | null = null;

  ngOnInit(): void {
    this.userService.getUserObservable().subscribe((user) => {
      this.user = user;
    })
  }

  openLoginModal(): void {
      const dialogRef = this.dialog.open(LoginComponent);

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          if (result.type == 'success') {
            this.router.navigate(['dashboard'])
          }
          this.snackBar.open(result.message, "x", {
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
            duration: 4000,
            panelClass: result.type
          });
        }
      });
    }
}
