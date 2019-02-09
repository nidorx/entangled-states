import Repository from "./Repository";
import { AnyObject } from "../Constants";

/**
 * Data Store em memória, facilita o desenvolvimento de Mock de funcionalidades
 */
export default class InMemoryRepository<T> extends Repository<(T & AnyObject)> {

   SEQUENCE = 1;

   ROWS: Array<T & AnyObject> = [];

   match(query: any, row: any) {
      for (var attr in query) {
         if (!query.hasOwnProperty(attr)) {
            continue;
         }
         if (!row.hasOwnProperty(attr)) {
            return false;
         }
         if (query[attr] !== row[attr]) {
            return false;
         }
      }
      // Match
      return true;
   }

   find(criteria: AnyObject, options: AnyObject, callback: (err?: Error, rows?: Array<T & AnyObject>) => void) {
      setTimeout(() => {
         const rows = this.ROWS.filter(this.match.bind(this, criteria));
         callback(undefined, rows);
      });
   };

   findOne(criteria: AnyObject, options: AnyObject, callback: (err?: Error, row?: (T & AnyObject)) => void) {
      setTimeout(() => {
         const row = this.ROWS.find(this.match.bind(this, criteria));
         callback(undefined, row);
      });
   };

   update(criteria: AnyObject, data: Partial<T & AnyObject>, options?: AnyObject, callback?: ((err?: Error, updated?: number) => void) | undefined) {
      this.find(criteria, {}, (err, rows) => {
         if (err) {
            if (callback) {
               callback(err);
            }
            return;
         }

         if (rows) {
            rows.forEach(row => {
               for (var attr in data) {
                  if (!data.hasOwnProperty(attr)) {
                     continue;
                  }

                  row[attr] = data[attr];
               }
            });
         }

         if (callback) {
            const numberOfUpdated = (rows || []).length;
            callback(undefined, numberOfUpdated);
         }
      });
   };

   insert(data: Partial<T & AnyObject>, callback: (err?: Error, row?: AnyObject) => void) {
      setTimeout(() => {
         data._id = this.SEQUENCE++;
         this.ROWS.push(data as (T & AnyObject));
         callback(undefined, data);
      });
   }

   remove(criteria: AnyObject, options: AnyObject, callback: (err?: Error, removed?: number) => void) {
      this.find(criteria, {}, (err, rows) => {
         if (err) {
            if (callback) {
               callback(err);
            }
            return;
         }

         if (rows) {
            rows.forEach(row => {
               this.ROWS.splice(this.ROWS.indexOf(row), 1);
            });
         }

         if (callback) {
            const numberOfRemoved = (rows || []).length;
            callback(undefined, numberOfRemoved);
         }
      });
   }
}