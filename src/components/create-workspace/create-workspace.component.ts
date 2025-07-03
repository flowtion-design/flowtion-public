// Angular Core & Common
import {Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from "@angular/forms";

// Angular Material
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatChipsModule } from "@angular/material/chips";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";
import { MatSelectModule } from "@angular/material/select";
import { MatGridListModule } from "@angular/material/grid-list";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatStepper, MatStepperModule } from "@angular/material/stepper";
import { MatDialogRef, MatDialogModule, MatDialog } from "@angular/material/dialog";
import { CdkStepper, STEPPER_GLOBAL_OPTIONS, StepperSelectionEvent } from '@angular/cdk/stepper';

// Services
import UserService from "@services/user.service";
import GroupService from "@services/group.service";
import ResourceService from "@services/resource.service";
import WorkspaceService from "src/services/workspace.service";
import AuthenticationService from "@services/authentication.service";
import RoleInWorkspaceService from "@services/role-in-workspace.service";
import ResourceTemplateService from "@services/resource-template.service";

// Interfaces
import User from "@interfaces/user.interface";
import Resource from "@interfaces/resource.interface";
import Workspace from "@interfaces/workspace.interface";
import RoleInWorkspace from "@interfaces/role-in-workspace.interface";
import WorkflowTemplate from '@interfaces/workflow-template.interface';

// Components
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirmg-dialog.component";
import { WorkspaceInfoStepComponent } from "@components/create-workspace/steps/workspace-info-step/workspace-info-step.component";
import { WorkspaceGroupsStepComponent } from "@components/create-workspace/steps/workspace-groups-step/workspace-groups-step.component";
import { WorkspaceHelpersStepComponent } from "@components/create-workspace/steps/workspace-helpers-step/workspace-helpers-step.component";
import { WorkspaceTemplateStepComponent } from "@components/create-workspace/steps/workspace-template-step/workspace-template-step.component";
import { WorkspaceResourcesStepComponent } from "@components/create-workspace/steps/workspace-resources-step/workspace-resources-step.component";

// Utils
import {ResourceStatus, Role} from "@utils/enums";
import {groupsValidator, participantsPerGroupValidator} from "@utils/validations";

interface HelpersFormGroup {
  coFacilitators: FormControl<User[]>;
  techAssistants: FormControl<User[]>;
  observers: FormControl<User[]>;
}

export interface WorkspaceForm {
  name: FormControl<string>;
  description: FormControl<string>;
  helpers: FormGroup<HelpersFormGroup>;
  groups: FormArray<FormControl<User[]>>;
  template: FormControl<WorkflowTemplate | null>;
  resources: FormControl<Resource[]>;
}

@Component({
  selector: 'app-create-workspace',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatGridListModule, MatStepperModule, MatButtonModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, MatIconModule, WorkspaceInfoStepComponent, WorkspaceHelpersStepComponent, WorkspaceGroupsStepComponent, WorkspaceTemplateStepComponent, WorkspaceResourcesStepComponent],
  providers: [
    {
      provide: CdkStepper,
      useClass: CdkStepper
    },
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: {displayDefaultIndicatorType: false},
    }
  ],
  templateUrl: './create-workspace.component.html',
  styleUrls: ['./create-workspace.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CreateWorkspaceComponent implements OnInit {

  @ViewChild('stepper') stepper: MatStepper;
  @ViewChild(WorkspaceGroupsStepComponent) groupsStepComponent!: WorkspaceGroupsStepComponent;


  form: FormGroup;
  possibleParticipants: User[] = [];
  colors: string[] = [
    '#6EB5FF',
    '#C6A3FF',
    '#FFAD60',
    '#E3D1FF',
    '#FFD7B3'
  ];
  minParticipants: number = 2;
  maxParticipants: number = 10;
  minGroups: number = 1;
  maxGroups: number = 10;
  visitedSteps: boolean[] = [];

  constructor(
    public dialogRef: MatDialogRef<CreateWorkspaceComponent>,
    private resourceTemplateService: ResourceTemplateService,
    private roleInWorkspaceService: RoleInWorkspaceService,
    private authenticationService: AuthenticationService,
    private workspaceService: WorkspaceService,
    private resourceService: ResourceService,
    private groupService: GroupService,
    private userService: UserService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.dialogRef.backdropClick().subscribe(() => this.attemptClose());
    this.dialogRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape') {
        this.attemptClose();
      }
    });

    this.form = this.fb.group<WorkspaceForm>({
      name: this.fb.control<string>("", {
        validators: [Validators.required, Validators.maxLength(100)],
        nonNullable: true
      }),
      description: this.fb.control<string>("", {
        validators: [Validators.required],
        nonNullable: true
      }),
      helpers: this.fb.group<HelpersFormGroup>({
        coFacilitators: this.fb.control<User[]>([], { nonNullable: true }),
        techAssistants: this.fb.control<User[]>([], { nonNullable: true }),
        observers: this.fb.control<User[]>([], { nonNullable: true }),
      }),
      groups: this.fb.array<FormControl<User[]>>(
        [
          this.fb.control<User[]>([], {
            nonNullable: true,
            validators: participantsPerGroupValidator(this.minParticipants, this.maxParticipants)
          }),
        ],
        { validators: [groupsValidator(this.minGroups, this.maxGroups)] }
      ) as FormArray<FormControl<User[]>>,
      template: this.fb.control<WorkflowTemplate | null>(null, {
        validators: [Validators.required]
      }),
      resources: this.fb.control<Resource[]>([], {
        validators: [Validators.required],
        nonNullable: true
      }),
    });

    this.userService.getAll().subscribe(
      users => {
        this.possibleParticipants = users.filter(user => user.id !== this.authenticationService.getCurrentUser()?.uid!);
      }
    )

    this.visitedSteps = Array(5).fill(false);
    this.visitedSteps[0] = true;
  }

  onStepChange(event: StepperSelectionEvent) {
    this.visitedSteps[event.selectedIndex] = true;
  }

  get name(): FormControl<string> {
    return this.form.get('name') as FormControl<string>;
  }

  get description(): FormControl<string> {
    return this.form.get('description') as FormControl<string>;
  }

  get helpers(): FormGroup<HelpersFormGroup> {
    return this.form.get('helpers') as FormGroup<HelpersFormGroup>;
  }

  get groups(): FormArray<FormControl<User[]>> {
    return this.form.get('groups') as FormArray<FormControl<User[]>>;
  }

  get template(): FormControl<WorkflowTemplate | null> {
    return this.form.get('template') as FormControl<WorkflowTemplate | null>;
  }

  get resources(): FormArray {
    return this.form.get('resources') as FormArray;
  }

  shouldMarkStepCompleted(stepperIndex: number): boolean {
    if (!this.visitedSteps[stepperIndex]) {
      return false;
    }
    const controls = this.getControlsForStep(stepperIndex);
    return controls.every(control => control.valid);
  }

  getControlsForStep(stepIndex: number): AbstractControl[] {
    switch (stepIndex) {
      case 0:
        return [this.name, this.description];
      case 1:
        return Object.values(this.helpers.controls);
      case 2:
        return this.groups.controls;
      case 3:
        return [this.template];
      case 4:
        return [this.resources];
      default:
        return [];
    }
  }

  goToNextStep(): void {
    const currentStepIndex = this.stepper.selectedIndex;
    const controls = this.getControlsForStep(currentStepIndex);

    // Mark all controls in the current step as touched and dirty
    controls.forEach(control => {
      control.markAsTouched();
      control.markAsDirty();
    });


    // Only proceed to next step if current step is valid
    if (controls.every(c => c.valid)) {
      this.stepper.next();
    }
  }

  createWorkspace() {
    if(this.form.valid) {
      const resourcesPromise = Promise.all(
        this.resources.value.map((resource: Resource, index: number) => {

          const cleanedResource = { ...resource };
          if (cleanedResource.timer === 'NO_TIMER') {
            delete cleanedResource.timer;
          }
          cleanedResource.resourceTemplate = this.resourceTemplateService.getReferenceById(this.template.value!.resources[index].id)
          cleanedResource.status = ResourceStatus.Waiting;
          return this.resourceService.create(cleanedResource)
        }) || []
      );

      const groupsPromise = Promise.all(
        this.groups.value.map(async (group: User[]) => {

          const participants = group.map((participant: User) =>
            this.userService.getReferenceById(participant.id!)
          )
          return await this.groupService.create({participants: participants, elements: []});
        }) || []
      );

      Promise.all([resourcesPromise, groupsPromise]).then(([resourceReferences, groupReferences]) => {
        const workspace: Workspace = {
          name: this.form.get('name')?.value,
          description: this.form.get('description')?.value,
          resources: resourceReferences,
          groups: groupReferences,
          image: this.template.value!.image,
          templateName: this.template.value!.name,
          isVisible: false,
          creationDate: new Date(),
          activeResourceIndex: 0,
          persistentResourceIndexes: this.template.value!.persistentResourceIndexes,
        }

        this.workspaceService.create(workspace).then(workspaceReference => {
          console.debug("Successfully created workspace:", workspace, workspaceReference)
          const facilitatorRole: RoleInWorkspace = {
            workspace: workspaceReference,
            role: Role.Facilitator,
            user: this.authenticationService.getCurrentUser()!.uid
          }
          const observerRoles: RoleInWorkspace[] = this.helpers.value.observers?.map((observer: User) => {
            return {
              workspace: workspaceReference,
              role: Role.Observer,
              user: observer.id!
            }
          }) || [];
          const techRoles: RoleInWorkspace[] = this.helpers.value.techAssistants?.map((techAssistant: User) => {
            return {
              workspace: workspaceReference,
              role: Role.TechAssistant,
              user: techAssistant.id!
            }
          }) || [];
          const coFacilitatorRoles: RoleInWorkspace[] = this.helpers.value.coFacilitators?.map((coFacilitator: User) => {
            return {
              workspace: workspaceReference,
              role: Role.CoFacilitator,
              user: coFacilitator.id!
            }
          }) || [];
          const participantRoles = this.groups.value.map((group: User[]) => {
            const colorOffset = Math.floor(Math.random() * this.colors.length);
            return group.map((participant: User, index: number): RoleInWorkspace => ({
              workspace: workspaceReference,
              role: Role.Participant,
              user: participant.id!,
              color: this.colors[(colorOffset + index) % this.colors.length]
            }))}
          ).flat();

          [facilitatorRole, ...participantRoles, ...observerRoles, ...techRoles, ...coFacilitatorRoles].map(role => {
            this.roleInWorkspaceService.create(role).then(roleInWorkspace => {
              console.debug("Successfully created role:", role, roleInWorkspace)
            })
          })
          this.snackBar.open("Experiencia creada exitosamente", "x", {
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
            duration: 4000,
            panelClass: 'success'
          });
        }).catch(error => {
          console.error("Failed to create workspace", error)
          this.snackBar.open("Error al crear la experiencia", "x", {
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
            duration: 4000,
            panelClass: 'error'
          });
        })
      })

      this.dialogRef.close();
    }
  }

  attemptClose() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: '¿Estás seguro de que quieres cerrar el formulario? Si lo cerras se perderán los datos cargados hasta el momento.',
        confirmText: 'No',
        cancelText: 'Si',
        confirmResult: false,
        cancelResult: true,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dialogRef.close();
      }
    });
  }
}
