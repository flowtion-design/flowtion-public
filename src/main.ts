// Angular Core & Common
import { inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { withComponentInputBinding, provideRouter, Router, Routes } from '@angular/router';

// Firebase
import { provideAuth, getAuth } from '@angular/fire/auth';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

// Components
import { AppComponent } from '@app/app.component';
import { HomeComponent } from '@pages/home/home.component';
import { NotFoundComponent } from "@pages/not-found/not-found.component";
import { DashboardComponent } from '@pages/dashboard/dashboard.component';
import { ForbiddenComponent } from '@pages/forbidden/forbidden.component';
import { UserProfileComponent } from '@pages/user-profile/user-profile.component';
import { WhiteBoardComponent } from "@pages/white-board/white-board.component";
import { WorkspaceDashboardComponent } from "@pages/workspace-dashboard/workspace-dashboard.component";

// Services
import UserService from "@services/user.service";
import AuthenticationService from '@services/authentication.service';

// Environment
import { environment } from '@environments/environment';

// Third Party Libraries
import { tap } from 'rxjs/operators';
import { register as registerSwiperElements } from 'swiper/element/bundle';


const isLoggedIn = () => {
  const router = inject(Router);
  const service = inject(AuthenticationService)
  return service.getAuthState().pipe(
    tap((user) => {
      return !user ? router.navigate(['/']) : true
    })
  )
}

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [isLoggedIn], pathMatch: 'full' },
  { path: 'workspace/:workspaceId', component: WorkspaceDashboardComponent, canActivate: [isLoggedIn], pathMatch: 'full' },
  { path: 'resource/:workspaceId', component: WhiteBoardComponent, canActivate: [isLoggedIn], pathMatch: 'full' },
  { path: 'forbidden', component: ForbiddenComponent, pathMatch: 'full' },
  { path: 'not-found', component: NotFoundComponent, pathMatch: 'full' },
  { path: '**', redirectTo: '/not-found' }
];

registerSwiperElements();

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding()),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth())

  ]
}).catch((err) => console.log(err));
