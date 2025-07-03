import Resource from "@interfaces/resource.interface";
import ResourceTemplate from "@interfaces/resource-template.interface";

export default interface ResourceWithTemplate {
  resource: Resource;
  template: ResourceTemplate;
}
