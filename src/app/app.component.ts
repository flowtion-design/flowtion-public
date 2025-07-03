// Angular Core & Common
import {AfterViewInit, Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer } from "@angular/platform-browser";

// Angular Material
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';

// Components
import { HeaderComponent } from '@components/header/header.component';
import { LoadingComponent } from "@components/loading/loading.component";

// Services
import LoadingService from "@services/loading.service";

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterModule, CommonModule, MatIconModule, HeaderComponent, LoadingComponent]
})

export class AppComponent implements AfterViewInit {
  loading$ = this.loadingService.loading$;
  loading: boolean = false;

  ngAfterViewInit() {
    this.loadingService.loading$.subscribe(value => {
      Promise.resolve().then(() => this.loading = value);
    });
  }

  constructor(
    private matIconRegistry: MatIconRegistry,
    private loadingService: LoadingService,
    private domSanitizer: DomSanitizer
  ) {
    this.matIconRegistry
      .addSvgIcon("google", this.domSanitizer.bypassSecurityTrustResourceUrl("assets/img/icons/google.svg"));
  }
}
