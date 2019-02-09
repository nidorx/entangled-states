import { Json } from "../Constants";

/**
 * Interface genérica usada neste publishers
 */
export default interface Datastore {

   find(query: Json, options: Json, callback: (err?: Error, rows?: Array<Json>) => void): void;

   findOne(query: Json, options: Json, callback: (err?: Error, row?: Json) => void): void;

   update(query: Json, data: Json, options: Json, callback: (err?: Error, numberOfUpdated?: number) => void): void;
}
