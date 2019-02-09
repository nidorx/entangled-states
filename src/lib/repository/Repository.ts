import { AnyObject } from "../Constants";

/**
 * Repositório abstrato, usado pelos tópicos e publishers
 */
export default class Repository<T> {

   find(criteria: AnyObject, options: AnyObject): Promise<Array<T>> {
      return new Promise<Array<T>>((accept, reject) => {
         accept(undefined);
      });
   }

   count(criteria: AnyObject, options: AnyObject): Promise<number> {
      return new Promise<number>((accept, reject) => {
         accept(0);
      });
   }

   findOne(criteria: AnyObject, options: AnyObject): Promise<T> {
      return new Promise<T>((accept, reject) => {
         accept(undefined);
      });
   }

   insert(data: Partial<T>, options: AnyObject): Promise<T> {
      return new Promise<T>((accept, reject) => {
         accept(undefined);
      });
   }

   update(criteria: AnyObject, data: Partial<T>, options: AnyObject): Promise<number> {
      return new Promise<number>((accept, reject) => {
         accept(0);
      });
   }

   remove(criteria: AnyObject, options: AnyObject): Promise<number> {
      return new Promise<number>((accept, reject) => {
         accept(0);
      });
   }
}
