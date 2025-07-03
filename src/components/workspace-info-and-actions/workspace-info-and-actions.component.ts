import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, Input, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import {MatSelect, MatSelectModule} from '@angular/material/select';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogComponent } from '@components/confirm-dialog/confirmg-dialog.component';
import { ProgressSnackbarComponent } from '@components/progress-snackbar/progress-snackbar.component';
import Field from '@interfaces/field.interface';
import Group from '@interfaces/group.interface';
import ResourceTemplate from '@interfaces/resource-template.interface';
import ResourceWithTemplate from '@interfaces/resource-with-template.interface';
import Resource from '@interfaces/resource.interface';
import User from '@interfaces/user.interface';
import WorkspaceSummary from '@interfaces/workspace-summary.interface';
import Workspace from '@interfaces/workspace.interface';
import ResourceService from '@services/resource.service';
import StorageService from '@services/storage.service';
import UserService from '@services/user.service';
import WorkspaceSummaryService from '@services/workspace-summary.service';
import WorkspaceService from '@services/workspace.service';
import { ResourceStatus } from '@utils/enums';
import { DocumentReference } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import {ResourceComponent} from "@components/resource/resource.component";
import {TimerComponent} from "@components/timer/timer.component";
import {MatFormFieldModule} from "@angular/material/form-field";
import {ResourceStatusClasses, ResourceStatusLabels} from "@utils/identifiers";
import RoleConfiguration from "@interfaces/role-configuration.inteface";

function getFormattedDateFilename(): string {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}.png`;
}

function nextTicks(frames = 1): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, frames * 16));
}

@Component({
  selector: 'app-workspace-info-and-actions',
  standalone: true,
  imports: [
    MatTooltipModule,
    FormsModule,
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    ResourceComponent,
    TimerComponent,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './workspace-info-and-actions.component.html',
  styleUrl: './workspace-info-and-actions.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WorkspaceInfoAndActionsComponent {
  @Input() workspace: Workspace;
  @Input() workspaceReference: DocumentReference<Workspace>;
  @Input() resourcesWithTemplates: ResourceWithTemplate[] = [];
  @Input() roleConfiguration: RoleConfiguration;
  isAssignmentEditing = false;
  isNumberOfRotationsEditing = false;
  isXAxisEditing = false;
  isYAxisEditing = false;
  isTotalVotesEditing = false;
  @Input() participantsByGroup: Map<DocumentReference<Group>, User[]> = new Map();
  participantToRender: { participant: User, groupReference: DocumentReference<Group> } | null = null;
  collapseAll: boolean = false;
  drawResourceForScreenshot: boolean = false;
  @Input() participants: User[] = [];
  @Input() actions: boolean = false;
  protected readonly ResourceStatus = ResourceStatus;
  disableButtons = false;

  @ViewChild('assignmentInput') assignmentInputRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('yAxisInput') yAxisInputRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('xAxisInput') xAxisInputRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('numberOfRotationsSelect') numberOfRotationsSelectRef!: MatSelect;
  @ViewChild('totalVotesSelect') totalVotesSelectRef!: MatSelect;

  constructor(
    private workspaceService: WorkspaceService,
    private snackBar: MatSnackBar,
    private resourceService: ResourceService,
    private dialog: MatDialog,
    private storageService: StorageService,
    private workspaceSummaryService: WorkspaceSummaryService,
    private userService: UserService,
  ) { }

  get activeResource(): Resource {
    return this.resourcesWithTemplates[this.resourcesWithTemplates.length - 1].resource;
  }

  get activeResourceTemplate(): ResourceTemplate {
    return this.resourcesWithTemplates[this.resourcesWithTemplates.length - 1].template;
  }

  get canOperate(): boolean {
    return this.actions;
  }

  isExperienceFinished() {
    return this.activeResource.status === ResourceStatus.Finished && this.workspace.activeResourceIndex === this.workspace.resources.length - 1;
  }

  toggleVisibility(): void {
    this.workspaceService.updateWorkspaceStatus(this.workspaceReference, !this.workspace.isVisible)
      .then(() => {
        console.debug('Workspace updated successfully to: ', this.workspace);
        this.snackBar.open("Visibilidad actualizada", "x", {
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
          duration: 4000,
          panelClass: 'success'

        });
      }
      )
      .catch((error) => {
        console.error(error);
      }
      );
  }

  getDisplayNameById(id: string): string {
    return this.participants.find(participant => participant.id! === id)?.displayName || "";
  }

  enableAssignmentEdit() {
    this.isAssignmentEditing = true;

    setTimeout(() => {
      const input = this.assignmentInputRef?.nativeElement;
      if (input) {
        input.focus();
        const length = input.value.length;
        input.setSelectionRange(length, length);
      }
    });
  }

  saveAssignment() {
    this.isAssignmentEditing = false;
    if (this.workspace.activeResourceIndex !== undefined) {
      const updatedFields = { assignment: this.activeResource.assignment };
      this.resourceService.updateResource(this.workspace.resources[this.workspace.activeResourceIndex], updatedFields)
        .then(() => {
          if (this.workspace.activeResourceIndex !== undefined) {
            console.log("Updated assignment of resource", this.workspace.resources[this.workspace.activeResourceIndex]);
          }
        })
        .catch((error) => {
          console.error("Error updating resource assignment", error);
        });
    }
  }

  enableNumberOfRotationsEdit() {
    this.isNumberOfRotationsEditing = true;

    setTimeout(() => {
      this.numberOfRotationsSelectRef?.focus();
    });
  }

  saveNumberOfRotations() {
    this.isNumberOfRotationsEditing = false;
    if (this.workspace.activeResourceIndex !== undefined) {
      const updatedFields = { numberOfRotations: this.activeResource.numberOfRotations };
      this.resourceService.updateResource(this.workspace.resources[this.workspace.activeResourceIndex], updatedFields)
        .then(() => {
          console.log("Updated numberOfRotations of resource", this.workspace.resources[this.workspace.activeResourceIndex]);
        })
        .catch((error) => {
          console.error("Error updating resource numberOfRotations", error);
        });
    }
  }

  enableTotalVotesEdit() {
    this.isTotalVotesEditing = true;
    setTimeout(() => {
      this.totalVotesSelectRef?.focus();
    });
  }

  saveTotalVotes() {
    this.isTotalVotesEditing = false;
    if (this.workspace.activeResourceIndex !== undefined) {
      const updatedFields = { totalVotes: this.activeResource.totalVotes };
      this.resourceService.updateResource(this.workspace.resources[this.workspace.activeResourceIndex], updatedFields)
        .then(() => {
          console.log("Updated totalVotes of resource", this.workspace.resources[this.workspace.activeResourceIndex]);
        })
        .catch((error) => {
          console.error("Error updating resource totalVotes", error);
        });
    }
  }

  enableXAxisEdit() {
    this.isXAxisEditing = true;

    setTimeout(() => {
      const input = this.xAxisInputRef?.nativeElement;
      if (input) {
        input.focus();
        const length = input.value.length;
        input.setSelectionRange(length, length);
      }
    });
  }

  saveXAxis() {
    this.isXAxisEditing = false;
    if (this.workspace.activeResourceIndex !== undefined) {
      const updatedFields = { xAxis: this.activeResource.xAxis };
      this.resourceService.updateResource(this.workspace.resources[this.workspace.activeResourceIndex], updatedFields)
        .then(() => {
          if (this.workspace.activeResourceIndex !== undefined) {
            console.log("Updated xAxis of resource", this.workspace.resources[this.workspace.activeResourceIndex]);
          }
        })
        .catch((error) => {
          console.error("Error updating resource xAxis", error);
        });
    }
  }

  enableYAxisEdit() {
    this.isYAxisEditing = true;

    setTimeout(() => {
      const input = this.yAxisInputRef?.nativeElement;
      if (input) {
        input.focus();
        const length = input.value.length;
        input.setSelectionRange(length, length);
      }
    });
  }

  saveYAxis() {
    this.isYAxisEditing = false;
    if (this.workspace.activeResourceIndex !== undefined) {
      const updatedFields = { yAxis: this.activeResource.yAxis };
      this.resourceService.updateResource(this.workspace.resources[this.workspace.activeResourceIndex], updatedFields)
        .then(() => {
          if (this.workspace.activeResourceIndex !== undefined) {
            console.log("Updated yAxis of resource", this.workspace.resources[this.workspace.activeResourceIndex]);
          }
        })
        .catch((error) => {
          console.error("Error updating resource yAxis", error);
        });
    }
  }

  goToNextResource(): void {
    const newActiveIndex = this.workspace.activeResourceIndex !== undefined ? this.workspace.activeResourceIndex + 1 : 0;
    const newActiveResourceReference = this.workspace.resources[newActiveIndex];
    let messageToShow;
    if (newActiveResourceReference) {
      messageToShow = '¿Estás seguro que querés pasar al siguiente recurso?'
    } else {
      messageToShow = '¿Estás seguro que querés finalizar la experiencia?'

    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { message: messageToShow }
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        if (this.workspace.activeResourceIndex !== undefined) {
          if (!newActiveResourceReference) {
            await this.takeScreenshot(true);
          }
          const activeResourceReference = this.workspace.resources[this.workspace.activeResourceIndex];
          this.resourceService.updateStatus(activeResourceReference, ResourceStatus.Finished).then(() => {
            console.log('Successfully updated resource: ', activeResourceReference, 'with index: ', this.workspace.activeResourceIndex, ' to status: ', ResourceStatus.Finished);
          });
        }

        this.resourceService.updateStatus(newActiveResourceReference, ResourceStatus.Waiting).then(() => {
          console.log('Successfully updated resource: ', newActiveResourceReference, 'with index: ', newActiveIndex, ' to status: ', ResourceStatus.Ongoing);
        });

        this.workspaceService.updateActiveResourceIndex(this.workspaceReference, newActiveIndex)
          .then(() => {
            console.log('Active resource index updated successfully to: ', newActiveIndex);
          });
      }
    });


  }

  getToNextResourceTooltip() {
    if (!this.activeResource) {
      return 'Comenzar primer recurso'
    }
    if (this.workspace.resources.length - 1 !== this.workspace.activeResourceIndex) {
      return 'Siguiente Recurso'
    }
    return 'Finalizar experiencia'
  }

  pauseResource(): void {
    if (this.workspace.activeResourceIndex !== undefined) {
      const activeResourceReference = this.workspace.resources[this.workspace.activeResourceIndex];
      this.resourceService.updateStatus(activeResourceReference, ResourceStatus.Paused).then(() => {
        console.debug("Paused resource, taking screenshot...");
        this.takeScreenshot();
      })
    }
  }

  resumeResource(): void {
    if (this.workspace.activeResourceIndex !== undefined) {
      const activeResourceReference = this.workspace.resources[this.workspace.activeResourceIndex];
      this.resourceService.updateStatus(activeResourceReference, ResourceStatus.Ongoing)
    }
  }

  getFieldObject(fields: Map<String, Field>, fieldName: string): Field {
    // @ts-ignore
    return fields[fieldName];
  }

  async takeScreenshot(finishExperience: boolean = false): Promise<void> {
    this.disableButtons = true;
    const snackRef = this.snackBar.openFromComponent(ProgressSnackbarComponent, {
      data: { message: finishExperience ? "Tomando capturas previo a finalizar la experiencia" : 'Tomando capturas...', progress: 0 },
      duration: undefined,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: 'success'
    });

    if (this.activeResourceTemplate.configuration.showMatrix || this.activeResourceTemplate.configuration.showAllVotes) {
      await this.takeScreenshotPerGroup(snackRef, finishExperience)

    } else {
      await this.takeScreenshotPerParticipant(snackRef, finishExperience)
    }

    this.snackBar.dismiss();
    this.snackBar.open(finishExperience ? 'Capturas previo a finalizar la experiencia completadas' : 'Capturas completadas', 'x', {
      duration: 4000,
      panelClass: 'success',
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
    this.disableButtons = false;
  }

  async takeScreenshotPerGroup(snackRef: MatSnackBarRef<ProgressSnackbarComponent>, finishExperience: boolean) {
    const groupEntries = Array.from(this.participantsByGroup.entries());
    const duplicatedWithFlags: [DocumentReference<Group>, User[], boolean][] = groupEntries.flatMap(
      ([groupRef, users]) => [
        [groupRef, users, false],
        [groupRef, users, true],
      ]
    );
    const totalGroups = duplicatedWithFlags.length;
    let current = 0;

    for (const [groupReference, participants, collapsed] of duplicatedWithFlags) {
      this.participantToRender = { participant: participants[0], groupReference };
      this.collapseAll = collapsed;
      this.drawResourceForScreenshot = true;

      await new Promise(resolve => setTimeout(resolve, 1000));

      const groupElement = document.getElementById(`participant-${participants[0].id}`);
      if (groupElement) {
        const canvas = await html2canvas(groupElement, { scale: 2, useCORS: true });
        if (!canvas) {
          console.error('No se pudo capturar el grupo:', groupReference.id);
          continue;
        }

        const dataUrl = canvas.toDataURL('image/png');
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const filename = `grupo_${groupReference.id}_${getFormattedDateFilename()}.png`;
        const file = new File([blob], filename, { type: 'image/png' });

        this.storageService.uploadFileContentDisposition(file, 'screenshots', `/${this.activeResourceTemplate.name}/grupo_${groupReference.id}/${filename}`)
          .then(result => {
            this.storageService.getDownloadUrl(result.fullPath).then(url => {
              const workspaceSummary: WorkspaceSummary = {
                workspace: this.workspaceReference,
                image: url,
                group: groupReference,
                time: new Date(),
                resourceTemplateName: this.activeResourceTemplate.name
              }
              this.workspaceSummaryService.create(workspaceSummary);
            });
          })
          .catch(error => {
            console.error("Error uploading group screenshot:", error);
          });
      } else {
        console.error('No se encontró el elemento del grupo:', groupReference.id);
      }

      current++;
      const percent = Math.round((current / totalGroups) * 100);
      snackRef.instance.data.message = finishExperience ? `Capturando grupos antes de finalizar (${percent}%)` : `Capturando grupos (${percent}%)`;
      snackRef.instance.data.progress = percent;

      this.drawResourceForScreenshot = false;
      await nextTicks(2);
    }
  }

  async takeScreenshotPerParticipant(snackRef: MatSnackBarRef<ProgressSnackbarComponent>, finishExperience: boolean) {
    const totalParticipants = Array.from(this.participantsByGroup.values()).reduce((sum, p) => sum + p.length, 0) * 2;
    let current = 0;

    for (const [groupReference, participants] of this.participantsByGroup.entries()) {
      for (const participant of participants) {
        for (const collapsed of [false, true]) {
          this.participantToRender = { participant, groupReference };
          this.collapseAll = collapsed;
          this.drawResourceForScreenshot = true;

          await new Promise(resolve => setTimeout(resolve, 1000));

          const participantElement = document.getElementById(`participant-${participant.id}`);
          if (participantElement) {
            const canvas = await html2canvas(participantElement, { scale: 2, useCORS: true });
            if (!canvas) {
              console.error('No se pudo capturar el elemento.');
              return;
            }
            const dataUrl = canvas.toDataURL('image/png');
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const filename = `${getFormattedDateFilename()}.png`;
            const file = new File([blob], filename, { type: 'image/png' });

            this.storageService.uploadFileContentDisposition(file, 'screenshots', `/${this.activeResourceTemplate.name}/${this.getDisplayNameById(participant.id!)}/${filename}`)
              .then(result => {
                this.storageService.getDownloadUrl(result.fullPath).then(url => {
                  const workspaceSummary: WorkspaceSummary = {
                    participant: this.userService.getReferenceById(participant.id!),
                    workspace: this.workspaceReference,
                    image: url,
                    group: groupReference,
                    time: new Date(),
                    resourceTemplateName: this.activeResourceTemplate.name
                  }
                  this.workspaceSummaryService.create(workspaceSummary)
                })
              })
              .catch(error => {
                console.error("Error uploading file:", error);
              })
          } else {
            console.error('No se encontró el elemento del participante', participant.id);
          }

          current++;
          const percent = Math.round((current / totalParticipants) * 100);
          snackRef.instance.data.message = finishExperience ? `Tomando capturas previo a finalizar la experiencia  (${percent}%)` : `Capturando (${percent}%)`;
          snackRef.instance.data.progress = percent;

          this.drawResourceForScreenshot = false;
          await nextTicks(2);
        }
      }
    }
  }

  get resourceStatusLabel(): string {
    return ResourceStatusLabels[this.activeResource.status];
  }

  get resourceStatusClass(): string {
    return ResourceStatusClasses[this.activeResource.status];
  }

  rotate() {
    if ((this.activeResource.currentRotation || 0) !== this.activeResource.numberOfRotations) {
      const activeResourceReference = this.workspace.resources[this.workspace.activeResourceIndex];
      this.resourceService.updateResource(activeResourceReference, { currentRotation: (this.activeResource.currentRotation || 0) + 1 })
        .then(() => console.debug("Rotated page"))
    }
  }

  get rotationTooltip() {
    if (this.activeResource.numberOfRotations !== 'UNLIMITED_ROTATIONS') {
      if ((this.activeResource.currentRotation || 0) === this.activeResource.numberOfRotations) {
        return 'No quedan más rotaciones disponibles';
      } else {
        return `Rotación: (${(this.activeResource.currentRotation || 0)}/${this.activeResource.numberOfRotations})`;
      }
    } else {
      return `Rotación: ${(this.activeResource.currentRotation || 0)} (rotaciones ilimitadas)`;
    }
  }
}
