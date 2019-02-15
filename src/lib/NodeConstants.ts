import * as http from 'http';
import * as WebSocket from 'ws';

/**
 * Parametros disponíveis no Midleware
 */
export interface MidleWareContext {
   /**
    * A conexão com o Client
    */
   ws: WebSocket;
   /**
    * Dados da requisição
    */
   request: http.IncomingMessage;
   /**
    * Dados da meensagem. Disponível apenas para o evento 'message'
    */
   data?: WebSocket.Data;
   /**
    * Código da desconexão. Disponível apenas para o evento 'close'
    */
   code?: number;
   /**
    * Razão da desconexão. Disponível apenas para o evento 'close'
    */
   reason?: string;
   /**
    * Id da requisição do Client. Disponível apenas para o evento 'action'
    */
   actionRequestId?: string;
   /**
    * Nome da action sendo executada. Disponível apenas para o evento 'action'
    */
   actionName?: string;
   /**
    * Dados de entrada da Action. Disponível apenas para o evento 'action'
    */
   actionData?: any;
}

export type MidleWare = (context: MidleWareContext, next: () => void) => void;

/**
 * Os eventos possíveis de uso de Midlewares
 */
export type MidleWareEvent = 'message' | 'close' | 'connection' | 'upgrade' | 'action';