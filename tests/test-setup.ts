import WebSocket from 'ws';
import Logger from '../src/lib/util/Logger';

// Define o nível de LOGS durante os testes
Logger.setLevel('WARN');

// Disponibiliza o WebSocket globalmente
(global as any).WebSocket = WebSocket;
