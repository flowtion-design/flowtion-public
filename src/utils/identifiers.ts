import {ResourceStatus} from "@utils/enums";

export const ResourceStatusLabels: Record<ResourceStatus, string> = {
  [ResourceStatus.Finished]: 'Finalizada',
  [ResourceStatus.Ongoing]: 'En curso',
  [ResourceStatus.Paused]: 'Pausada',
  [ResourceStatus.Waiting]: 'No iniciada',
};

export const ResourceStatusClasses: Record<ResourceStatus, string> = {
  [ResourceStatus.Finished]: 'status-finished',
  [ResourceStatus.Ongoing]: 'status-ongoing',
  [ResourceStatus.Paused]: 'status-paused',
  [ResourceStatus.Waiting]: 'status-waiting',
}
