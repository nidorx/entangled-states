
import http from 'http';
import express from 'express';
import Datastore from 'nedb';
import Server from '../../src/lib/Server';
import Client from '../../src/lib/Client';
import ClientStorageMemory from '../../src/lib/storage/ClientStorageMemory';
import Publishers from '../../src/lib/Publishers';
import Topic from '../../src/lib/Topic';
import Actions from '../../src/lib/Actions';
// import fs from 'fs';

const DB_TOPICS = new Datastore({ inMemoryOnly: true });
const DB_GROUPS = new Datastore({ inMemoryOnly: true });
const DB_USERS = new Datastore({ inMemoryOnly: true });

describe('Server', () => {

   let server: Server;

   afterAll((done) => {
      server.close(done);
   });

   it('Deve permitir e gerenciar a conexão e desconexão de clientes', (done) => {

      const onConnection = server.on('connection', (ctx, next) => {
         next();

         setTimeout(() => {
            // finaliza a conexao
            client.close();
         }, 50);
      });

      const onClose = server.on('close', (ctx, next) => {
         next();

         // Se esse ponto não for invocado, vai estourar timeout
         done();
      });

      const client = new Client('ws://localhost:3000', new ClientStorageMemory('test'));
      client.connect();
   }, 3000);

   it('Após fazer o subscribe, deve receber imediatamente os dados do tópico', (done) => {

      // Cria dados do grupo
      const clientA = new Client('ws://localhost:3000', new ClientStorageMemory('test'));
      clientA.connect(() => {
         clientA.exec('createGroup', { name: 'Grupo 1' })
            .then((id) => {

               clientA.close();

               const clientB = new Client('ws://localhost:3000', new ClientStorageMemory('test'));
               clientB.connect(() => {
                  clientB.subscribe('groups', (groups) => {

                     // Se esse ponto não for invocado, vai estourar timeout 
                     done();
                  })
               });
            });
      });
   }, 3000);

   /**
    * Inicializa o servidor e os parametros testáveis
    */
   beforeAll((done) => {

      const app = express();
      const httpServer = http.createServer(app);


      // Configura o storage dos topicos
      Topic.setStorage(DB_TOPICS);

      //-------------------------------------------------------------
      // Publishers
      //-------------------------------------------------------------
      Publishers.create({
         topic: 'groups',
         idRequired: false,
         queries: [
            {
               store: DB_GROUPS,
               singleResult: false,
               query: {},
            }
         ]
      });


      Publishers.create({
         topic: 'groupById',
         idRequired: true,
         queries: [
            {
               store: DB_GROUPS,
               singleResult: true,
               query: { _id: '$id' },
            }
         ]
      });

      // Usuarios por grupo
      Publishers.create({
         topic: 'users',
         idRequired: true,
         queries: [
            {
               store: DB_USERS,
               singleResult: false,
               query: { groupId: '$id' },
            }
         ]
      });

      Publishers.create({
         topic: 'userById',
         idRequired: true,
         queries: [
            {
               store: DB_USERS,
               singleResult: true,
               query: { _id: '$id' },
            }
         ]
      });

      //-------------------------------------------------------------
      // Actions (CRUD)
      //-------------------------------------------------------------
      Actions.register('createGroup', (data: any, ws, accept, reject) => {
         DB_GROUPS.insert(data, (err, row: any) => {
            if (err) {
               return reject(err);
            }

            accept(row._id);

            Publishers.publish('groups');
         })
      });

      Actions.register('updateGroup', (data: any, ws, accept, reject) => {
         DB_GROUPS.update({ _id: data._id }, { $set: data }, {}, (err) => {
            if (err) {
               return reject(err);
            }

            accept();

            Publishers.publish('groups');
            Publishers.publish('groupById', data._id);
         })
      });

      Actions.register('deleteGroup', (data: any, ws, accept, reject) => {
         DB_GROUPS.remove({ _id: data._id }, (err) => {
            if (err) {
               return reject(err);
            }

            accept();

            Publishers.publish('groups');
            Publishers.publish('groupById', data._id);
         })
      });

      Actions.register('createUser', (data: any, ws, accept, reject) => {
         DB_USERS.insert(data, (err, row: any) => {
            if (err) {
               return reject(err);
            }

            accept(row._id);

            Publishers.publish('users', data.groupId);
         })
      });

      Actions.register('updateUser', (data: any, ws, accept, reject) => {
         DB_USERS.update({ _id: data._id }, { $set: data }, {}, (err) => {
            if (err) {
               return reject(err);
            }

            accept();

            Publishers.publish('users', data.groupId);
            Publishers.publish('userById', data._id);
         })
      });

      Actions.register('deleteUser', (data: any, ws, accept, reject) => {
         DB_USERS.remove({ _id: data._id }, (err) => {
            if (err) {
               return reject(err);
            }

            accept();

            Publishers.publish('groups');
            Publishers.publish('groupById', data._id);
         })
      });

      //initialize the PubSub server instance
      server = new Server(httpServer);

      //start our server
      httpServer.listen(3000, () => {
         done();
      });
   });

});