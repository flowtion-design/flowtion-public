import {Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MatExpansionModule,} from "@angular/material/expansion";
import {MatCardModule} from "@angular/material/card";
import {Subscription} from "rxjs";
import WorkspaceSummaryService from "@services/workspace-summary.service";
import {DocumentReference, Timestamp} from "@angular/fire/firestore";
import Workspace from "@interfaces/workspace.interface";
import WorkspaceSummary from "@interfaces/workspace-summary.interface";
import UserService from "@services/user.service";
import Group from "@interfaces/group.interface";

@Component({
  selector: 'app-workspace-summary',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatCardModule],
  templateUrl: './workspace-summary.component.html',
  styleUrl: './workspace-summary.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WorkspaceSummaryComponent implements OnInit, OnDestroy {

  @Input() workspaceReference: DocumentReference<Workspace>
  @Input() groupReference: DocumentReference<Group>
  workspaceSummaries: WorkspaceSummary[] = [];
  summarySubscription: Subscription;

  constructor(
    private workspaceSummaryService: WorkspaceSummaryService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.summarySubscription = this.workspaceSummaryService.getWorkspaceSummaryByWorkspace(this.workspaceReference)
      .subscribe(summary => {
        this.addWorkspaceSummary(summary);
      });
  }

  addWorkspaceSummary(summaries: WorkspaceSummary[]) {
    summaries.forEach(summary => {
      if ((summary.participant && summary.participant.id === this.userService.getUserIdFromStorage()!) || (!summary.participant && summary.group.id === this.groupReference?.id ))  {
        let time: Date;
        if (summary.time instanceof Timestamp) {
          time = summary.time.toDate();
        } else {
          time = new Date(summary.time);
        }
        summary.time = time;

        const index = this.workspaceSummaries.findIndex(s => s.id === summary.id);

        if (index > -1) {
          this.workspaceSummaries[index] = summary;
        } else {
          this.workspaceSummaries.push(summary);
        }
        this.workspaceSummaries = this.workspaceSummaries.sort((a, b) =>  a.time.getTime() - b.time.getTime());
      }
    })
  }

  ngOnDestroy() {
    this.summarySubscription.unsubscribe();
  }
}
