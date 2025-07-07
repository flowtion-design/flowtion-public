import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatCardModule} from "@angular/material/card";
import Workspace from "src/interfaces/workspace.interface";

@Component({
  selector: 'app-workspace-card',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './workspace-card.component.html',
  styleUrls: ['./workspace-card.component.scss']
})
export class WorkspaceCardComponent {

  @Input() workspace: Workspace;

}
