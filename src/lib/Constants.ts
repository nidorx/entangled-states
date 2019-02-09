
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
    * Permite mapear resposta a requisições
    */
   id: string;
   /**
    * Corpo da mensagem
    */
   data?: any;
   /**
    * Permite devolver o erro da solicitação
    */
   error?: string;
   /**
    * Stacktrace do erro
    */
   stack?: string;

}

/**
 * Parametros das ações de sincronização de tópicos do Client com o Server
 */
export interface SyncTopicParams {
   /**
    * O nome do tópico
    */
   topic: string;
   /**
    * O último sequencial recebido pelo client
    */
   seq: number;
}

/**
 * Representação de um objeto qualquer
 */
export interface Json { [key: string]: any };
