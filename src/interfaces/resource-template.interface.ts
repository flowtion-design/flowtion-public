import Field from "./field.interface";
import ResourceConfiguration from "./resource-configuration.interface";

export default interface ResourceTemplate {
    id?: string;
    name: string;
    optionalFields: Map<string, Field>;
    requiredFields: Map<string, Field>;
    configuration: ResourceConfiguration;
}
