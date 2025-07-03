import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import WorkflowTemplate from 'src/interfaces/workflow-template.interface';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-template-card',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './template-card.component.html',
  styleUrls: ['./template-card.component.scss']
})
export class TemplateCardComponent {
  @Input() template: WorkflowTemplate;
  @Input() selected: boolean = false;
  @Input() disabled: boolean = false;
}
