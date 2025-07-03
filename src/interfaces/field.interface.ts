export default interface Field {
  id?: string;
  name: string;
  type: string;
  options?: Map<string, string | null>;
  order?: number
}
