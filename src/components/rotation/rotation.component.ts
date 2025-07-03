import {Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import { BookPageComponent } from "@components/book-page/book-page.component";
import User from "@interfaces/user.interface";
import {DocumentReference} from "@angular/fire/firestore";

import {CommonModule} from "@angular/common";
import PopulatedElement from "@interfaces/populated-element.interface";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import UserService from "@services/user.service";
import Group from "@interfaces/group.interface";
import RoleConfiguration from "@interfaces/role-configuration.inteface";
import ResourceConfiguration from "@interfaces/resource-configuration.interface";

@Component({
  selector: 'app-rotation',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    BookPageComponent,
  ],
  templateUrl: './rotation.component.html',
  styleUrl: './rotation.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RotationComponent implements OnInit, OnChanges {

  @Input() participants: DocumentReference<User>[];
  @Input() elements: PopulatedElement[];
  @Input() currentRotations: number;
  @Input() positioning: {
    width: number,
    height: number,
    left: number,
    top: number,
    scale: number,
  }
  @Input() postItContext: {
    canVote: boolean,
    preview: boolean,
    drawAudio: boolean,
    isOngoing: boolean,
    groupReference: DocumentReference<Group>,
    roleConfiguration: RoleConfiguration,
    selectedParticipant?: User,
    resourceConfiguration: ResourceConfiguration,
  }

  readonly visiblePages = [0, 1, 2];
  loading: boolean = false;
  userId: string;


  constructor(private userService: UserService) {}

  ngOnInit() {
    this.userId = this.postItContext.selectedParticipant ?
      this.postItContext.selectedParticipant.id! :
      this.userService.getUserIdFromStorage()!;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['postItContext']) {
      this.userId = this.postItContext.selectedParticipant ?
        this.postItContext.selectedParticipant.id! :
        this.userService.getUserIdFromStorage()!;
    }
  }

  get scaledContainerStyle() {
    return {
      transform: `scale(${1 / this.positioning.scale})`,
      top: (this.positioning.top ) + 'px',
      left: (this.positioning.left ) + 'px',
      width: (this.positioning.width ) + 'px',
      height: (this.positioning.height ) + 'px',
    };
  }

  get middlePageIndex() {
    const startPageIndex = this.participants.findIndex(participant => participant.id === this.userId);
    return (startPageIndex + this.currentRotations) % this.participants.length;
  }

  get leftPageIndex() {
    return (this.middlePageIndex + 1) % this.participants.length;
  }

  get rightPageIndex() {
    return (this.middlePageIndex - 1 + this.participants.length) % this.participants.length
  }

  getIndexInPosition(position: 'left' | 'middle' | 'right'): number {
    switch (position) {
      case 'left':
        return this.leftPageIndex;
      case 'middle':
        return this.middlePageIndex;
      case 'right':
        return this.rightPageIndex;
      default:
        throw new Error(`Invalid position: ${position}`);
    }
  }

  positionClass(i: number): 'left' | 'middle' | 'right' {
    const classes: ('left' | 'middle' | 'right')[] = ['left', 'middle', 'right'];
    return classes[i % 3];
  }

  getUserReferenceFor(positionIndex: number) {
    return this.participants[this.getIndexInPosition(this.positionClass(positionIndex))];
  }

  getElementsFor(positionIndex: number): PopulatedElement[] {
    const userReference = this.getUserReferenceFor(positionIndex);
    return this.elements
      .filter(element => element.element.pageId === userReference.id)
      .sort((a, b) => a.element.creationDate.getTime() - b.element.creationDate.getTime());
  }

  getTransform(index: number): { transform?: string } {
    const position = this.positionClass(index);
    if (position !== 'middle' && this.postItContext.drawAudio) {
      return { transform: 'scale(0.9)' };
    }
    return {};
  }
}

