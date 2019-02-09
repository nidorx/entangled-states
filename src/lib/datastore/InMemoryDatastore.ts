import Datastore from "./Datastore";
import { Json } from "../Constants";

/**
 * Data Store em memória, facilita o desenvolvimento de Mock de funcionalidades
 */
export default class InMemoryDatastore implements Datastore {

   SEQUENCE = 1;

   ROWS: any[] = [];

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



   find(query: Json, options: Json, callback: (err?: Error, rows?: Array<Json>) => void) {
      setTimeout(() => {
         const rows = this.ROWS.filter(this.match.bind(this, query));
         callback(undefined, rows);
      });
   };

   findOne(query: Json, options: Json, callback: (err?: Error, row?: Json) => void) {
      setTimeout(() => {
         const row = this.ROWS.find(this.match.bind(this, query));
         callback(undefined, row);
      });
   };

   update(query: Json, data: Json, options?: Json, callback?: ((err?: Error, numberOfUpdated?: number) => void) | undefined) {
      this.find(query, {}, (err, rows) => {
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

   insert(data: any, callback: (err: Error | null, document: any) => void) {
      setTimeout(() => {
         data._id = this.SEQUENCE++;
         this.ROWS.push(data);
         callback(null, data);
      });
   }

   remove(query: Json, callback?: ((err?: Error, numberOfRemoved?: number) => void) | undefined) {
      this.find(query, {}, (err, rows) => {
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