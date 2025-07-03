import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import User from 'src/interfaces/user.interface';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import Group from '@interfaces/group.interface';
import UserService from '@services/user.service';
import { FormsModule } from '@angular/forms';
import { WhiteBoardComponent } from "@pages/white-board/white-board.component";
import { DocumentReference } from "@angular/fire/firestore";
import GroupService from "@services/group.service";
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import Vote from '@interfaces/vote.interface';
import Element from '@interfaces/element.interface';
import ElementService from '@services/element.service';
import VoteService from '@services/vote.service';
import ResourceTemplate from '@interfaces/resource-template.interface';
import RoleInWorkspaceService from '@services/role-in-workspace.service';
import Workspace from '@interfaces/workspace.interface';
import WorkspaceService from '@services/workspace.service';


@Component({
  selector: 'app-group-preview',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule, MatButtonModule, FormsModule, WhiteBoardComponent, MatIconModule],
  templateUrl: './group-preview.component.html',
  styleUrl: './group-preview.component.scss'
})
export class GroupPreviewComponent implements OnInit, OnChanges, OnDestroy {
  @Input() index: number;
  @Input() workspaceId: string;
  @Input() group: Group;
  @Input() resourceTemplate: ResourceTemplate;
  participants: User[];
  selectedParticipant?: User;
  loading = false;
  groupReference: DocumentReference<Group>;
  elements: Element[] = [];
  elementsSubscriptions: Subscription[] = [];
  groupSubscription: Subscription | null = null;
  votes: Vote[] = [];
  colorByParticipant: Map<string, string> = new Map();
  workspaceReference: DocumentReference<Workspace>;

  constructor(private userService: UserService,
    private groupService: GroupService,
    private elementService: ElementService,
    private voteService: VoteService,
    private roleInWorkspaceService: RoleInWorkspaceService,
    private workspaceService: WorkspaceService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    this.loading = true;

    if (changes['group'] && this.group) {
      this.groupSubscription?.unsubscribe();
      this.elementsSubscriptions.forEach(sub => sub.unsubscribe());
      this.elementsSubscriptions = [];
      this.groupReference = this.groupService.getReferenceById(this.group.id!);
      this.groupSubscription = this.groupService.observeByReference(this.groupReference)
        .subscribe((group: Group) => {
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
        })
    }

    Promise.all(this.group.participants.map(
      (participantReference) => this.userService.getByReference(participantReference)
    )).then((participants) => {
      this.participants = participants;
      participants.forEach((participant) => {
        this.roleInWorkspaceService.getUserRoleInWorkspace(participant.id!, this.workspaceReference)
          .then(roleInWorkspace => {
            this.colorByParticipant.set(participant.id!, roleInWorkspace.color!)
          });
      })
      if (this.canFilterParticipants()) {
        this.selectedParticipant = participants[0];
      }
      this.loading = false;
    });
  }

  ngOnInit(): void {
    this.loading = true;
    this.workspaceReference = this.workspaceService.getReferenceById(this.workspaceId);

    Promise.all(this.group.participants.map(
      (participantReference) => this.userService.getByReference(participantReference)
    )).then((participants) => {
      this.participants = participants;
      if (this.canFilterParticipants()) {
        this.selectedParticipant = participants[0];
      }
      this.loading = false;
    });
  }

  selectParticipant(participant: any) {
    this.selectedParticipant = participant;
  }

  canFilterParticipants() {
    return this.participants && !this.resourceTemplate.configuration.showMatrix && !this.resourceTemplate.configuration.showAllVotes
  }

  getElementsByParticipant(participantId: string) {
    return this.elements.filter(element => element.author!.id === participantId);
  }

  getVotesByParticipant(participantId: string) {
    return this.elements
      .flatMap(fe => fe.votes)
      .map(voteRef => this.votes.find(v => v.id === voteRef.id))
      .filter((vote): vote is Vote => !!vote && vote.author?.id === participantId)
      .length;
  }

  get showPostItCounter() {
    return this.resourceTemplate.configuration.canAddElements;
  }

  get showVotesCounter() {
    return this.resourceTemplate.configuration.showOwnVotes && !this.resourceTemplate.configuration.showAllVotes;
  }

  ngOnDestroy(): void {
    this.groupSubscription?.unsubscribe();
    this.elementsSubscriptions.forEach(sub => sub.unsubscribe());
  }
}
