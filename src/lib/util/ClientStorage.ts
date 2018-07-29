
/**
 * Interface para persistencia local dos dados dos tópicos
 */
export default interface ClientStorage {

   /**
    * Obtém um item a partir da key
    */
   get<T>(key: string): Promise<T>;

   /**
    * Permite salvar um objeto no storage
    */
   set: (key: string, data: any) => Promise<void>;

   /**
    * Permite remover uma key ou algumas keys
    */
   remove: (key: string) => Promise<void>;

   /**
    * Obtém todas as keys conhecidos
    */
   keys: () => Promise<Array<string>>;
}
