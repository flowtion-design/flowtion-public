import {Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnInit} from '@angular/core';
import {TemplateCardComponent} from "@components/template-card/template-card.component";
import WorkflowTemplate from "@interfaces/workflow-template.interface";
import {FormControl, FormGroup} from "@angular/forms";
import WorkflowTemplateService from "@services/workflow-template.service";
import {CommonModule} from "@angular/common";

@Component({
  selector: 'app-workspace-template-step',
  standalone: true,
  imports: [
    CommonModule,
    TemplateCardComponent
  ],
  templateUrl: './workspace-template-step.component.html',
  styleUrl: './workspace-template-step.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WorkspaceTemplateStepComponent implements OnInit {
  @Input() form: FormGroup;
  templates: WorkflowTemplate[] = [];

  constructor(
    private workflowTemplateService: WorkflowTemplateService,
  ) {}

  ngOnInit(): void {
    this.workflowTemplateService.getAll().subscribe(templates => {
      this.templates = templates.sort((t1, t2) =>
        t1.resources.length - t2.resources.length || t2.name.localeCompare(t1.name)
      );
    });
  }

  get template(): FormControl {
    return this.form.get('template') as FormControl;
  }

  get selectedTemplate(): WorkflowTemplate {
    return this.form.get('template')?.value || null;
  }

  selectTemplate(template: WorkflowTemplate) {
    this.form.get('template')?.setValue(template)
  }
}
