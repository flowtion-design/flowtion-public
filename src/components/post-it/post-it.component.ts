import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragEnd, Point} from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { DocumentReference } from '@angular/fire/firestore';

import ElementService from 'src/services/element.service';
import StorageService from 'src/services/storage.service';
import GroupService from 'src/services/group.service';
import UserService from 'src/services/user.service';
import VoteService from "src/services/vote.service";

import ResourceConfiguration from 'src/interfaces/resource-configuration.interface';
import RoleConfiguration from 'src/interfaces/role-configuration.inteface';
import Element from 'src/interfaces/element.interface';
import Group from 'src/interfaces/group.interface';
import User from 'src/interfaces/user.interface';
import Vote from 'src/interfaces/vote.interface';

import { ConfirmDialogComponent } from '@components/confirm-dialog/confirmg-dialog.component';

@Component({
  selector: 'app-post-it',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, MatIconModule],
  templateUrl: './post-it.component.html',
  styleUrls: ['./post-it.component.scss']
})
export class PostItComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild('postIt') postIt!: ElementRef<HTMLDivElement>;
  @ViewChild('contentArea') contentArea!: ElementRef<HTMLTextAreaElement>;
  @Input() element: Element;
  @Input() groupReference: DocumentReference<Group>;
  @Input() resourceConfiguration: ResourceConfiguration;
  @Input() roleConfiguration: RoleConfiguration;
  @Input() sidebarIndex?: number;
  @Input() preview: boolean = false;
  @Input() canVote: boolean = false;
  @Input() selectedParticipant?: User;
  @Input() scale: number;
  @Input() author?: User;
  @Input() votes: Vote[] = [];
  @Input() drawAudio: boolean = false;
  @Input() isOngoing: boolean = false;
  @Input() hideContent: boolean = false;
  @Input() positioning: {
    width: number,
    height: number,
    left: number,
    top: number,
    scale: number,
  }
  @Input() layoutMode: 'absolute' | 'stacked' | 'grid' = 'absolute';
  private elementReference: DocumentReference<Element>;
  private userReference: DocumentReference<User>;
  isEditing: boolean = false;
  showOptions: boolean = false;
  position: Point;
  votingInProgress = false;
  expanded = false;

  constructor(
    private elementService: ElementService,
    private storageService: StorageService,
    private groupService: GroupService,
    private userService: UserService,
    private voteService: VoteService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.elementReference = this.elementService.getReferenceById(this.element.id!);
    this.userReference = this.userService.getReferenceById(this.userService.getUserIdFromStorage()!);
  }

  ngAfterViewInit() {
    const newPosition = (this.isOnSidebar) ? this.sidebarPosition : {x: this.element.x, y: this.element.y}
    this.setPosition(newPosition);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['positioning'] || changes['sidebarIndex'] || changes['element']) {
      const newPosition = (this.isOnSidebar) ? this.sidebarPosition : {x: this.element.x, y: this.element.y}
      this.setPosition(newPosition);
    }
  }

  get isOnSidebar(): boolean {
    return this.sidebarIndex !== undefined;
  }

  get transformStyle(): string {
    return `scale(${this.isOnSidebar ? (1 / this.positioning.scale) : 1})`;
  }

  get canEdit() {
    return this.isOngoing &&
      this.roleConfiguration.canEditElements &&
      (this.resourceConfiguration.canEditAnyElement ||
        (this.resourceConfiguration.canEditOwnElement && this.element.author?.id === this.userReference.id) ||
        (this.resourceConfiguration.canEditAnonymousElement && this.element.author === undefined)
      );
  }

  get canDelete() {
    return this.isOngoing &&
      this.roleConfiguration.canRemoveElements &&
      (this.resourceConfiguration.canRemoveAnyElement ||
        (this.resourceConfiguration.canRemoveOwnElement && this.element.author?.id === this.userReference.id) ||
        (this.resourceConfiguration.canRemoveAnonymousElement && this.element.author === undefined)
      );
  }

  get canDrag() {
    return this.isOngoing && this.roleConfiguration.canDragElements && (this.resourceConfiguration.canDragAnyElement);
  }

  get hasVoted() {
    return this.resourceConfiguration.showAllVotes 
      ? this.element.votes.length > 0
      : this.votes.some(vote => vote.author.id === this.userReference.id);
  }

  get voteCount() {
    if (this.resourceConfiguration.showAllVotes) {
      return this.element.votes.length > 0 ? 1 : 0;
    } else if (this.resourceConfiguration.showOwnVotes) {
      const authorId = this.selectedParticipant ? this.selectedParticipant.id! : this.userReference.id;
      return this.votes.filter(vote => vote.author.id === authorId).length
    }
    return 0;
  }

  get sidebarPosition(): Point {
    return {
      x: (this.positioning.left + this.positioning.width - 245),
      y: (this.positioning.top + 120 + (this.sidebarIndex! * 250))
    };
  }

  get showThumb() {
    return this.isOngoing && this.roleConfiguration.canVote && this.resourceConfiguration.canVote;
  }

  get lineClamp() {
    if (!this.expanded) {
      const postItInnerHeight = 180;
      const audioHeight = this.element.audio ? 34 : 0;
      const imageHeight = this.element.image ? 104 : 0;
      const lineHeight = 20;

      const contentHeight = postItInnerHeight - imageHeight - audioHeight;
      return Math.floor(contentHeight / lineHeight);

    }
    return 1000;
  }

  editContent() {
    if (this.canEdit) {
      this.expanded = true;
      this.isEditing = true;
      setTimeout(() => {
        if (this.contentArea) {
          const textArea = this.contentArea.nativeElement;
          textArea.focus();
          textArea.setSelectionRange(textArea.value.length, textArea.value.length);
        }
      });
    }
  }

  saveContent() {
    this.isEditing = false;
    this.expanded = false;
    this.elementService.updateContent(this.elementReference, this.element.content || '')
      .then(() => {
        console.debug("Updated content of element", this.elementReference, this.element);
      })
      .catch((error) => {
        console.error("Error updating element content", error);
      });
  }

  uploadFile(event: Event, type: 'image' | 'audio') {
    const files = (event.target as HTMLInputElement).files as FileList;

    if (files.length > 0) {
      const file = files[0];
      this.storageService.uploadFile(file, `elements/${this.groupReference.id}/${type}s`, this.elementReference.id)
        .then(result => {
          this.storageService.getDownloadUrl(result.fullPath).then(url => {
            console.debug("Uploaded file", url);
            if (type === 'image') {
              this.elementService.updateImage(this.elementReference, url)
          } else {
              this.elementService.updateAudio(this.elementReference, url)
            }
          })
        })
        .catch(error => {
          console.error("Error uploading file:", error);
        })
    }
  }

  deletePostIt() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { message: "¿Estás seguro que querés eliminar el post-it?" }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.groupService.removeElement(this.groupReference, this.elementReference)
      .then(() => {
        console.debug("Successfully removed element from group", this.groupReference, this.elementReference);
        this.elementService.delete(this.elementReference)
      })
      .catch((error) => {
        console.error("Error removing element from group", error);
      });
      }
    })
  }

  updatePosition(event: CdkDragEnd) {
    const element: Partial<Element> = {
      x: event.source.getFreeDragPosition().x / this.scale,
      y: event.source.getFreeDragPosition().y / this.scale,
      ...(this.sidebarIndex !== undefined ? { positioned: true } : {})
    };
    this.elementService.updateElement(this.elementReference, element)
      .then(() => {
        console.debug("Updated position of element", this.elementReference);
      })
      .catch((error) => {
        console.error("Error updating element position", error);
      });
  }

  setPosition(newPosition: Point) {
    this.position = {x: (newPosition.x * (!this.isOnSidebar ? this.scale : 1)), y: (newPosition.y * (!this.isOnSidebar ? this.scale : 1))}
  }

  removeAudio() {
    this.elementService.deleteAudio(this.elementReference)
  }

  removeImage() {
    this.elementService.deleteImage(this.elementReference)
  }

  addVote() {
    this.votingInProgress = true;
    if (!this.hasVoted) {
      const vote: Vote = {
        author: this.userReference,
      }
      this.voteService.create(vote).then((voteReference) => {
        this.elementService.addVote(this.elementReference, voteReference).then(() => this.votingInProgress = false)
      })
    }
  }

  removeVote() {
    this.votingInProgress = true;
    if (this.resourceConfiguration.showAllVotes) {
      this.votingInProgress = true;

      const votesToDelete = [...this.element.votes];

      const deleteVotes = votesToDelete.map(voteReference =>
        this.elementService.removeVote(this.elementReference, voteReference)
          .then(() => this.voteService.delete(voteReference))
          .then(() => console.debug("Successfully deleted vote", voteReference))
          .catch(error => console.error("Error deleting vote", voteReference, error))
      );

      Promise.all(deleteVotes).finally(() => {
        this.votingInProgress = false;
      });
      
    } else {
      const voteFromAuthor = this.votes.find(vote => vote.author.id === this.userReference.id);
      if (voteFromAuthor) {
        const voteReference = this.voteService.getReferenceById(voteFromAuthor.id!);
        this.elementService.removeVote(this.elementReference, voteReference).then(
          () => {
            this.voteService.delete(voteReference).then(
              () => {
                console.debug("Successfully deleted vote", voteReference);
                this.votingInProgress = false;
              }
            )
          }
        )
      }
    }
    
  }

  expand() {
    this.expanded = true;
  }

  collapseOnBlur() {
    if (!this.isEditing) {
      this.expanded = false;
    }
  }

  collapse() {
    this.expanded = false;
  }
}
