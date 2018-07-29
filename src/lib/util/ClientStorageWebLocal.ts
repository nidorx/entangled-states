import ClientStorageCached from "./ClientStorageCached";

/**
 * Implementação do ClienteStore que usa o window.localStorage
 */
export default class ClientStorageWebLocal extends ClientStorageCached {

   getItem(key: string): Promise<string | null> {
      return new Promise<string | null>((accept, reject) => {
         accept(window.localStorage.getItem(key));
      });
   }

   setItem(key: string, data: string): Promise<void> {
      return new Promise<void>((accept, reject) => {
         window.localStorage.setItem(key, data);
         accept();
      });
   }

   removeItem(key: string): Promise<void> {
      return new Promise<void>((accept, reject) => {
         window.localStorage.removeItem(key);
         accept();
      });
   }

   keys(): Promise<Array<string>> {
      return new Promise<Array<string>>((accept, reject) => {
         const out: Array<string> = [];
         const namespace = `@${this.namespace}`;

         for (let i = 0, l = window.localStorage.length; i <= l; i++) {
            const key = window.localStorage.key(i);
            if (key && key.indexOf(namespace) === 0) {
               out.push(key);
            }
         }

         accept(out);
      });
   }
}