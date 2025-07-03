import {Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild} from '@angular/core';
import User from "@interfaces/user.interface";
import {DocumentReference} from "@angular/fire/firestore";
import PopulatedElement from "@interfaces/populated-element.interface";
import {CommonModule} from "@angular/common";
import {PostItComponent} from "@components/post-it/post-it.component";
import Group from "@interfaces/group.interface";
import RoleConfiguration from "@interfaces/role-configuration.inteface";
import ResourceConfiguration from "@interfaces/resource-configuration.interface";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";

@Component({
  selector: 'app-book-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, PostItComponent],
  templateUrl: './book-page.component.html',
  styleUrl: './book-page.component.scss'
})
export class BookPageComponent implements OnChanges {
  @ViewChild('page', { static: false }) pageElement!: ElementRef<HTMLDivElement>;
  @Input() pageIndex: number;
  @Input() elements: PopulatedElement[] = [];
  @Input() position: 'left' | 'middle' |'right';
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
  @Input() positioning: {
    width: number,
    height: number,
    left: number,
    top: number,
    scale: number,
  }

  constructor() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['elements'] && changes['elements'].previousValue && changes['elements'].currentValue && changes['elements'].currentValue.length > changes['elements'].previousValue.length) {
      if (this.pageElement) {
        if (this.isMiddlePage) {
          this.scrollToBottom();
        }
      }
    }
  }

  get isMiddlePage(): boolean {
    return this.position === 'middle';
  }

  get pageText(): string {
    switch (this.position) {
      case 'left':
        return 'Siguiente';
      case 'middle':
        return 'Actual';
      case 'right':
        return 'Anterior';
      default:
        return '';
    }
  }

  scrollToBottom() {
    this.pageElement.nativeElement.scrollTo({
      top: this.pageElement.nativeElement.scrollHeight,
      behavior: 'smooth'
    });
  }
}
