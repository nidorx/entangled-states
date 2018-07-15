import * as http from 'http';
import * as WebSocket from 'ws';
import { ActionResponse, ActionRequest } from "./Constants";
import Topic from "./Topic";
import Actions from "./Actions";
import { Server } from "http";
import { ServerOptions } from 'ws';

export interface MidleWareContext {
   ws: WebSocket;
   request: http.IncomingMessage;
   data?: WebSocket.Data;
   code?: number;
   reason?: string;
}

export type MidleWare = (context: MidleWareContext, next: () => void) => void;

export default class WebSocketPubSub {

   webSocketServer: WebSocket.Server;

   middlewares: { [key: string]: Array<MidleWare> } = {};

   constructor(server: Server, options?: ServerOptions, callback?: () => void) {
      this.onConnection = this.onConnection.bind(this);

      //initialize the WebSocket server instance
      this.webSocketServer = new WebSocket.Server({
         ...(options || {}),
         server: server
      }, callback);

      this.webSocketServer.on('connection', this.onConnection);
   }

   /**
    * permite adicionar um MidleWare na conexão. 
    * 
    * Util para aplicar autenticação e outros controles
    * 
    * @param middleware 
    */
   on(event: 'message' | 'close' | 'connection', middleware: MidleWare) {
      if (!this.middlewares[event]) {
         this.middlewares[event] = [];
      }
      this.middlewares[event].push(middleware);
   }

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

   private onConnection(ws: WebSocket, request: http.IncomingMessage) {

      this.execMidleware('connection', { ws, request })
         .then(() => {

            ws.on('upgrade', (uws: WebSocket, urequest: http.IncomingMessage) => {
               ws = uws;
               request = urequest;
            });

            ws.on('close', (code: number, reason: string) => {
               // Ao desconectar, remove o socket de todos os tópicos
               Topic.ALL.forEach(topic => {
                  topic.unsubscribe(ws);
               });

               this.execMidleware('close', { ws: ws, request: request, code, reason });
            });

            ws.on('message', (data: WebSocket.Data) => {
               this.execMidleware('message', { ws: ws, request: request, data: data })
                  .then(() => {
                     const msg = data as string;
                     let message: ActionRequest;

                     try {
                        message = JSON.parse(msg);
                     } catch (e) {
                        console.warn('Erro ao processar mensagem', msg);
                        return;
                     }

                     try {
                        Actions.exec(message.action, message.data, ws)
                           .then(data => {

                              // Envia a resposta ao solicitante
                              ws.send(JSON.stringify({
                                 requestId: message.id,
                                 data: data
                              } as ActionResponse));

                           })
                           .catch(cause => {
                              // Envia o erro ao solicitante
                              ws.send(JSON.stringify({
                                 requestId: message.id,
                                 error: `${cause}`
                              } as ActionResponse));
                           });
                     } catch (e) {
                        console.warn('Erro ao processar mensagem', e, msg);

                        // Envia o erro ao solicitante
                        ws.send(JSON.stringify({
                           requestId: message.id,
                           error: 'Ocorreu um erro inesperado ao executar a operação.'
                        } as ActionResponse));
                     }
                  });
            });
         })
         .catch(err => {
            // Erro na conexao, remove todos os listeners            
            Topic.ALL.forEach(topic => {
               topic.unsubscribe(ws);
            });
         })
   }


}