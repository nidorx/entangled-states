import * as http from 'http';
import * as WebSocket from 'ws';
import Topic from "./Topic";
import Actions from "./Actions";
import { ConnectionContext } from './NodeConstants';
import { ActionResponse, ActionRequest } from "./Constants";
import MidlewareManager, { MidleWare } from './util/MidlewareManager';

const stoppable = require('stoppable');

// Import default actions
import './actions/syncTopicAction';
import './actions/syncTopicsAction';

/**
 * Contexto disponíveis no Midleware do server
 */
export type ServerMidleWareContext = {
   /**
    * A conexão com o Client
    */
   ws: WebSocket;
   /**
    * Dados da requisição
    */
   request: http.IncomingMessage;
};

/**
 * Contexto disponíveis no Midleware de Mensagens
 */
export type ServerMidleWareMessageContext = ServerMidleWareContext & {
   /**
    * Dados da meensagem.
    */
   data: WebSocket.Data;
};

/**
 * Contexto disponíveis no Midleware de fechamento de conexões
 */
export type ServerMidleWareCloseContext = ServerMidleWareContext & {
   /**
     * Código da desconexão.
     */
   code: number;
   /**
    * Razão da desconexão.
    */
   reason: string;
};

/**
 * Os eventos possíveis de uso de Midlewares no server
 */
export type ServerMidleWareEvent = 'message' | 'close' | 'connection' | 'upgrade' | '*';

/**
 * Tipagem dos Midlewares de actions
 */
export type ServerMidleWare = MidleWare<ServerMidleWareContext | ServerMidleWareMessageContext | ServerMidleWareCloseContext>;

/**
 * Servidor do Websocket-pubsub, faz gerenciamento de conexões e todo o tratamento necessário para o funcionamento da biblioteca
 */
export default class Server {

   server: http.Server;

   webSocketServer: WebSocket.Server;

   private middlewares: MidlewareManager<ServerMidleWareContext | ServerMidleWareMessageContext | ServerMidleWareCloseContext> = new MidlewareManager();

   constructor(server: http.Server, options?: WebSocket.ServerOptions, callback?: () => void) {
      this.onConnection = this.onConnection.bind(this);

      this.server = stoppable(server);

      //initialize the WebSocket server instance
      this.webSocketServer = new WebSocket.Server({
         ...(options || {}),
         server: server
      }, callback);

      this.webSocketServer.on('connection', this.onConnection);
   }

   /**
    * Finaliza o webSocketServer e o http.Server usados
    * 
    * @param cb 
    */
   close(cb?: (err?: Error) => void) {
      (this.server as any).stop(cb);
   }

   /**
    * Permite adicionar um MidleWare na conexão. 
    * 
    * Util para aplicar autenticação e outros controles
    * 
    * @param middleware 
    */
   use(middleware: ServerMidleWare | Array<ServerMidleWare>, event?: ServerMidleWareEvent): void {
      this.middlewares.add(middleware, event);
   }

   /**
    * Permite remover um Midleware adicionado anteriormente
    * 
    * @param event 
    * @param middleware 
    */
   removeMidleware(middleware: ServerMidleWare, event?: ServerMidleWareEvent) {
      this.middlewares.remove(middleware, event);
   }

   private onConnection(ws: WebSocket, request: http.IncomingMessage) {

      this.middlewares.exec('connection', { ws, request })
         .then(() => {

            const context: ConnectionContext = {
               ws: ws,
               request: request
            }

            ws.on('close', this.createHandleOnClose(context));
            ws.on('upgrade', this.createHandleOnUpgrade(context));
            ws.on('message', this.createHandleOnMessage(context));
         })
         .catch(err => {
            // Erro na conexao, remove todos os listeners            
            Topic.ALL.forEach(topic => {
               topic.unsubscribe(ws);
            });
         })
   }

   private createHandleOnUpgrade(context: ConnectionContext) {
      return (uws: WebSocket, urequest: http.IncomingMessage) => {
         context.ws = uws;
         context.request = urequest;

         this.middlewares.exec('upgrade', { ws: context.ws, request: context.request });
      }
   }

   private createHandleOnClose(context: ConnectionContext) {
      return (code: number, reason: string) => {
         // Ao desconectar, remove o socket de todos os tópicos
         Topic.ALL.forEach(topic => {
            topic.unsubscribe(context.ws);
         });

         this.middlewares.exec('close', {
            ws: context.ws,
            request: context.request,
            code: code,
            reason: reason
         });
      }
   }

   private createHandleOnMessage(context: ConnectionContext) {
      return (data: WebSocket.Data) => {

         const midContext: ServerMidleWareMessageContext = {
            ws: context.ws,
            request: context.request,
            data: data
         };

         this.middlewares.exec('message', midContext).then(() => {
            let request: ActionRequest;

            // Algum midleware pode modificar os dados de entrada.
            // Desde que mantenha a estrutura, é permitido
            if (typeof midContext.data === 'string') {
               const msg = midContext.data as string;
               try {
                  request = JSON.parse(msg);
               } catch (e) {
                  console.warn('Erro ao processar mensagem', msg);
                  return;
               }
            } else {
               request = midContext.data as any;
            }

            if (!request.action) {
               // A única forma de conexão com o server, a partir daqui, é via actions
               return;
            }

            this.execAction(context, request);
         });
      }
   }

   /**
    * Faz a execução dos Midelewares e Tratamento de um action
    */
   private execAction(context: ConnectionContext, request: ActionRequest) {

      Actions.exec(context, request)
         .then(data => {

            // Envia a resposta ao solicitante
            if (context.ws.readyState === context.ws.OPEN) {
               context.ws.send(JSON.stringify({
                  id: request.id,
                  data: data
               } as ActionResponse));
            }
         })
         .catch(cause => {
            // Envia o erro ao solicitante
            if (context.ws.readyState === context.ws.OPEN) {
               context.ws.send(JSON.stringify({
                  id: request.id,
                  error: `${cause || 'Ocorreu um erro inesperado.'}`,
                  stack: cause ? cause.stack : undefined
               } as ActionResponse));
            }
         });
   }
}