import ClientStorageAbstract from "./ClientStorageAbstract";
import { AnyObject } from "../Constants";

/**
 * Implementação do ClienteStore em memória
 */
export default class ClientStorageMemory extends ClientStorageAbstract {

   private ttl: number;

   private storage: {
      [key: string]: {
         inserted: number,
         value: string
      }
   } = {};

   constructor(namespace: string, ttl: number = 10000) {
      super(namespace);
      this.ttl = ttl;
   }

   getTTL(key: string): number {
      key = this.toNamespaceKey(key);
      return this.storage[key] ? ((new Date()).getTime() - this.storage[key].inserted) : -1;
   }

   protected getItem(key: string): Promise<string | null> {
      return new Promise<string | null>((accept, reject) => {
         accept(this.storage[key] ? this.storage[key].value : null);
      });
   }

   protected setItem(key: string, data: string): Promise<void> {
      return new Promise<void>((accept, reject) => {
         this.storage[key] = {
            inserted: (new Date()).getTime(),
            value: data
         };
         setTimeout(() => {
            // Apos expirar, remove o item do cache
            this.removeItem(key);
         }, this.ttl);
         accept();
      });
   }

   protected removeItem(key: string): Promise<void> {
      return new Promise<void>((accept, reject) => {
         delete this.storage[key];
         accept();
      });
   }

   keys(): Promise<Array<string>> {
      return new Promise<Array<string>>((accept, reject) => {
         const out: Array<string> = [];
         const namespace = `@${this.namespace}`;

         const keys = Object.keys(this.storage);

         keys.forEach(key => {
            if (key && this.storage.hasOwnProperty(key) && this.storage[key] !== undefined && key.indexOf(namespace) === 0) {
               out.push(key);
            }
         })

         accept(out);
      });
   }
}