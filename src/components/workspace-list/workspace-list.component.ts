import {Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from "@angular/router";
import {DocumentReference} from "@angular/fire/firestore";

import {WorkspaceCardComponent} from "@components/workspace-card/workspace-card.component";

import RoleInWorkspaceService from "@services/role-in-workspace.service";
import AuthenticationService from "@services/authentication.service";
import WorkspaceService from "@services/workspace.service";
import ResourceService from '@services/resource.service';
import LoadingService from "@services/loading.service";

import Workspace from "@interfaces/workspace.interface";
import Resource from "@interfaces/resource.interface";

import {ResourceStatus, Role} from "@utils/enums";

import {Subscription} from "rxjs";

interface WorkspaceChange {
  type: 'added' | 'removed' | 'modified';
  workspace: DocumentReference<Workspace>;
  role: Role;
}

@Component({
  selector: 'app-workspace-list',
  standalone: true,
  imports: [CommonModule, WorkspaceCardComponent],
  templateUrl: './workspace-list.component.html',
  styleUrls: ['./workspace-list.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class WorkspaceListComponent implements OnInit, OnDestroy {
  @Input() formData: { status: ResourceStatus; name: string };

  roles: Role[] = Object.values(Role);
  workspaceByRole: Map<Role, Workspace[]> = new Map();
  resourceWorkspace = new Map<string, Resource>();

  private facilitatorWorkspaceSubscriptions = new Map<string, Subscription>();
  private participantWorkspaceSubscriptions = new Map<string, Subscription>();
  private roleSubscription?: Subscription;

  constructor(
    private readonly roleInWorkspaceService: RoleInWorkspaceService,
    private readonly authenticationService: AuthenticationService,
    private readonly workspaceService: WorkspaceService,
    private readonly resourceService: ResourceService,
    private readonly loadingService: LoadingService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadingService.show();
    this.roles.forEach(role => this.workspaceByRole.set(role, []));
    this.roleInWorkspaceService.getUserWorkspacesWithRoles(this.authenticationService.getCurrentUser()!.uid).subscribe(
        (changes: WorkspaceChange[]) => {
          if(changes.length === 0) {
            this.loadingService.hide();
          }

          changes.forEach(change => {
            this.handleWorkspaceChange(
              change,
              this.facilitatorWorkspaceSubscriptions
            );
          });
        }
      );
  }

  private handleWorkspaceChange(
    change: WorkspaceChange,
    subscriptionMap: Map<string, Subscription>
  ) {
    switch (change.type) {
      case 'added':
        const newSubscription = this.workspaceService.observeByReference(change.workspace).subscribe(
          (workspace: Workspace) => {
            const index = this.workspaceByRole.get(change.role)!.findIndex(w => w.id === workspace.id);
            if (change.role === Role.Facilitator || (workspace.activeResourceIndex !== undefined && workspace.isVisible)) {
              if (index === -1) {
                this.workspaceByRole.get(change.role)!.push(workspace);
              } else {
                this.workspaceByRole.get(change.role)![index] = workspace;
              }
            } else {
              if (index !== -1) {
                this.workspaceByRole.get(change.role)!.splice(index, 1);
              }
            }
            if (workspace.activeResourceIndex !== undefined && workspace.id) {
              this.getResource(workspace.resources[workspace.activeResourceIndex], workspace.id);
            }
            this.loadingService.hide();
          }
        );
        subscriptionMap.set(change.workspace.id, newSubscription);
        break;

      case 'removed':
        const workspaceId = change.workspace.id;
        const arrayIndex = this.workspaceByRole.get(change.role)!.findIndex(w => w.id === workspaceId);
        if (arrayIndex !== -1) {
          this.workspaceByRole.get(change.role)!.splice(arrayIndex, 1);
        }
        const subscriptionToRemove = subscriptionMap.get(workspaceId);
        if (subscriptionToRemove) {
          subscriptionToRemove.unsubscribe();
          subscriptionMap.delete(workspaceId);
        }
        this.loadingService.hide();
        break;
    }
  }

  get hasNoWorkspaces(): boolean {
    return [...this.workspaceByRole.values()].every(workspaces => workspaces.length === 0)
  }

  getFilteredWorkspaces(role: Role) {
    const workspaces = this.workspaceByRole.get(role) || [];
    let filteredWorkspaces;
    if (this.formData) {
      if (this.formData.name && this.formData.status) {
        const filteredWorkspaceIds = this.filterWorkspacesByStatus()
        filteredWorkspaces = workspaces.filter(workspace => {
          return !!(workspace.id && filteredWorkspaceIds.includes(workspace.id) && workspace.name.includes(this.formData?.name));
        })
      }
      else if (this.formData.name) {
        filteredWorkspaces = workspaces.filter(workspace => workspace.name.includes(this.formData?.name))
      }
      else if (this.formData.status) {
        const filteredWorkspaceIds = this.filterWorkspacesByStatus()
        filteredWorkspaces = workspaces.filter(workspace => {
          return !!(workspace.id && filteredWorkspaceIds.includes(workspace.id));

        })
      }
    }

    return (filteredWorkspaces || workspaces).sort(
      (a, b) =>
        a.creationDate.getTime() - b.creationDate.getTime()
    );
  }

  getTitle(role: Role): string {
    switch (role) {
      case Role.Facilitator:
        return 'Experiencias que facilito';
      case Role.Participant:
        return 'Experiencias donde participo';
      case Role.Observer:
        return 'Experiencias que observo';
      case Role.TechAssistant:
        return 'Experiencias que asisto';
      case Role.CoFacilitator:
        return 'Experiencias como co-facilitador';
      default:
        return '';
    }
  }

  filterWorkspacesByStatus() {
    return [...this.resourceWorkspace.entries()]
      .filter(([key, obj]) => obj.status == this.formData.status)
      .map(([key]) => key);
  }

  private getResource(resourceReference: DocumentReference<Resource>, workspaceId: string): void {
      this.resourceService.getByReference(resourceReference)
      .then((resource: Resource) => {
        this.resourceWorkspace.set(workspaceId, resource);
      })
    }

    openWorkspace(workspace: Workspace, role: Role) {
      switch (role) {
        case Role.Participant:
          this.router.navigate([`/resource/${workspace.id}`]);
          break;
        case Role.Facilitator:
        case Role.CoFacilitator:
        case Role.TechAssistant:
        case Role.Observer:
          this.router.navigate([`/workspace/${workspace.id}`]);
      }
    }

  ngOnDestroy(): void {
    this.loadingService.hide();
    this.roleSubscription?.unsubscribe();
    [...this.facilitatorWorkspaceSubscriptions.values(),
     ...this.participantWorkspaceSubscriptions.values()].forEach(sub => sub.unsubscribe());
  }
}
