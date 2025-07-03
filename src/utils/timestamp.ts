import {
  FirestoreDataConverter,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from '@angular/fire/firestore';

/**
 * Creates a generic converter that parses specified fields as Dates.
 */
export function createDateConverter<T extends { id?: string }>(
  dateFields: (keyof T)[] = []
): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      const clone: any = { ...data };
      for (const key of dateFields) {
        if (clone[key] instanceof Date) {
          clone[key] = Timestamp.fromDate(clone[key]);
        }
      }
      return clone;
    },

    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      const data = snapshot.data() as any;
      for (const key of dateFields) {
        if (data[key]?.toDate instanceof Function) {
          data[key] = data[key].toDate();
        }
      }
      return {
        id: snapshot.id,
        ...data,
      };
    }
  };
}
