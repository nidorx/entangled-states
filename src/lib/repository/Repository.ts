import { AnyObject } from "../Constants";

/**
 * Repositório abstrato, usado pelos tópicos e publishers
 */
export default class Repository {

   find(criteria: AnyObject, options: AnyObject, callback: (err?: Error, rows?: Array<AnyObject>) => void): void {
      setTimeout(callback.bind(undefined, undefined, undefined));
   }

   findOne(criteria: AnyObject, options: AnyObject, callback: (err?: Error, row?: AnyObject) => void): void {
      setTimeout(callback.bind(undefined, undefined, undefined));
   }

   insert(data: AnyObject, options: AnyObject, callback: (err?: Error, row?: AnyObject) => void): void {
      setTimeout(callback.bind(undefined, undefined, undefined));
   }

   update(criteria: AnyObject, data: AnyObject, options: AnyObject, callback: (err?: Error, updated?: number) => void): void {
      setTimeout(callback.bind(undefined, undefined, 0));
   }

   remove(criteria: AnyObject, options: AnyObject, callback: (err?: Error, removed?: number) => void): void {
      setTimeout(callback.bind(undefined, undefined, 0));
   }
}
