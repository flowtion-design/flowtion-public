import {Component, Input, OnInit} from '@angular/core';
import {MatrixComponent} from "@components/matrix/matrix.component";
import Resource from "@interfaces/resource.interface";
import {DocumentReference} from "@angular/fire/firestore";
import Workspace from "@interfaces/workspace.interface";
import RoleInWorkspace from "@interfaces/role-in-workspace.interface";
import {getConfigurationByRole} from "@utils/role-configuration";
import RoleInWorkspaceService from "@services/role-in-workspace.service";
import UserService from "@services/user.service";
import RoleConfiguration from "@interfaces/role-configuration.inteface";
import Group from "@interfaces/group.interface";
import GroupService from "@services/group.service";
import Element from "@interfaces/element.interface";
import {Subscription} from "rxjs";
import ElementService from "@services/element.service";
import {CommonModule} from "@angular/common";
import {PostItComponent} from "@components/post-it/post-it.component";
import ResourceTemplate from "@interfaces/resource-template.interface";
import User from "@interfaces/user.interface";
import {MatButtonModule, MatFabButton} from "@angular/material/button";
import {MatIcon, MatIconModule} from "@angular/material/icon";
import {ResourceStatus, Role} from "@utils/enums";
import ResourceWithTemplate from "@interfaces/resource-with-template.interface";
import VoteService from "@services/vote.service";
import PopulatedElement from "@interfaces/populated-element.interface";
import {RotationComponent} from "@components/rotation/rotation.component";
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-resource',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatrixComponent,
    PostItComponent,
    RotationComponent,
    MatFabButton,
    MatIcon,
    MatTooltipModule
  ],
  templateUrl: './resource.component.html',
  styleUrl: './resource.component.scss'
})
export class ResourceComponent implements OnInit {
  @Input() positioning: {
    width: number,
    height: number,
    left: number,
    top: number,
    scale: number,
  }

  @Input() preview!: boolean;
  @Input() workspaceReference: DocumentReference<Workspace>;
  @Input() groupReference: DocumentReference<Group>;
  @Input() selectedParticipant?: User;
  @Input() resourcesWithTemplates: ResourceWithTemplate[];
  @Input() drawAudio: boolean;
  @Input() collapsed: boolean;

  elementSubscriptions: Map<string, Subscription> = new Map();
  roleConfiguration: RoleConfiguration;
  populatedElements: PopulatedElement[] = [];
  group: Group;
  color: string;
  loading: boolean = true;
  postItsCreated: number = 0;

  constructor(
    private roleInWorkspaceService: RoleInWorkspaceService,
    private elementService: ElementService,
    private groupService: GroupService,
    private userService: UserService,
    private voteService: VoteService,
  ) {}

  ngOnInit() {
    if (this.drawAudio === undefined) this.drawAudio = false;
    if (this.collapsed === undefined) this.collapsed = false;

    const userId = this.userService.getUserIdFromStorage()!;
    this.roleInWorkspaceService.getUserRoleInWorkspace(userId, this.workspaceReference)
      .then((role: RoleInWorkspace) => {
        this.roleConfiguration = getConfigurationByRole(role.role);
        if (role.role === Role.Participant) {
          this.color = role.color!;
        }
        this.groupService.observeByReference(this.groupReference).subscribe((group: Group) => {
          this.group = group;
          this.updateElementSubscriptions(group.elements);
          this.loading = false;
        });
      });
  }

  private updateElementSubscriptions(elementReferences: DocumentReference<Element>[]): void {
    // Step 1: Get id of the elements that are not in the list
    const deletedElements = [...this.elementSubscriptions.keys()].filter(
      (elementId: string) => !elementReferences.some(
        (elementReference: DocumentReference<Element>) =>
          elementReference.id === elementId
      )
    );

    // Step 2: Unsubscribe from deleted elements
    deletedElements.forEach((elementId: string) => {
      this.elementSubscriptions.get(elementId)!.unsubscribe();
      this.elementSubscriptions.delete(elementId);
    });

    // Step 3: Remove deleted elements from the list
    this.populatedElements = this.populatedElements.filter(({element}) => !deletedElements.includes(element.id!));

    // Step 4: Subscribe to new elements
    elementReferences.forEach((elementReference: DocumentReference<Element>) => {
      if (!this.elementSubscriptions.has(elementReference.id)) {
        this.elementSubscriptions.set(elementReference.id,
          this.elementService.observeByReference(elementReference).subscribe((element: Element) => {
            const index = this.populatedElements.findIndex(({element: e}) => e.id === element.id);
            if (index !== -1) {
              // Step 5a: The element already exists, so I need to update it and its votes
              const currentElement = this.populatedElements[index];
              const currentVotes = this.populatedElements[index].votes;
              const newVoteIds = element.votes.map(v => v.id);
              const currentVoteIds = currentElement.votes.map(v => v.id!);

              // Remove votes that are no longer present
              this.populatedElements[index].votes = currentVotes.filter(vote => newVoteIds.includes(vote.id!));

              // Add new votes that aren't already present
              const votesToAdd = newVoteIds.filter(id => !currentVoteIds.includes(id));
              if (votesToAdd.length > 0) {
                Promise.all(element.votes
                  .filter(ref => votesToAdd.includes(ref.id))
                  .map(ref => this.voteService.getByReference(ref))
                ).then((newVotes) => {
                  this.populatedElements[index].votes.push(...newVotes);
                });
              }

              // Finally, update the element's reference
              this.populatedElements[index].element = element;

            } else {
              // Step 5b: The element is new, so I need to add it to the list with its author and votes
              Promise.all([
                element.author ? this.userService.getByReference(element.author) : Promise.resolve(undefined),
                Promise.all(element.votes.map(ref => this.voteService.getByReference(ref)))
              ]).then(([author, votes]) => {
                this.populatedElements.push({ element, author: author, votes: votes });
              });
            }
          })
        );
      }
    });
  }

  get currentResource(): Resource {
    return this.currentResourceWithTemplate.resource;
  }

  get currentResourceTemplate(): ResourceTemplate {
    return this.currentResourceWithTemplate.template;
  }

  get currentResourceWithTemplate(): ResourceWithTemplate {
    return  this.resourcesWithTemplates[this.resourcesWithTemplates.length - 1];
  }

  get isOngoing(): boolean {
    return this.currentResource.status === ResourceStatus.Ongoing;
  }

  get gridSize()  {
    const rows = Math.ceil(Math.sqrt(this.elements.length / (this.positioning.width / this.positioning.height)));
    const columns = Math.ceil(this.elements.length / rows);
    return {
      width: (columns * 220) + 'px', //200px for the post-it width + 20px for margin
      height: (rows * 220) + 'px', //200px for the post-it height + 20px for margin
    }
  }

  get scaledBoxShadow(): string {
    const s = (v: number) => (v / this.positioning.scale).toFixed(2);
    return `
    0px ${s(3)}px ${s(5)}px ${s(-1)}px rgba(0, 0, 0, 0.2),
    0px ${s(6)}px ${s(10)}px 0px rgba(0, 0, 0, 0.14),
    0px ${s(1)}px ${s(18)}px 0px rgba(0, 0, 0, 0.12)
  `;
  }

  get scaledButtonStyle() {
    return {
      left: ((this.positioning.left + this.positioning.width - 68) / this.positioning.scale) + 'px',
      top: ((this.positioning.top + this.positioning.height - 68) / this.positioning.scale) + 'px',
      width: (56 / this.positioning.scale) + 'px',
      height: (56 / this.positioning.scale) + 'px',
      boxShadow: this.scaledBoxShadow
    };
  }

  get scaledCounterStyle() {
    return {
      left: ((this.positioning.left + this.positioning.width - 140) / this.positioning.scale) + 'px',
      top: ((this.positioning.top + this.positioning.height - 68) / this.positioning.scale) + 'px',
      width: (56 / this.positioning.scale) + 'px',
      height: (56 / this.positioning.scale) + 'px'
    };
  }

  get scaledPostItNumberStyle() {
    return {
      fontSize: (24 / this.positioning.scale) + 'px',
    }
  }

  get scaledVotesNumberStyle() {
    return {
      fontSize: (24 / this.positioning.scale) + 'px',
      width: (40 / this.positioning.scale) + 'px',
      height: (40 / this.positioning.scale) + 'px'
    }
  }

  get scaledVotesStyle() {
    return {
      left: ((this.positioning.left + this.positioning.width - 140) / this.positioning.scale) + 'px',
      top: ((this.positioning.top + this.positioning.height - 68) / this.positioning.scale) + 'px',
      fontSize: (65 / this.positioning.scale) + 'px'
    };
  }

  get scaledIconStyle() {
    return {
      width: (24 / this.positioning.scale) + 'px',
      height: (24 / this.positioning.scale) + 'px',
      fontSize: (24 / this.positioning.scale) + 'px',
    }
  }

  get centerLoading() {
    return {
      top: (this.positioning.top + (this.positioning.height / 2)) / this.positioning.scale + 'px',
      left: (this.positioning.left + (this.positioning.width / 2)) / this.positioning.scale + 'px',
      width: (50 / this.positioning.scale) + 'px',
      margin: 0
    }
  }

  get matrixResource() {
    return this.resourcesWithTemplates.filter(({template}) => template.configuration.showMatrix)[0];
  }

  get showPages() {
    return this.currentResourceTemplate.configuration.showPages;
  }

  get showAsGrid() {
    return this.currentResourceTemplate.configuration.showOwnVotes && !this.matrixResource;
  }

  get canAddElements() {
    return this.roleConfiguration.canAddElements &&
      this.currentResource.status === ResourceStatus.Ongoing &&
      (this.currentResourceTemplate.configuration.canAddElements ||
        this.currentResourceTemplate.configuration.canAddAnonymousElements)
  }

  get positionedElements(): PopulatedElement[] {
    return this.populatedElements.filter(e => this.isPositioned(e));
  }

  get unpositionedElements(): PopulatedElement[] {
    return this.populatedElements.filter(e => !this.isPositioned(e));
  }

  get elements() {
    const authorId: string = this.selectedParticipant ?
      this.selectedParticipant!.id! :
      this.userService.getUserIdFromStorage()!;

    if (!this.currentResourceTemplate.configuration.showAllElements) {
      return this.positionedElements.filter(({element}) => element.author?.id === authorId);
    } else {
      return this.positionedElements
    }
  }

  get canVote() {
    return this.currentResourceTemplate.configuration.showAllVotes
      ? this.populatedElements.filter(element => element.votes.length > 0).length != this.currentResource.totalVotes
      : this.populatedElements.map(fe => fe.votes).flat().filter(vote => vote.author.id === this.userService.getUserFromStorage()!.id).length != this.currentResource.totalVotes
  }

  get votes() {
    const authorId: string = this.selectedParticipant ?
      this.selectedParticipant!.id! :
      this.userService.getUserIdFromStorage()!;

    return this.currentResourceTemplate.configuration.showAllVotes
      ? this.populatedElements.filter(element => element.votes.length > 0).length
      : this.populatedElements.map(fe => fe.votes).flat().filter(vote => vote.author.id === authorId).length
  }

  get postItContext() {
    return {
      canVote: this.canVote,
      preview: this.preview,
      drawAudio: this.drawAudio,
      isOngoing: this.isOngoing,
      groupReference: this.groupReference,
      roleConfiguration: this.roleConfiguration,
      selectedParticipant: this.selectedParticipant,
      resourceConfiguration: this.currentResourceTemplate.configuration
    };
  }

  get filterElements() {
    const authorId: string = this.selectedParticipant ?
          this.selectedParticipant!.id! :
          this.userService.getUserIdFromStorage()!;

    return this.positionedElements.filter(({element}) => element.author?.id === authorId);
  }

  get pageId(): string {
    const userId = this.userService.getUserIdFromStorage()!;
    const participants = this.group.participants;
    const startPageIndex = participants.findIndex(participant => participant.id === userId);
    return participants[(startPageIndex + (this.currentResource.currentRotation || 0)) % participants.length].id;
  }

  isPositioned(populatedElement: PopulatedElement): boolean {
    return !this.matrixResource || populatedElement.element.positioned;
  }

  addElement() {
    if (this.canAddElements) {
      const isAnonymous = this.currentResourceTemplate.configuration.canAddAnonymousElements;
      const element: Element = {
        ...( !isAnonymous && {
          author: this.userService.getReferenceById(this.userService.getUserIdFromStorage()!)
        }),
        x: (this.positioning.left + (this.positioning.width / 2) - 75) / this.positioning.scale + (10 * this.postItsCreated),
        y: (this.positioning.top + (this.positioning.height / 2) - 75) / this.positioning.scale + (10 * this.postItsCreated),
        votes: [],
        color: isAnonymous ? '#D4D4D4' : this.color,
        positioned: this.currentResourceTemplate.configuration.showMatrix,
        creationDate: new Date(),
        ...(this.showPages && {
          pageId: this.pageId
        }),
      };

      this.elementService.create(element).then((element) => {
        this.groupService.addElement(this.groupReference, element).then(() => {
          this.postItsCreated++;
          console.debug("Element added to group", element, this.groupReference);
        });
      });
    }
  }
}
