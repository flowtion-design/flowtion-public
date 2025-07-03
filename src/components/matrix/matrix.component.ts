import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatButtonModule} from "@angular/material/button";
import {PostItComponent} from "@components/post-it/post-it.component";
import PopulatedElement from "@interfaces/populated-element.interface";
import {DocumentReference} from "@angular/fire/firestore";
import Group from "@interfaces/group.interface";
import RoleConfiguration from "@interfaces/role-configuration.inteface";
import User from "@interfaces/user.interface";
import ResourceConfiguration from "@interfaces/resource-configuration.interface";
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";

@Component({
  selector: 'app-matrix',
  standalone: true,
  imports: [CommonModule, MatSidenavModule, MatButtonModule, MatIconModule, MatTooltipModule, PostItComponent ],
  templateUrl: './matrix.component.html',
  styleUrls: ['./matrix.component.scss']
})
export class MatrixComponent implements OnChanges {
  @Input() xLabel: string;
  @Input() yLabel: string;
  @Input() elements: PopulatedElement[];
  @Input() collapsed: boolean;
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

  page: number = 0;
  showPostIts: boolean = true;
  isSidebarCollapsed: boolean = false;
  readonly postItMaxHeight: number = 250;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['elements'] || changes['positioning']) {
      if (this.page > this.totalPages - 1) {
        this.page = this.totalPages - 1;
      }
    }
  }

  get scaledSidebarStyle() {
    return {
      top: ((this.positioning.top + 30) / this.positioning.scale) + 'px',
      right: (3000 - ((this.positioning.left + this.positioning.width - 30) / this.positioning.scale)) + 'px',
      height: this.isSidebarCollapsed ? '48px' : (this.positioning.height - 120) + 'px',
      transform: 'scale(' + (1 / this.positioning.scale) + ')',
    }
  }

  get unpositionedPerPage(): number {
    const availableHeight = this.positioning.height - 220;
    return Math.floor(availableHeight / this.postItMaxHeight) || 1;
  }

  get paginatedUnpositionedElements(): PopulatedElement[] {
    const start = this.page * this.unpositionedPerPage;
    return this.elements.slice(start, start + this.unpositionedPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.elements.length / this.unpositionedPerPage) || 1;
  }

  prevPage() {
    if (this.page > 0) this.page--;
  }

  nextPage() {
    if (this.page < (this.totalPages - 1)) this.page++;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    if (this.isSidebarCollapsed) {
      this.showPostIts = false;
    }
  }

  onSidebarTransitionEnd(event: TransitionEvent): void {
    // We only care about height or width transition finishing
    if ((event.propertyName === 'height' || event.propertyName === 'width') && !this.isSidebarCollapsed) {
      this.showPostIts = true;
    }
  }
}
