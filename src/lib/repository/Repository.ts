import { AnyObject } from "../Constants";

/**
 * Repositório abstrato, usado pelos tópicos e publishers
 */
export default class Repository<T> {

   find(criteria: AnyObject, options: AnyObject, callback: (err?: Error, rows?: Array<T>) => void): void {
      callback(undefined, undefined);
   }

   count(criteria: AnyObject, options: AnyObject, callback: (err?: Error, total?: number) => void): void {
      callback(undefined, 0);
   }

   findOne(criteria: AnyObject, options: AnyObject, callback: (err?: Error, row?: T) => void): void {
      callback(undefined, undefined);
   }

   insert(data: Partial<T>, options: AnyObject, callback: (err?: Error, row?: T) => void): void {
      callback(undefined, undefined);
   }

   update(criteria: AnyObject, data: Partial<T>, options: AnyObject, callback: (err?: Error, updated?: number) => void): void {
      callback(undefined, 0);
   }

   remove(criteria: AnyObject, options: AnyObject, callback: (err?: Error, removed?: number) => void): void {
      callback(undefined, 0);
   }
}
