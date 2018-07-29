import ClientStorageCached from "./ClientStorageCached";

/**
 * Implementação do ClienteStore que usa o window.sessionStorage
 */
export default class ClientStorageWebSession extends ClientStorageCached {

   getItem(key: string): Promise<string | null> {
      return new Promise<string | null>((accept, reject) => {
         accept(window.sessionStorage.getItem(key));
      });
   }

   setItem(key: string, data: string): Promise<void> {
      return new Promise<void>((accept, reject) => {
         window.sessionStorage.setItem(key, data);
         accept();
      });
   }

   removeItem(key: string): Promise<void> {
      return new Promise<void>((accept, reject) => {
         window.sessionStorage.removeItem(key);
         accept();
      });
   }

   keys(): Promise<Array<string>> {
      return new Promise<Array<string>>((accept, reject) => {
         const out: Array<string> = [];
         const namespace = `@${this.namespace}`;

         for (let i = 0, l = window.sessionStorage.length; i <= l; i++) {
            const key = window.sessionStorage.key(i);
            if (key && key.indexOf(namespace) === 0) {
               out.push(key);
            }
         }

         accept(out);
      });
   }
}