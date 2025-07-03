import {Component, Input, OnChanges, SimpleChanges, ViewChild} from '@angular/core';
import Field from "@interfaces/field.interface";
import {FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatStepper, MatStepperModule} from "@angular/material/stepper";
import {CommonModule} from "@angular/common";
import {MatFormFieldModule} from "@angular/material/form-field";
import WorkflowTemplate from "@interfaces/workflow-template.interface";
import ResourceTemplate from "@interfaces/resource-template.interface";
import ResourceTemplateService from "@services/resource-template.service";
import {MatSelectModule} from "@angular/material/select";
import {MatOptionModule} from "@angular/material/core";
import {MatInputModule} from "@angular/material/input";


@Component({
  selector: 'app-workspace-resources-step',
  standalone: true,
  imports: [CommonModule, MatStepperModule, MatFormFieldModule, ReactiveFormsModule, MatSelectModule, MatOptionModule, MatInputModule],
  templateUrl: './workspace-resources-step.component.html',
  styleUrl: './workspace-resources-step.component.scss'
})
export class WorkspaceResourcesStepComponent implements OnChanges {
  @Input() form: FormGroup;
  @Input() template: WorkflowTemplate;
  @ViewChild('resourcesStepper') resourcesStepper: MatStepper;

  resourceTemplates: ResourceTemplate[] = [];

  constructor(
    private resourceTemplateService: ResourceTemplateService,
    private fb: FormBuilder
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['template'] && this.template) {
      this.loadResourceTemplates();
    }
  }

  private loadResourceTemplates(): void {
    const resourceTemplates = this.template.resources.map(resourceTemplateReference => {
      return this.resourceTemplateService.getByReference(resourceTemplateReference)
    })

    Promise.all(resourceTemplates)
      .then(resourceTemplates => {
        this.resourceTemplates = resourceTemplates;
        this.createResourceForms()

      })
      .catch(error => {
        console.log("Failed to retrieve resource templates:", error);
      })
  }

  private createResourceForms() {
    this.form.removeControl('resources')
    this.form.addControl("resources", this.fb.array(this.resourceTemplates
      .map(resource => this.createResourceForm(resource))))
  }

  private createResourceForm(resource: ResourceTemplate): FormGroup {
    const group = this.fb.group({});

    // Add required fields
    for (let field of Object.keys(resource.requiredFields)) {
      if (field.startsWith("numberOfRotations") || field.startsWith("totalVotes")) {
        group.addControl(field, this.fb.control({value: 1, disabled: false}));
      } else {
        group.addControl(field, this.fb.control(null, Validators.required));
      }
    }

    // Add optional fields
    for (let field of Object.keys(resource.optionalFields)) {
      if (field.startsWith("timer")) {
        group.addControl(field, this.fb.control({value: 'NO_TIMER', disabled: true}));
      } else {
        group.addControl(field, this.fb.control(null));
      }
    }
    return group;
  }

  get resources(): FormArray {
    return this.form.get('resources') as FormArray;
  }

  getResourceFormGroup(index: number): FormGroup {
    return this.resources.at(index) as FormGroup;
  }

  getResourceKeys(fields: Map<String, Field>): string[] {
    return Object.entries(fields)
      .sort((a: [string, Field], b: [string, Field]) => (a[1].order ?? 0) - (b[1].order ?? 0))
      .map(entry => entry[0]);
  }

  getFieldObject(fields: Map<String, Field>, fieldName: string): Field {
    // @ts-ignore
    return fields[fieldName];
  }

}
