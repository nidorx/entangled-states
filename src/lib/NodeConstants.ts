import * as http from 'http';
import * as WebSocket from 'ws';

/**
 * Contexto de conexão do usuário com o servidor
 */
export interface ConnectionContext {
   ws: WebSocket;
   request: http.IncomingMessage;
}
