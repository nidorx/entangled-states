import { AnyObject } from "../Constants";

/**
 * Repositório abstrato, usado pelos tópicos e publishers
 */
export default class Repository<T> {

   find(criteria: AnyObject, options: AnyObject, callback: (err?: Error, rows?: Array<T>) => void): void {
      setTimeout(callback.bind(undefined, undefined, undefined));
   }

   findOne(criteria: AnyObject, options: AnyObject, callback: (err?: Error, row?: T) => void): void {
      setTimeout(callback.bind(undefined, undefined, undefined));
   }

   insert(data: Partial<T>, options: AnyObject, callback: (err?: Error, row?: T) => void): void {
      setTimeout(callback.bind(undefined, undefined, undefined));
   }

   update(criteria: AnyObject, data: Partial<T>, options: AnyObject, callback: (err?: Error, updated?: number) => void): void {
      setTimeout(callback.bind(undefined, undefined, 0));
   }

   remove(criteria: AnyObject, options: AnyObject, callback: (err?: Error, removed?: number) => void): void {
      setTimeout(callback.bind(undefined, undefined, 0));
   }
}
