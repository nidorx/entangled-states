
/**
 * Mensagens provenientes do cliente
 */
export interface ActionRequest {
   /**
    * Identificador da requisição, permite devolver uma resposta para essa solciitação
    */
   id: string;
   /**
    * Nome da ação invocada
    */
   action: string;
   /**
    * Dados para execução da ação
    */
   data: any;
}

/**
 * Mensagem de resposta a uma ação do usuario
 */
export interface ActionResponse {
   /**
    * Corpo da mensagem
    */
   data?: any;
   /**
    * Permite devolver o erro da solicitação
    */
   error?: string;
   /**
    * Permite mapear resposta a requisições
    */
   requestId?: string;
}

/**
 * Interface genérica usada neste publishers
 */
export interface Datastore {

   find(query: any, projection: any, callback: (err: Error, documents: Array<any>) => void): void;

   findOne(query: any, projection: any, callback: (err: Error, document: any) => void): void;

   update(query: any, data: any, options?: any, cb?: (err: Error, numberOfUpdated: number) => void): void;
}
