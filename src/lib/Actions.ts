import * as http from 'http';
import * as WebSocket from 'ws';
import { ConnectionContext } from './NodeConstants';
import MidlewareManager, { MidleWare } from './util/MidlewareManager';
import { ActionRequest } from './Constants';

export type ActionCallback = (data: any, ws: WebSocket, accept: (data?: any) => void, reject: (cause: any, message?: string) => void) => void;

/**
 * Parametros disponíveis no Midleware de Actions
 */
export type ActionMidleWareContext = {
   /**
    * A conexão com o Client
    */
   ws: WebSocket;
   /**
    * Dados da requisição
    */
   request: http.IncomingMessage;
   /**
   * Identificador da requisição, permite devolver uma resposta para essa solicitação
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
 * Tipagem dos Midlewares de actions
 */
export type ActionMidleWare = MidleWare<ActionMidleWareContext>;

/**
 * Actions RPC, permite registrar métodos que podem ser invocados pelo Cliente
 */
class Actions {

   private actions: { [key: string]: ActionCallback } = {};

   private middlewares: MidlewareManager<ActionMidleWareContext> = new MidlewareManager();

   /**
    * Registra uma nova ação que pode ser executada pelo usuário
    * 
    * @param name 
    * @param callback 
    */
   register(name: string, callback: ActionCallback, middleware?: ActionMidleWare | Array<ActionMidleWare>) {
      this.actions[name] = callback;
      if (middleware) {
         this.use(middleware, name);
      }
   }

   /**
    * Executa uma ação
    * 
    * @param actionName 
    * @param data 
    * @param ws 
    */
   exec(context: ConnectionContext, request: ActionRequest): Promise<any> {
      let actionName = request.action;
      return new Promise<any>((accept, reject) => {
         if (!this.actions.hasOwnProperty(actionName)) {
            return reject('Operação não cadastrada');
         }

         const midlContext = {
            ws: context.ws,
            request: context.request,
            id: request.id,
            data: request.data,
            action: request.action
         };

         //  Executa os Midlewares da action informada
         return this.middlewares.exec(actionName, midlContext)
            .then(() => {
               // Executa a action
               this.actions[actionName](midlContext.data, midlContext.ws, accept, (cause: any, message?: string) => {
                  console.error(actionName, cause, message || '');
                  reject(message || cause);
               });
            });
      });
   }

   /**
    * Permite adicionar Midlewares na execução das actions
    * 
    * @param middlewares Um ou mais midlewares
    * @param action A action é opcional. O Wildcard "*" é usado quando se deseja adicionar um midleware para todas as actions (basta não informar a action)
    */
   use(middlewares: ActionMidleWare | Array<ActionMidleWare>, action?: string): void {
      this.middlewares.add(middlewares, action);
   }

   /**
    * Permite remover um midleware adicionado previamente
    * 
    * @param middleware 
    * @param action 
    */
   removeMidleware(middleware: ActionMidleWare, action?: string): void {
      this.middlewares.remove(middleware, action);
   }

}

export default new Actions;