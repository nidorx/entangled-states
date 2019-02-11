import * as http from 'http';
import * as WebSocket from 'ws';
import { Server as HttpServer } from "http";
import { ServerOptions } from 'ws';
import Topic from "./Topic";
import Actions from "./Actions";
import { ActionResponse, ActionRequest } from "./Constants";


// Import default actions
import './actions/syncTopicAction';
import './actions/syncTopicsAction';

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

interface ConnectionContext {
   ws: WebSocket;
   request: http.IncomingMessage;
}

export default class Server {

   webSocketServer: WebSocket.Server;

   server: HttpServer;

   middlewares: { [key: string]: Array<MidleWare> } = {};

   constructor(server: HttpServer, options?: ServerOptions, callback?: () => void) {
      this.onConnection = this.onConnection.bind(this);

      this.server = server;

      //initialize the WebSocket server instance
      this.webSocketServer = new WebSocket.Server({
         ...(options || {}),
         server: server
      }, callback);

      this.webSocketServer.on('connection', this.onConnection);
   }

   /**
    * Finaliza o webSocketServer e o HttpServer usados
    * 
    * @param cb 
    */
   close(cb?: (err?: Error) => void) {
      this.webSocketServer.close(wserr => {
         this.server.close(() => {
            if (cb) {
               cb(wserr);
            }
         });
      });
   }

   /**
    * Permite adicionar um MidleWare na conexão. 
    * 
    * Util para aplicar autenticação e outros controles
    * 
    * @param middleware 
    */
   on(event: MidleWareEvent, middleware: MidleWare): MidleWare {
      if (!this.middlewares[event]) {
         this.middlewares[event] = [];
      }
      this.middlewares[event].push(middleware);

      return middleware;
   }

   /**
    * Permite remover um Midleware adicionado anteriormente
    * 
    * @param event 
    * @param middleware 
    */
   off(event: MidleWareEvent, middleware: MidleWare) {
      if (!this.middlewares[event]) {
         return;
      }
      const idx = this.middlewares[event].indexOf(middleware);
      if (idx >= 0) {
         this.middlewares[event].splice(idx, 1);
      }
   }

   private onConnection(ws: WebSocket, request: http.IncomingMessage) {

      this.execMidleware('connection', { ws, request })
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

         this.execMidleware('upgrade', { ws: context.ws, request: context.request });
      }
   }

   private createHandleOnClose(context: ConnectionContext) {
      return (code: number, reason: string) => {
         // Ao desconectar, remove o socket de todos os tópicos
         Topic.ALL.forEach(topic => {
            topic.unsubscribe(context.ws);
         });

         this.execMidleware('close', {
            ws: context.ws,
            request: context.request,
            code: code,
            reason: reason
         });
      }
   }

   private createHandleOnMessage(context: ConnectionContext) {
      return (data: WebSocket.Data) => {
         const messageMidContext = {
            ws: context.ws,
            request: context.request,
            data: data
         }

         this.execMidleware('message', messageMidContext).then(() => {
            const msg = data as string;
            let request: ActionRequest;


            try {
               request = JSON.parse(msg);
            } catch (e) {
               console.warn('Erro ao processar mensagem', msg);
               return;
            }

            if (!request.action) {
               // A única forma de conexão com o server, a partir daqui, é via actions
               return;
            }

            this.execAction(context, request);
         });
      }
   }

   private execAction(context: ConnectionContext, request: ActionRequest) {

      const actionContext = {
         ws: context.ws,
         request: context.request,
         actionData: request.data,
         actionName: request.action,
         actionRequestId: request.id
      };

      this.execMidleware('action', actionContext)
         .then(() => Actions.exec(request.action, request.data, context.ws))
         .then(data => {

            // Envia a resposta ao solicitante
            context.ws.send(JSON.stringify({
               id: request.id,
               data: data
            } as ActionResponse));

         })
         .catch(cause => {
            // Envia o erro ao solicitante
            context.ws.send(JSON.stringify({
               id: request.id,
               error: `${cause || 'Ocorreu um erro inesperado.'}`,
               stack: cause ? cause.stack : undefined
            } as ActionResponse));
         });
   }

   /**
    * Executa um midelware para o evento informado
    * 
    * Se o Midleware não acionar o next, o Promise nunca é resolvido (portanto, ignorado)
    * 
    * @param event 
    * @param context 
    */
   private execMidleware(event: string, context: MidleWareContext): Promise<any> {
      return new Promise<any>((resolve, reject) => {
         if (!this.middlewares[event] || this.middlewares[event].length === 0) {
            return resolve();
         }

         const middlewares = this.middlewares[event];

         // last called middleware #
         let index = -1
         dispatch(0);

         function dispatch(actual: number, ) {
            if (actual <= index) {
               // next() called multiple times
               return;
            }

            index = actual;

            if (actual === middlewares.length) {
               return resolve();
            }

            try {
               middlewares[actual](context, dispatch.bind(null, actual + 1));
            } catch (err) {
               reject(err);
            }
         }
      });
   }
}