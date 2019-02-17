import * as http from 'http';
import * as WebSocket from 'ws';
import Topic from "./Topic";
import Actions from "./Actions";
import Logger from "./util/Logger";
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
   /**
    * Evento que originou a execução desse midleware
    */
   event: 'message' | 'close' | 'connection' | 'upgrade';
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

   protected logger: Logger;

   private server: http.Server;

   private webSocketServer: WebSocket.Server;

   private middlewares: MidlewareManager<ServerMidleWareContext | ServerMidleWareMessageContext | ServerMidleWareCloseContext> = new MidlewareManager();

   constructor(server: http.Server, options?: WebSocket.ServerOptions, callback?: () => void) {
      this.server = stoppable(server);

      this.logger = Logger.get("entangled-states.Server");

      // bindings
      this.onConnection = this.onConnection.bind(this);

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
      this.logger.trace('Finalizando Server');
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

      this.logger.trace('Nova conexão efetuada: { url="', request.url, '", headers=', request.headers, ' }');

      this.middlewares.exec('connection', { ws, request, event: 'connection' })
         .then(() => {

            const context: ConnectionContext = {
               ws: ws,
               request: request
            };

            ws.on('close', this.createHandleOnClose(context));
            ws.on('upgrade', this.createHandleOnUpgrade(context));
            ws.on('message', this.createHandleOnMessage(context));
         })
         .catch(err => {
            this.logger.trace('Erro na conexão do usuário. {err=', err, ' }');
            // Erro na conexao, remove todos os listeners            
            Topic.ALL.forEach(topic => {
               topic.unsubscribe(ws);
            });
         })
   }

   private createHandleOnUpgrade(context: ConnectionContext) {
      return (uws: WebSocket, urequest: http.IncomingMessage) => {
         this.logger.trace('Updgrade da conexão efetuada: { url="', urequest.url, '", headers=', urequest.headers, ' }');

         context.ws = uws;
         context.request = urequest;

         this.middlewares.exec('upgrade', {
            event: 'upgrade',
            ws: context.ws,
            request: context.request
         });
      }
   }

   private createHandleOnClose(context: ConnectionContext) {
      return (code: number, reason: string) => {

         this.logger.trace('Cliente desconectado: { code=', code, ', reason=', reason, ' }');

         // Ao desconectar, remove o socket de todos os tópicos
         Topic.ALL.forEach(topic => {
            topic.unsubscribe(context.ws);
         });

         this.middlewares.exec('close', {
            event: 'close',
            ws: context.ws,
            request: context.request,
            code: code,
            reason: reason
         });
      }
   }

   private createHandleOnMessage(context: ConnectionContext) {
      return (data: WebSocket.Data) => {

         this.logger.trace('Mensagem recebida: { data=', data, ' }');

         const midContext: ServerMidleWareMessageContext = {
            event: 'message',
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
               } catch (err) {
                  this.logger.warn('Erro ao processar mensagem. { msg=', msg, ', err=', err, ' }');
                  return;
               }
            } else {
               request = midContext.data as any;
            }

            if (!request.action) {
               // A única forma de conexão com o server, a partir daqui, é via actions
               this.logger.warn('Mensagem proveniente do cliente sem action definida. { request=', request, ' }');
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

            this.logger.trace('Action executada com sucesso: { action=', request.action, ', requestId=', request.id, ', data=', data, ' }');

            // Envia a resposta ao solicitante
            if (context.ws.readyState === context.ws.OPEN) {
               context.ws.send(JSON.stringify({
                  id: request.id,
                  data: data
               } as ActionResponse));
            }
         })
         .catch(cause => {

            this.logger.warn('Erro no processamento da action: { action=', request.action, ', cause=', cause, ' }');

            // Envia o erro ao solicitante
            if (context.ws.readyState === context.ws.OPEN) {
               context.ws.send(JSON.stringify({
                  id: request.id,
                  error: `${cause || 'Ocorreu um erro inesperado.'} `,
                  stack: cause ? cause.stack : undefined
               } as ActionResponse));
            }
         });
   }
}