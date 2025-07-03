import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import AuthenticationService from 'src/services/authentication.service';
import { Router } from '@angular/router';
import UserService from 'src/services/user.service';
import User from 'src/interfaces/user.interface';
import {MatMenuModule} from "@angular/material/menu";


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, NgIf, MatTooltipModule, NgOptimizedImage, MatMenuModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  constructor(
    private userService: UserService,
    private authenticationService: AuthenticationService,
    private router: Router
  ) {}

  user: User | null = null;

  ngOnInit(): void {
    this.userService.getUserObservable().subscribe((user) => {
      this.user = user;
    })
  }

  logOut(): void {
    this.authenticationService.signOut().then(() => {
      this.router.navigate(['']);
    });
  }

  navigateToHome(): void {
    this.router.navigate(['']);
  }

  navigateToDashboard(): void {
    this.router.navigate(['dashboard']);
  }
}
