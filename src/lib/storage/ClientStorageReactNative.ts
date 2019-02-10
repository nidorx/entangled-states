import { AsyncStorage } from "react-native";
import ClientStorageAbstract from "./ClientStorageAbstract";

/**
 * Implementação do Storage para ser usado com React Native
 */
export default class ClientStorageReactNative extends ClientStorageAbstract {

   protected getItem(key: string): Promise<string | null> {
      return new Promise<string | null>((accept, reject) => {
         AsyncStorage.getItem(key, (err, value) => {
            if (err) {
               reject(err);
            } else {
               accept(value);
            }
         });
      });
   }

   protected setItem(key: string, data: string): Promise<void> {
      return new Promise<void>((accept, reject) => {
         AsyncStorage.setItem(key, data, (err) => {
            if (err) {
               reject(err);
            } else {
               accept();
            }
         });
      });
   }

   protected removeItem(key: string): Promise<void> {
      return new Promise<void>((accept, reject) => {
         AsyncStorage.removeItem(key, (err) => {
            if (err) {
               reject(err);
            } else {
               accept();
            }
         });
      });
   }

   keys(): Promise<Array<string>> {
      return new Promise<Array<string>>((accept, reject) => {
         AsyncStorage.getAllKeys((err, keys) => {
            if (err) {
               reject(err);
               return;
            }

            const out: Array<string> = [];
            const namespace = `@${this.namespace}`;

            if (keys) {
               keys.forEach(key => {
                  if (key && key.indexOf(namespace) === 0) {
                     out.push(key);
                  }
               })
            }

            accept(out);
         });
      });
   }
}