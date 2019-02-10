import ClientStorage from "./ClientStorage";
import { AnyObject } from "../Constants";

/**
 * Implementação abstrata com cache em memória para agilizar o acesso aos dados do storage.
 * 
 * Os dados ficam em cache por 10 segundos apenas
 */
export default abstract class ClientStorageAbstract implements ClientStorage {

   protected namespace: string;

   /**
   * Cache dos dados, serializado para garantir a imutalidade
   */
   private cache: { [key: string]: string } = {};

   private promises: { [key: string]: Promise<any> } = {};

   private timeouts: AnyObject = {};

   constructor(namespace: string) {
      this.namespace = namespace;
   }

   abstract keys(): Promise<Array<string>>;
   protected abstract getItem(namespaceKey: string): Promise<string | null>;
   protected abstract setItem(namespaceKey: string, data: string): Promise<void>;
   protected abstract removeItem(namespaceKey: string): Promise<void>;

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

      key = this.toNamespaceKey(key);

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

            // busca rápida, em memória
            if (this.cache.hasOwnProperty(key)) {
               resolve();
               return;
            }

            // Obtém da implementação
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

      key = this.toNamespaceKey(key);

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

   toNamespaceKey(key: string){
      return `@${this.namespace}_${key}`;
   }

   remove(key: string): Promise<void> {

      key = this.toNamespaceKey(key);

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