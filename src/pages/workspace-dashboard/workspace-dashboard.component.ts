import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {MatSelectModule} from "@angular/material/select";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatIconModule} from "@angular/material/icon";
import {DocumentReference, Timestamp} from "@angular/fire/firestore";
import {Subscription} from "rxjs";
import WorkspaceService from "src/services/workspace.service";
import GroupService from "src/services/group.service";
import Workspace from "src/interfaces/workspace.interface";
import Group from 'src/interfaces/group.interface';
import {CommonModule} from "@angular/common";
import {MatSnackBar, MatSnackBarModule, MatSnackBarRef} from "@angular/material/snack-bar";
import {MatProgressBarModule} from '@angular/material/progress-bar';
import ResourceService from "src/services/resource.service";
import {ResourceStatus, Role} from "src/utils/enums";
import Resource from "src/interfaces/resource.interface";
import { GroupSummaryComponent } from 'src/components/group-summary/group-summary.component';
import { ProgressSnackbarComponent } from 'src/components/progress-snackbar/progress-snackbar.component';
import ResourceTemplateService from 'src/services/resource-template.service';
import ResourceTemplate from 'src/interfaces/resource-template.interface';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GroupPreviewComponent } from '@components/group-preview/group-preview.component';
import {MatExpansionModule} from "@angular/material/expansion";
import html2canvas from 'html2canvas';
import StorageService from '@services/storage.service';
import UserService from '@services/user.service';
import User from '@interfaces/user.interface';
import Element from "@interfaces/element.interface";
import * as Papa from 'papaparse';

function nextTicks(frames = 1): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, frames * 16));
}

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


import { FormsModule } from '@angular/forms';
import WorkspaceSummaryService from '@services/workspace-summary.service';
import WorkspaceSummary from '@interfaces/workspace-summary.interface';
import { MatDialog } from '@angular/material/dialog';
import {ResourceComponent} from "@components/resource/resource.component";
import ResourceWithTemplate from "@interfaces/resource-with-template.interface";
import {ResourceInfoComponent} from "@components/resource-info/resource-info.component";
import RoleInWorkspaceService from "@services/role-in-workspace.service";
import {Router} from "@angular/router";
import { WorkspaceInfoAndActionsComponent } from '@components/workspace-info-and-actions/workspace-info-and-actions.component';
import {format} from "date-fns";
import ElementService from "@services/element.service";
import RoleConfiguration from "@interfaces/role-configuration.inteface";
import {getConfigurationByRole} from "@utils/role-configuration";

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
    GroupSummaryComponent,
    MatTooltipModule,
    GroupPreviewComponent,
    MatExpansionModule,
    FormsModule,
    CommonModule,
    ResourceComponent,
    ResourceInfoComponent,
    WorkspaceInfoAndActionsComponent
  ],
  templateUrl: './workspace-dashboard.component.html',
  styleUrls: ['./workspace-dashboard.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WorkspaceDashboardComponent implements OnInit, OnDestroy {
  @Input() workspaceId = '';
  workspace: Workspace;
  workspaceReference: DocumentReference<Workspace>;
  groups: Group[] = [];
  workspaceSubscription: Subscription | null = null;
  resourceSubscription: Subscription | null = null;
  summarySubscription: Subscription | null = null;
  loading: boolean = true;
  selectedGroupIndex: number;
  drawResourceForScreenshot: boolean = false;
  participantsByGroup: Map<DocumentReference<Group>, User[]> = new Map();
  participants: User[] = [];
  participantToRender: { participant: User, groupReference: DocumentReference<Group> } | null = null;
  collapseAll: boolean = false;
  workspaceSummariesByGroup: Map<string, WorkspaceSummary[]> = new Map();
  resourcesWithTemplates: ResourceWithTemplate[] = [];
  protected readonly ResourceStatus = ResourceStatus;
  resourceSubscriptions: Subscription[] = [];
  roleConfiguration: RoleConfiguration;

  constructor(
    private workspaceSummaryService: WorkspaceSummaryService,
    private resourceTemplateService: ResourceTemplateService,
    private roleInWorkspaceService: RoleInWorkspaceService,
    private workspaceService: WorkspaceService,
    private resourceService: ResourceService,
    private storageService: StorageService,
    private elementService: ElementService,
    private groupService: GroupService,
    private userService: UserService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.workspaceReference = this.workspaceService.getReferenceById(this.workspaceId);
    const userId = this.userService.getUserIdFromStorage();
    if (!userId) {
      console.debug("No user found");
      this.router.navigate(['/forbidden']);
      return;
    }
    this.roleInWorkspaceService.getUserRoleInWorkspace(userId, this.workspaceReference).then(
      (role) => {
        if (role.role === Role.Participant) {
          console.debug("User is a participant, redirecting to forbidden page");
          this.router.navigate(['/forbidden']);

        } else {
          this.roleConfiguration = getConfigurationByRole(role.role)
          this.workspaceSubscription = this.workspaceService.observeByReference(this.workspaceReference)
            .subscribe((workspace: Workspace) => {
              console.log("Workspace updated: ", workspace);
              this.workspace = workspace;
              this.loadResources(this.workspace);
              this.groups.length = 0;
              this.workspace.groups.map(
                (groupReference, index) =>
                  this.groupService.getByReference(groupReference).then(
                    (group: Group) => {
                      this.groups[index] = group;
                      if(this.groups.length == this.workspace.groups.length) {
                        if (this.groups.length > 0) {
                          this.selectedGroupIndex = 0;
                        }
                        this.loading = false;
                      }
                      this.loading = false;
                      Promise.all(group.participants.map(
                        (participantReference) => this.userService.getByReference(participantReference)
                      )).then((participants) => {
                        console.log("Participantes:", participants)
                        this.participants = this.participants.concat(participants);
                        const existingGroupReference = Array.from(this.participantsByGroup.keys())
                          .find(ref => ref.id === groupReference.id);

                        if (existingGroupReference) {
                          this.participantsByGroup.set(existingGroupReference, participants);
                        } else {
                          this.participantsByGroup.set(groupReference, participants);
                        }
                      });
                    })
              )
            });

          this.summarySubscription = this.workspaceSummaryService.getWorkspaceSummaryByWorkspace(this.workspaceReference)
            .subscribe(summary => {
              this.addWorkspaceSummary(summary);
            });
        }
      }
    );

  }

    private loadResources(workspace: Workspace) {
      this.resourceSubscriptions.forEach(sub => sub.unsubscribe());

      const currentIndex = workspace.activeResourceIndex;
      const persistentIndexes = workspace.persistentResourceIndexes.filter(i => i < currentIndex);
      const allRelevantIndexes = [...persistentIndexes, currentIndex].sort((a, b) => a - b);

      this.resourcesWithTemplates = new Array(allRelevantIndexes.length).fill(null);

      allRelevantIndexes.forEach((resourceIndex, i) => {
        const resourceReference = workspace.resources[resourceIndex];

        const subscription = this.resourceService.observeByReference(resourceReference).subscribe(resource => {
          if (this.resourcesWithTemplates[i] !== null) {
            this.resourcesWithTemplates[i].resource = resource;
          } else {
            // Only fetch the template on a resource load, not change
            this.resourceTemplateService.getByReference(resource.resourceTemplate)
              .then(template => {
                this.resourcesWithTemplates[i] = {resource, template};
                const allFilled = this.resourcesWithTemplates.every(item => item != null);
                if (allFilled) {
                  this.loading = false;
                }
              });
          }
        });

        this.resourceSubscriptions.push(subscription);
      });
    }

 get activeResource(): Resource {
    return this.resourcesWithTemplates[this.resourcesWithTemplates.length - 1].resource;
  }

  get activeResourceTemplate(): ResourceTemplate {
    return this.resourcesWithTemplates[this.resourcesWithTemplates.length - 1].template;
  }

  get currentResource(): ResourceWithTemplate {
    return this.resourcesWithTemplates[this.resourcesWithTemplates.length - 1];
  }

  async takeScreenshot(finishExperience: boolean = false): Promise<void> {
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
  }

  async takeScreenshotPerGroup(snackRef: MatSnackBarRef<ProgressSnackbarComponent>, finishExperience: boolean) {
    const groupEntries = Array.from(this.participantsByGroup.entries());
    const duplicatedWithFlags:[DocumentReference<Group>, User[], boolean][] = groupEntries.flatMap(
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
          this.participantToRender = {participant, groupReference};
          this.collapseAll = collapsed;
          this.drawResourceForScreenshot = true;

          await new Promise(resolve => setTimeout(resolve, 1000));

          const participantElement = document.getElementById(`participant-${participant.id}`);
          if (participantElement) {
            const canvas = await html2canvas(participantElement, {scale: 2, useCORS: true});
            if (!canvas) {
              console.error('No se pudo capturar el elemento.');
              return;
            }
            const dataUrl = canvas.toDataURL('image/png');
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const filename = `${getFormattedDateFilename()}.png`;
            const file = new File([blob], filename, {type: 'image/png'});

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

  getDisplayNameById(id: string): string {
    return this.participants.find(participant => participant.id! === id)?.displayName || "";
  }

  trackById(index: number, item: [string, User[]]): string {
    return item[0];  // Devuelve la clave de la tupla, que es de tipo 'string'
  }

  get participantsByGroupAsArray() {
    console.log("participantsByGroupAsArray", Array.from(this.participantsByGroup.entries()))
    return Array.from(this.participantsByGroup.entries());
  }

  addWorkspaceSummary(summaries: WorkspaceSummary[]) {
    summaries.forEach(summary => {
      const groupId = summary.group.id;
      if (!this.workspaceSummariesByGroup.has(groupId)) {
        this.workspaceSummariesByGroup.set(groupId, []);
      }

      let time: Date;
      if (summary.time instanceof Timestamp) {
        time = summary.time.toDate();
      } else {
        time = new Date(summary.time);
      }
      summary.time = time;

      let groupSummaries = this.workspaceSummariesByGroup.get(groupId)!;
      const index = groupSummaries.findIndex(s => s.id === summary.id);

      if (index > -1) {
        groupSummaries[index] = summary;
      } else {
        groupSummaries.push(summary);
      }
      groupSummaries = groupSummaries.sort((a, b) =>  a.time.getTime() - b.time.getTime());
    })
  }

  async downloadWorkspaceSummaryImages() {
    const total = Array.from(this.workspaceSummariesByGroup.values()).reduce((acc, list) => acc + list.length, 0);
    let current = 0;

    const snackRef = this.snackBar.openFromComponent(ProgressSnackbarComponent, {
      data: { message: 'Descargando imágenes...', progress: 0 },
      duration: undefined,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: 'success'
    });

    const snackInstance = snackRef.instance;

    for (const [groupId, summaries] of this.workspaceSummariesByGroup.entries()) {
      for (const [index, summary] of summaries.entries()) {
        console.log("Descargando imagen:", summary.image);
        try {
          const response = await fetch(summary.image, { mode: 'cors' });
          if (!response.ok) throw new Error(`Error en la descarga: ${response.statusText}`);

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          };
          const formattedTime = summary.time.toLocaleString('en-GB', options).replaceAll('/', '-')
            .replace(',', '')
            .replaceAll(":", '-')
            .replace(" ", "-");
          a.download = `grupo${this.groups.findIndex(grupo => grupo.id === groupId)+ 1}_${this.getResourceNameAbbreviation(summary.resourceTemplateName)}_${summary.participant ? `${this.getDisplayNameById(summary.participant.id)}_` : ""}${formattedTime}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          URL.revokeObjectURL(url);
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error("Error descargando imagen:", summary.image, err);
        }
        current++;
        const percent = Math.round((current / total) * 100);
        snackInstance.data.progress = percent;
        snackInstance.data.message = `Descargando (${percent}%)`;
      }
    }

    this.snackBar.dismiss();
    this.snackBar.open('Descargas completadas', 'x', {
      duration: 4000,
      panelClass: 'success',
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  getResourceNameAbbreviation(name: string) {
    switch (name) {
      case "Brainwriting Individual":
        return "BI";
      case "Matriz de 2x2":
        return "M2x2";
      case "Brainwriting Grupal":
        return "BG";
      case "Votación Ciega":
        return "VC";
      case "Votación Grupal":
        return "VG";
      default:
        return "";
    }
  }

  isExperienceFinished() {
    return this.activeResource.status === ResourceStatus.Finished && this.workspace.activeResourceIndex === this.workspace.resources.length-1;
  }


  exportElementsToCSV(): void {
    this.snackBar.open("Exportando elementos a CSV...", "x", {
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      duration: 4000,
      panelClass: 'success'
    })

    const allRows: any[] = [];

    for (const [groupRef, participants] of this.participantsByGroup.entries()) {
      this.groupService.getByReference(groupRef).then(group => {
        const elementPromises: Promise<Element>[] = group.elements.map(elementReference => this.elementService.getByReference(elementReference));
        Promise.all(elementPromises).then(elements => {
          elements.forEach(element => {
            const row: any = {
              'Grupo': `Grupo ${this.workspace.groups.findIndex(g => g.id === group.id) + 1}`,
              'Hoja': element.pageId ? `Hoja ${group.participants.findIndex(p => p.id === element.pageId) + 1}` : '',
              'Autor': participants.find(p => p.id === element.author?.id)?.displayName || 'Anónimo',
              'Contenido': element.content || '',
              'Imagen': element.image || '',
              'Audio': element.audio || '',
              'Creado': format(element.creationDate, 'dd/MM/yyyy HH:mm'),
              'Votos': element.votes.length
            };
            allRows.push(row);
          });

          // Convert to CSV
          const csv = Papa.unparse(allRows);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `post_its_workspace_${this.workspace.id}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        })
      })
    }
  }

  selectGroup(index: number) {
    this.selectedGroupIndex = index;
  }

  isExperienceActive() {
    return this.activeResource.status !== ResourceStatus.Waiting;
  }

  ngOnDestroy(): void {
    if (this.workspaceSubscription) {
      this.workspaceSubscription.unsubscribe();
    }
    if (this.summarySubscription) {
      this.summarySubscription.unsubscribe();
    }
    if (this.resourceSubscription) {
      this.resourceSubscription.unsubscribe();
    }
    this.resourceSubscriptions.forEach(sub => sub.unsubscribe());
  }
}
