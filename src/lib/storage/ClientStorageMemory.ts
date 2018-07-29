import ClientStorageCached from "./ClientStorageCached";

/**
 * Implementação do ClienteStore em memória
 */
export default class ClientStorageMemory extends ClientStorageCached {

   storage: { [key: string]: string } = {};

   getItem(key: string): Promise<string | null> {
      return new Promise<string | null>((accept, reject) => {
         accept(this.storage[key] || null);
      });
   }

   setItem(key: string, data: string): Promise<void> {
      return new Promise<void>((accept, reject) => {
         this.storage[key] = data;
         accept();
      });
   }

   removeItem(key: string): Promise<void> {
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