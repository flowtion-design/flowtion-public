import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {CommonModule} from "@angular/common";
import User from "@interfaces/user.interface";
import {ResourceInfoComponent} from "@components/resource-info/resource-info.component";
import {DocumentReference} from "@angular/fire/firestore";
import Workspace from "@interfaces/workspace.interface";
import WorkspaceService from "@services/workspace.service";
import { Subscription} from "rxjs";
import {Router} from "@angular/router";
import ResourceService from "@services/resource.service";
import {ResourceComponent} from "@components/resource/resource.component";
import ResourceTemplateService from "@services/resource-template.service";
import UserService from "@services/user.service";
import Group from "@interfaces/group.interface";
import GroupService from "@services/group.service";
import ResourceWithTemplate from "@interfaces/resource-with-template.interface";
import { HostListener } from '@angular/core';
import { ResourceStatus } from '@utils/enums';
import { MatExpansionModule } from '@angular/material/expansion';
import {WorkspaceSummaryComponent} from "@components/workspace-summary/workspace-summary.component";
import {MatSnackBar} from "@angular/material/snack-bar";
import { WorkspaceInfoAndActionsComponent } from '@components/workspace-info-and-actions/workspace-info-and-actions.component';
import {ResourceStatusLabels} from "@utils/identifiers";


@Component({
  selector: 'app-white-board',
  standalone: true,
  imports: [CommonModule, ResourceInfoComponent, ResourceComponent, MatExpansionModule, WorkspaceSummaryComponent, WorkspaceInfoAndActionsComponent],
  templateUrl: './white-board.component.html',
  styleUrl: './white-board.component.scss',
})
export class WhiteBoardComponent implements OnInit, AfterViewChecked, OnDestroy {
  @Input() preview: boolean;
  @Input() workspaceId: string;
  @Input() selectedParticipant?: User;
  @Input() backgroundElement: HTMLElement;
  @Input() groupReference?: DocumentReference<Group>;

  @ViewChild('boardContainer') boardContainer: ElementRef<HTMLDivElement>;
  @ViewChild('boardContent') boardContent: ElementRef<HTMLDivElement>;
  @ViewChild('minimap') minimap: ElementRef<HTMLDivElement>;
  @ViewChild('viewport') viewport: ElementRef<HTMLDivElement>;

  loading: boolean = true;
  workspaceEnded: boolean = false;
  shouldCalculateContainers: boolean = false;
  hasCalculatedContainers: boolean = false;

  dragging = false;
  minimapDragging = false;

  // Variables to track the last mouse position
  lastX = 0;
  lastY = 0;
  offsetX = 0;
  offsetY = 0;
  lastMinimapX = 0;
  lastMinimapY = 0;

  minimapWidth: number;
  minimapHeight: number;
  containerWidth: number;
  containerHeight: number;
  boardWidth: number;
  boardHeight: number;

  scale = 1;
  maxScale = 2;
  minScale: number;

  positioning: {
    width: number,
    height: number,
    left: number,
    top: number,
    scale: number,
  }

  workspace: Workspace;
  resourcesWithTemplates: ResourceWithTemplate[] = [];
  workspaceReference: DocumentReference<Workspace>;
  workspaceSubscription: Subscription;
  resourceSubscriptions: Subscription[] = [];


  constructor(
    private resourceTemplateService: ResourceTemplateService,
    private workspaceService: WorkspaceService,
    private resourceService: ResourceService,
    private groupService: GroupService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private router: Router
) {}

  ngOnInit() {
    if (this.preview === undefined) this.preview = false;
    if (this.backgroundElement === undefined) this.backgroundElement = document.body;

    this.workspaceReference = this.workspaceService.getReferenceById(this.workspaceId);
    this.workspaceSubscription = this.workspaceService.observeByReference(this.workspaceReference).subscribe((workspace: Workspace) => {
      this.loading = true;
      this.workspace = workspace;
      if (!workspace.isVisible && !this.preview) {
        this.informChangeInVisibility()
        this.router.navigate(['/dashboard']);
        return;
      } else {
        const userId = this.userService.getUserIdFromStorage()!;
        if (typeof this.groupReference === 'undefined') {
          const userReference = this.userService.getReferenceById(userId);
          this.groupService.getUserGroupInWorkspace(userReference, workspace.groups).then((group: Group) => {
            this.groupReference = this.groupService.getReferenceById(group.id!);
            this.loadResources(workspace);
          }).catch(_ => {
            alert('No group found');
            this.router.navigate(['/dashboard']);
            return false;
          });
        } else {
          this.loadResources(workspace);
        }
      }
    })
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
          // If resource status changed, use snackbar to inform
          if (this.resourcesWithTemplates[i].resource.status !== resource.status && resource.status !== ResourceStatus.Finished) {
            this.snackBar.open(`Cambiado de estado a ${this.getResourceStatusLabel(resource.status)}`, "x", {
              horizontalPosition: 'end',
              verticalPosition: 'bottom',
              duration: 4000,
              panelClass: 'success'
            });
          }
          this.resourcesWithTemplates[i].resource = resource;
          this.workspaceEnded = this.resourcesWithTemplates.every(rt => rt.resource.status === ResourceStatus.Finished)
        } else {
          // Only fetch the template on a resource load, not change
          this.resourceTemplateService.getByReference(resource.resourceTemplate)
            .then(template => {
              this.resourcesWithTemplates[i] = {resource, template};
              const allFilled = this.resourcesWithTemplates.every(item => item != null);
              if (allFilled) {
                this.workspaceEnded = this.resourcesWithTemplates.every(rt => rt.resource.status === ResourceStatus.Finished)
                if (!this.workspaceEnded && !this.hasCalculatedContainers) this.shouldCalculateContainers = true;
                this.loading = false;
                this.cdr.detectChanges();
              }
            });
        }
      });

      this.resourceSubscriptions.push(subscription);
    });
  }

  private informChangeInVisibility() {
    this.snackBar.open("Visibilidad actualizada", "x", {
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      duration: 4000,
      panelClass: 'success'

    });
  }

  get currentResource(): ResourceWithTemplate {
    return this.resourcesWithTemplates[this.resourcesWithTemplates.length - 1];
  }

  get disableZoomAndDrag(): boolean {
    return this.currentResource.template.configuration.showPages;
  }

  getResourceStatusLabel(status: ResourceStatus): string {
    return ResourceStatusLabels[status];
  }

  ngAfterViewChecked() {
    if (this.workspaceEnded || !this.shouldCalculateContainers) return;
    console.debug("Calculating container size")
    // Initialize board and container dimensions
    this.containerWidth = this.boardContainer.nativeElement.clientWidth;
    this.containerHeight = this.boardContainer.nativeElement.clientHeight;
    this.boardWidth = this.boardContent.nativeElement.clientWidth;
    this.boardHeight = this.boardContent.nativeElement.clientHeight;
    this.minimapWidth = this.minimap.nativeElement.clientWidth;
    this.minimapHeight = this.minimap.nativeElement.clientHeight;

    // Calculate the minimum scale based on the container and board dimensions
    this.minScale = Math.max(
      this.containerWidth / this.boardWidth,
      this.containerHeight / this.boardHeight
    );

    // Set initial offsets to the center of the board
    this.offsetX = -(this.boardWidth * this.scale / 2 - this.containerWidth / 2);
    this.offsetY = -(this.boardHeight * this.scale / 2 - this.containerHeight / 2);
    this.backgroundElement.style.setProperty('--dot-offset-x', `${this.offsetX}px`);
    this.backgroundElement.style.setProperty('--dot-offset-y', `${this.offsetY}px`);

    this.updatePositioning();
    this.shouldCalculateContainers = false;
    this.hasCalculatedContainers = true;
    this.cdr.detectChanges();
  }

  @HostListener('window:resize', [])
  onResize() {
    if (!this.boardContainer || !this.boardContent) return;

    this.containerWidth = this.boardContainer.nativeElement.clientWidth;
    this.containerHeight = this.boardContainer.nativeElement.clientHeight;

    // Recalcular el mínimo scale pero que nunca sea menor a 1
    this.minScale = Math.min(1, Math.max(
      this.containerWidth / this.boardWidth,
      this.containerHeight / this.boardHeight
    ));

    // Asegurar que el zoom no esté por debajo del mínimo
    this.scale = Math.max(this.scale, this.minScale);

    // Update background dots size
    this.backgroundElement.style.setProperty('--dot-size', `${30 * this.scale}px`);
    this.backgroundElement.style.setProperty('--dot-radius', `${this.scale}px`);

    this.clampOffsets();
    this.updatePositioning();
  }

  startDrag(event: PointerEvent) {
    if (this.disableZoomAndDrag) return;
    if(event.target !== this.boardContent.nativeElement) return;
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  stopDrag() {
    if (this.dragging) {
      this.dragging = false;
    }
  }

  onDrag(event: PointerEvent) {
    if (this.disableZoomAndDrag) return;
    if (!this.dragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    this.offsetX += dx;
    this.offsetY += dy;
    this.clampOffsets();
  }

  clampOffsets() {
    const scaledWidth = this.boardWidth * this.scale;
    const scaledHeight = this.boardHeight * this.scale;

    const minOffsetX = this.containerWidth - scaledWidth;
    const minOffsetY = this.containerHeight - scaledHeight;

    this.offsetX = Math.min(0, Math.max(minOffsetX, this.offsetX));
    this.offsetY = Math.min(0, Math.max(minOffsetY, this.offsetY));

    this.backgroundElement.style.setProperty('--dot-offset-x', `${this.offsetX}px`);
    this.backgroundElement.style.setProperty('--dot-offset-y', `${this.offsetY}px`);

    this.updatePositioning();
  }

  onWheel(event: WheelEvent) {
    if (this.disableZoomAndDrag) return;
    event.preventDefault();

    const scaleChange = event.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * scaleChange));
    if (newScale === this.scale) return;

    const rect = this.boardContainer.nativeElement.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    const boardX = (cursorX - this.offsetX) / this.scale;
    const boardY = (cursorY - this.offsetY) / this.scale;

    this.scale = newScale;
    this.offsetX = cursorX - boardX * this.scale;
    this.offsetY = cursorY - boardY * this.scale;

    // Update background dots size
    this.backgroundElement.style.setProperty('--dot-size', `${30 * this.scale}px`);
    this.backgroundElement.style.setProperty('--dot-radius', `${this.scale}px`);
    this.backgroundElement.style.setProperty('--dot-offset-x', `${this.offsetX}px`);
    this.backgroundElement.style.setProperty('--dot-offset-y', `${this.offsetY}px`);

    this.clampOffsets();
  }

  updatePositioning() {
    this.positioning = {
      width: this.containerWidth,
      height: this.containerHeight,
      left: -this.offsetX,
      top: -this.offsetY,
      scale: this.scale
    };
  }

  getViewportStyle() {
    const scaleX = this.minimapWidth / this.boardWidth;
    const scaleY = this.minimapHeight / this.boardHeight;

    return {
      width: `${this.containerWidth * scaleX / this.scale}px`,
      height: `${this.containerHeight * scaleY / this.scale}px`,
      left: `${-this.offsetX * scaleX / this.scale}px`,
      top: `${-this.offsetY * scaleY / this.scale}px`,
    };
  }

  onMinimapClick(event: MouseEvent) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const scaleX = this.boardWidth / this.minimapWidth;
    const scaleY = this.boardHeight / this.minimapHeight;

    const centerX = clickX * scaleX - this.containerWidth / (2 * this.scale);
    const centerY = clickY * scaleY - this.containerHeight / (2 * this.scale);

    this.offsetX = -centerX;
    this.offsetY = -centerY;
    this.clampOffsets();
  }

  onMinimapDragStart(event: PointerEvent) {
    this.minimapDragging = true;
    this.lastMinimapX = event.clientX;
    this.lastMinimapY = event.clientY;
  }

  onMinimapDragMove(event: PointerEvent) {
    if (!this.minimapDragging) return;

    const dx = event.clientX - this.lastMinimapX;
    const dy = event.clientY - this.lastMinimapY;

    this.lastMinimapX = event.clientX;
    this.lastMinimapY = event.clientY;

    const scaleX = this.boardWidth / this.minimapWidth;
    const scaleY = this.boardHeight / this.minimapHeight;

    const moveX = dx * scaleX;
    const moveY = dy * scaleY;

    this.offsetX -= moveX;
    this.offsetY -= moveY;
    this.clampOffsets();
  }

  onMinimapDragEnd() {
    if (this.minimapDragging) {
      this.minimapDragging = false;
    }
  }

  ngOnDestroy() {
    this.workspaceSubscription?.unsubscribe();
    this.resourceSubscriptions.forEach(sub => sub.unsubscribe());

    // Remove background dots properties
    this.backgroundElement.style.removeProperty('--dot-size');
    this.backgroundElement.style.removeProperty('--dot-radius');
    this.backgroundElement.style.removeProperty('--dot-offset-x');
    this.backgroundElement.style.removeProperty('--dot-offset-y');
  }
}
