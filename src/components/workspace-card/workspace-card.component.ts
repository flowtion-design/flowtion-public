import {Component, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatCardModule} from "@angular/material/card";
import Workspace from "src/interfaces/workspace.interface";
import StorageService from 'src/services/storage.service';

@Component({
  selector: 'app-workspace-card',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './workspace-card.component.html',
  styleUrls: ['./workspace-card.component.scss']
})
export class WorkspaceCardComponent implements OnInit {

  @Input() workspace: Workspace;
  arcUrl: string | undefined;

  constructor(private storageService: StorageService) {}

  async ngOnInit() {
    try {
      this.arcUrl = await this.storageService.getArcUrl();
    } catch (e) {
      this.arcUrl = undefined;
    }
  }

  //https://codepen.io/seyedi/pen/zYoeLEv

}
