import Repository from "./Repository";
import { AnyObject } from "../Constants";

/**
 * Repositório em memória, facilita o desenvolvimento de Mock de funcionalidades
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

   find(criteria: AnyObject, options: AnyObject): Promise<Array<T & AnyObject>> {
      return new Promise<Array<T>>((accept, reject) => {
         const rows = this.ROWS.filter(this.match.bind(this, criteria));
         accept(rows);
      });
   };

   count(criteria: AnyObject, options: AnyObject): Promise<number> {
      return new Promise<number>((accept, reject) => {
         const rows = this.ROWS.filter(this.match.bind(this, criteria));
         accept(rows.length);
      });
   }

   findOne(criteria: AnyObject, options: AnyObject): Promise<T & AnyObject> {
      return new Promise<T>((accept, reject) => {
         const row = this.ROWS.find(this.match.bind(this, criteria));
         accept(row);
      });
   };

   insert(data: Partial<T & AnyObject>): Promise<T & AnyObject> {
      return new Promise<T>((accept, reject) => {
         data._id = this.SEQUENCE++;
         this.ROWS.push(data as (T & AnyObject));
         accept(data as (T & AnyObject));
      });
   }

   async update(criteria: AnyObject, data: Partial<T & AnyObject>, options?: AnyObject): Promise<number> {
      const rows = await this.find(criteria, {});
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
      return (rows || []).length;
   };

   async remove(criteria: AnyObject, options: AnyObject): Promise<number> {
      const rows = await this.find(criteria, {});
      if (rows) {
         rows.forEach(row => {
            this.ROWS.splice(this.ROWS.indexOf(row), 1);
         });
      }
      return (rows || []).length;
   }
}