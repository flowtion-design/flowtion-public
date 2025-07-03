import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import Group from 'src/interfaces/group.interface';
import Element from 'src/interfaces/element.interface';
import User from 'src/interfaces/user.interface';
import ElementService from 'src/services/element.service';
import UserService from 'src/services/user.service';
import { MatCardModule } from '@angular/material/card';
import { NgFor, NgIf } from '@angular/common';
import RoleInWorkspaceService from '@services/role-in-workspace.service';
import WorkspaceService from '@services/workspace.service';
import Resource from '@interfaces/resource.interface';
import ResourceService from '@services/resource.service';
import ResourceTemplate from '@interfaces/resource-template.interface';
import ResourceTemplateService from '@services/resource-template.service';
import Workspace from '@interfaces/workspace.interface';
import { ResourceStatus } from '@utils/enums';
import { Subscription } from 'rxjs';
import Vote from '@interfaces/vote.interface';
import VoteService from '@services/vote.service';
import GroupService from '@services/group.service';

@Component({
  selector: 'app-group-summary',
  standalone: true,
  imports: [MatCardModule, NgFor, NgIf],
  templateUrl: './group-summary.component.html',
  styleUrl: './group-summary.component.scss'
})
export class GroupSummaryComponent implements OnInit, OnDestroy {
  @Input() group: Group;
  @Input() index: number;
  @Input() workspaceId: string;
  @Input() resourceId: string;
  elements: Element[] = [];
  participants: User[];
  colorByParticipant: Map<string, string> = new Map();
  resource: Resource;
  resourceTemplate: ResourceTemplate;
  resourceSubscription: Subscription | null = null;
  previousResource: Resource;
  workspace: Workspace;
  elementsSubscriptions: Subscription[] = [];
  groupSubscription: Subscription | null = null;
  votes: Vote[] = [];
  lines: { points: { x: number; y: number }[] }[] = [];
  hasDrawn = false;
  @ViewChildren('postItElem') postItElems!: QueryList<ElementRef>;
  @ViewChild('resourceContainer', { static: false }) resourceContainer!: ElementRef<HTMLDivElement>;

  constructor(
    private resourceTemplateService: ResourceTemplateService,
    private roleInWorkspaceService: RoleInWorkspaceService,
    private workspaceService: WorkspaceService,
    private resourceService: ResourceService,
    private elementService: ElementService,
    private userService: UserService,
    private voteService: VoteService,
    private cdr: ChangeDetectorRef,
    private groupService: GroupService
  ) { }

  ngOnInit(): void {
    const workspaceReference = this.workspaceService.getReferenceById(this.workspaceId);
    this.workspaceService.getByReference(workspaceReference).then(workspace => {
      this.workspace = workspace;
      if (workspace.activeResourceIndex! > 0) {
        this.resourceService.getByReference(workspace.resources[workspace.activeResourceIndex! - 1])
          .then((resource: Resource) => {
            this.previousResource = resource;
          })
      }
    })
    if (this.resourceSubscription) {
      this.resourceSubscription.unsubscribe();
      this.resourceSubscription = null;
    }
    this.resourceSubscription = this.resourceService
      .observeByReference(this.resourceService.getReferenceById(this.resourceId))
      .subscribe((resource: Resource) => {
        this.resource = resource;
        this.resourceTemplateService.getByReference(resource.resourceTemplate)
          .then((resourceTemplate: ResourceTemplate) => {
            this.resourceTemplate = resourceTemplate;
          })
      }
      );

    const participantsPromises = Promise.all(
      this.group.participants.map((participantReference) =>
        this.userService.getByReference(participantReference)
      )
    );

    const groupReference = this.groupService.getReferenceById(this.group.id!);
      this.groupSubscription = this.groupService.observeByReference(groupReference)
        .subscribe((group: Group) => {
          participantsPromises.then((participants: User[]) => {
            this.participants = participants;
            participants.forEach((participant) => {
              this.roleInWorkspaceService.getUserRoleInWorkspace(participant.id!, workspaceReference)
                .then(roleInWorkspace => {
                  this.colorByParticipant.set(participant.id!, roleInWorkspace.color!)
                });                
            })
          })

          const groupElementIds = group.elements.map(ref => ref.id);
          this.elements = this.elements.filter(el => groupElementIds.includes(el.id!))
          group.elements.map((elementReference) => this.elementService.observeByReference(elementReference)).forEach(elementObs => {
            const subscription = elementObs.subscribe(element => {
              const elementToReplace = this.elements.find(r => r.id === element.id);

              this.elements = this.elements.filter(el => el.id !== element.id);
              this.elements.push(element);

              if (elementToReplace) {
                this.votes = this.votes.filter(vote => !elementToReplace.votes.some(element => element.id === vote.id))
              }
              element.votes.map(voteRef =>
                this.voteService.getByReference(voteRef).then(vote => {
                  if (!this.votes.some(existingVote => existingVote.id === vote.id)) {
                    this.votes.push(vote);
                  }
                })
              )
            });
            this.elementsSubscriptions.push(subscription);
          });
        });
  }

  ngAfterViewChecked(): void {
    if (!this.hasDrawn && this.postItElems.length > 0 && this.resourceContainer) {
      console.log("ngAfterViewChecked")
      this.hasDrawn = true; // evitar múltiples ejecuciones
      setTimeout(() => this.drawConnections(), 0);
    }
  }

  drawConnections(): void {
    const elems = this.postItElems.toArray();
    const container = this.resourceContainer.nativeElement.getBoundingClientRect();

    this.lines = [];

    for (let i = 0; i < elems.length - 1; i++) {
      const fromRect = elems[i].nativeElement.getBoundingClientRect();
      const toRect = elems[i + 1].nativeElement.getBoundingClientRect();

      this.lines.push({
        points: [
          {
            x: fromRect.right - container.left,
            y: fromRect.top + fromRect.height / 2 - container.top,
          },
          {
            x: toRect.left - container.left,
            y: toRect.top + toRect.height / 2 - container.top,
          },
        ],
      });
    }

    if (elems.length > 1) {
      const last = elems[elems.length - 1].nativeElement.getBoundingClientRect();
      const first = elems[0].nativeElement.getBoundingClientRect();

      const startX = last.right - container.left;
      const startY = last.top + last.height / 2 - container.top;
      const endX = first.left - container.left;
      const endY = first.top + first.height / 2 - container.top;

      const midY = Math.max(startY, endY) + 35;

      this.lines.push({
        points: [
          { x: startX, y: startY },
          { x: startX + 10, y: startY },
          { x: startX + 10, y: midY },
          { x: endX - 10, y: midY },
          { x: endX - 10, y: endY },
          { x: endX, y: endY },
        ],
      });
    }
  }

  getPoints(line: { points: any[]; }): string {
    return line.points?.filter(p => p != undefined).map(p => p.x + ',' + p.y).join(' ') || '';
  }

  isExperienceActive() {
    return this.resource.status !== ResourceStatus.Waiting
  }

  previousResourceIsMatrix() {
    return this.previousResource && this.previousResource.xAxis && this.previousResource.yAxis;
  }

  getPositionedElements() {
    return this.elements.filter(element => element.positioned).length;;
  }

  getUnpositionedElements() {
    return this.elements.filter(element => !element.positioned).length;
  }

  getPositionedVotesCount() {
    const filteredElements = this.elements.filter(element => element.positioned);
    const voteIdSet = new Set(filteredElements.flatMap(element => element.votes.map(voteRef => voteRef.id)));
    const filteredVotes = this.votes.filter(vote => voteIdSet.has(vote.id!));
    return filteredVotes.length;
  }

  getUnpositionedVotesCount() {
    const filteredElements = this.elements.filter(element => !element.positioned);
    const voteIdSet = new Set(filteredElements.flatMap(element => element.votes.map(voteRef => voteRef.id)));
    const filteredVotes = this.votes.filter(vote => voteIdSet.has(vote.id!));
    return filteredVotes.length;
  }

  getVotesByParticipant(participantId: string) {
    const filteredElements = this.elements.filter(element => element.author!.id === participantId)
    const voteIdSet = new Set(filteredElements.flatMap(element => element.votes.map(voteRef => voteRef.id)));
    const filteredVotes = this.votes.filter(vote => voteIdSet.has(vote.id!));
    return filteredVotes.length;
  }

  getVotesByParticipantInGroupVoting(participantId: string) {
    const participantElements = this.elements.filter(element => element.author?.id === participantId);
    const validVoteIds = new Set(this.votes.map(v => v.id));
    const uniqueVotedElements = participantElements.filter(element =>
      element.votes.some(voteRef => validVoteIds.has(voteRef.id))
    );
    return uniqueVotedElements.length;
  }

  getElementsByParticipant(participantId: string) {
    return this.elements.filter(element => element.author!.id === participantId);
  }

  getElementsByPage(pageId: string) {
    return this.elements.filter(element => element.pageId === pageId);
  }

  ngOnDestroy(): void {
    if (this.resourceSubscription) {
      this.resourceSubscription.unsubscribe();
    }
    this.elementsSubscriptions.forEach(sub => sub.unsubscribe());
    if(this.groupSubscription) {
      this.groupSubscription.unsubscribe();
    }
  }
}
