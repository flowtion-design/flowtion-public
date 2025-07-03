import {Component, Input} from '@angular/core';
import {MatExpansionModule} from "@angular/material/expansion";
import {MatCardModule} from "@angular/material/card";
import {TimerComponent} from "@components/timer/timer.component";
import {CommonModule} from "@angular/common";
import Resource from "@interfaces/resource.interface";
import ResourceTemplate from "@interfaces/resource-template.interface";
import {DocumentReference} from "@angular/fire/firestore";
import ResourceService from "@services/resource.service";
import ResourceWithTemplate from "@interfaces/resource-with-template.interface";
import {ResourceStatusClasses, ResourceStatusLabels} from "@utils/identifiers";

@Component({
  selector: 'app-resource-info',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatCardModule, TimerComponent],
  templateUrl: './resource-info.component.html',
  styleUrl: './resource-info.component.scss'
})
export class ResourceInfoComponent {
  @Input() resourceWithTemplate: ResourceWithTemplate;

  constructor(private resourceService: ResourceService) {
  }

  get resource(): Resource {
    return this.resourceWithTemplate.resource;
  }

  get resourceTemplate(): ResourceTemplate {
    return this.resourceWithTemplate.template;
  }

  get resourceReference(): DocumentReference<Resource> {
    return this.resourceService.getReferenceById(this.resource.id!);
  }

  get resourceStatusLabel(): string {
    return ResourceStatusLabels[this.resource.status];
  }

  get resourceStatusClass(): string {
    return ResourceStatusClasses[this.resource.status];
  }
}
