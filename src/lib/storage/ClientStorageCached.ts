import ClientStorage from "./ClientStorage";
import { Json } from "../Constants";

/**
 * Implementação genérica com cache em memória para agilizar o acesso aos dados do storage.
 * 
 * Os dados ficam em cache por 10 segundos apenas
 */
export default abstract class ClientStorageCached implements ClientStorage {

   namespace: string;

   /**
   * Cache dos dados, serializado para garantir a imutalidade
   */
   cache: { [key: string]: string } = {};

   promises: { [key: string]: Promise<any> } = {};

   timeouts: Json = {};

   constructor(namespace: string) {
      this.namespace = namespace;
   }

   abstract keys(): Promise<Array<string>>;
   abstract getItem(key: string): Promise<string | null>;
   abstract setItem(key: string, data: string): Promise<void>;
   abstract removeItem(key: string): Promise<void>;

   /**
    * Atualiza o prazo de vida de um item do cache
    * 
    * @param key 
    */
   touch(key: string) {
      clearTimeout(this.timeouts[key]);
      this.timeouts[key] = setTimeout(() => {
         // Após 10 segundos sem uso, remove o item do cache
         delete this.cache[key];
      }, 10000);
   }

   get<T>(key: string): Promise<T> {

      key = `@${this.namespace}_${key}`;

      let promise = this.promises[key];
      if (!promise) {
         promise = new Promise<any>((accept, reject) => {
            const resolve = () => {
               delete this.promises[key];
               let data;
               try {
                  data = JSON.parse(this.cache[key]);
               } catch (e) {
                  reject(e);
                  return;
               }

               accept(data);
            }

            if (this.cache.hasOwnProperty(key)) {
               resolve();
               return;
            }

            this.getItem(key)
               .then((value) => {
                  if (value) {

                     this.touch(key);
                     this.cache[key] = value;

                     resolve();

                  } else {
                     delete this.cache[key];
                     accept(null);
                  }
               })
               .catch((cause) => {
                  delete this.promises[key];
                  reject(cause);
               });
         });

         this.promises[key] = promise;
      }

      return promise;
   }

   set(key: string, data: any): Promise<void> {

      key = `@${this.namespace}_${key}`;

      return new Promise<void>((accept, reject) => {
         let value: string;
         try {
            value = JSON.stringify(data);
         } catch (e) {
            reject(e);
            return;
         }

         this.setItem(key, value)
            .then(() => {

               this.cache[key] = value;

               this.touch(key);

               accept();
            })
            .catch(reject)
      });
   }

   remove(key: string): Promise<void> {

      key = `@${this.namespace}_${key}`;

      return new Promise<any>((accept, reject) => {
         this.removeItem(key)
            .then((err) => {
               delete this.cache[key];
               clearTimeout(this.timeouts[key]);
               accept();
            })
            .catch(reject);
      });
   }
}