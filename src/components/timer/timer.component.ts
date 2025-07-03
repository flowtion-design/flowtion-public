import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {interval, Subscription} from 'rxjs';
import {add, differenceInMilliseconds, addMilliseconds, minutesToMilliseconds} from 'date-fns';
import {DocumentReference} from "@angular/fire/firestore";
import Resource from "src/interfaces/resource.interface";
import ResourceService from "src/services/resource.service";
import {NgIf} from "@angular/common";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [NgIf, MatButtonModule, MatIconModule],
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.scss'
})
export class TimerComponent implements OnInit, OnDestroy {
  @Input() resource: Resource;
  @Input() resourceRef: DocumentReference<Resource>;
  @Input() showControls: boolean = false;
  
  timeLeft: number = 0;
  displayTime: string = '00:00';
  private timerSubscription?: Subscription;

  constructor(private resourceService: ResourceService) {}

  ngOnInit() {
    if (this.resource.finishTime && !this.resource.stoppedAt) {
      //Time is running, set the timer updates
      this.startTimeUpdate();
    } else {
      this.updateTimeLeft();
    }
  }

  startTimer(): void {
    if (this.resource.timer) {
      const finishTime = add(new Date(), { minutes: parseInt(this.resource.timer) });
      // Start displaying the time immediately
      this.resource.finishTime = finishTime;
      this.startTimeUpdate();
      
      // Update Firebase in the background
      this.resourceService.updateResource(this.resourceRef, {finishTime});
    }
  }

  pauseResumeTimer(): void {
    if (!this.resource.timer) return;

    if (this.resource.stoppedAt && this.resource.finishTime) {
      // Resume
      const remainingTime = differenceInMilliseconds(
        this.resource.finishTime,
        this.resource.stoppedAt
      );
      const newFinishTime = addMilliseconds(new Date(), remainingTime);
      
      // Update local state immediately
      this.resource.finishTime = newFinishTime;
      this.resource.stoppedAt = undefined;
      this.startTimeUpdate();
      
      // Update Firebase in the background
      const updatedFields = {
        finishTime: newFinishTime,
        deleteFields: ['stoppedAt'] as (keyof Resource)[]
      };
      this.resourceService.updateResource(this.resourceRef, updatedFields);
    } else {
      // Pause
      const stoppedAt = new Date();
      // Update local state immediately
      this.resource.stoppedAt = stoppedAt;
      if (this.timerSubscription) {
        this.timerSubscription.unsubscribe();
      }
      
      // Update Firebase in the background
      this.resourceService.updateResource(this.resourceRef, {stoppedAt});
    }
  }

  private startTimeUpdate(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }

    this.timerSubscription = interval(500).subscribe(() => {
      this.updateTimeLeft();
    });
  }

  private updateTimeLeft(): void {
    if (this.resource.stoppedAt && this.resource.finishTime) {
      this.timeLeft = differenceInMilliseconds(
        this.resource.finishTime,
        this.resource.stoppedAt
      );
    } else if (this.resource.finishTime) {
      this.timeLeft = differenceInMilliseconds(
        this.resource.finishTime,
        new Date()
      );
    } else {
      this.timeLeft = minutesToMilliseconds(parseInt(this.resource.timer!));
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.displayTime = '00:00';
      if (this.timerSubscription) {
        this.timerSubscription.unsubscribe();
      }
      return;
    }

    const minutes = String(Math.floor(this.timeLeft / 60000)).padStart(2, '0');
    const seconds = String(Math.floor((this.timeLeft % 60000) / 1000)).padStart(2, '0');
    this.displayTime = `${minutes}:${seconds}`;
  }

  ngOnDestroy() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
}
