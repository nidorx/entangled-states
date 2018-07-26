import * as WebSocket from 'ws';
import DiffPatch from 'dffptch';
import { flatten } from './util/Flatten';
import { Datastore } from './Constants';

/**
 * Tenta enviar para os clientes que não responderam neste intervalo
 */
const RESEND_TIMEOUT = 3000;

/**
 * Quantidade de delta mantido no historico
 */
const NUM_DELTAS_HISTORY = 5;

/**
 * Mensagens provenientes do servidor
 */
export interface TopicResponse {
   /**
    * Tópico que disparou a mensagem
    */
   topic: string;
   /**
    * Sequencial da mensagem atual
    */
   seq: number;
   /**
   * Corpo da mensagem, quando enviado todo o conteúdo para o cliente
   */
   data?: any;
   /**
   * Diff, quando o cliente já possui dados atualizados (3 ultimas atualizações), envia apenas um patch, que será aplicado pelo cliente
   */
   delta?: any;
   /**
    * ID da mensagem que gerou o diff
    */
   deltaSeq?: number;
}

/**
 * Informação de um cliente deste tópico
 */
export interface TopicSubscriber {
   ws: WebSocket;
   /**
    * Última mensagem enviada ao cliente
    */
   lastSeq: number;
   /**
    * Timestamp da ultima mensagem enviada
    */
   lastTs: number;
   /**
    * Última mensagem confirmada pelo cliente
    */
   lastReceivedSeq: number;
}

/**
 * Representação do estado atual deste tópico
 */
export interface TopicState {
   /**
    * Número sequencial da mensagem 
    */
   seq: number;
   /**
    * Dados da mensagem, flatten.
    * 
    * Esse conteúdo NÃO É SALVO na base de dados, e também NÃO É transportado para o cliente, é usado apenas para fazer o diff das alterações
    */
   data?: any;
   /**
    * Calcula e salva o Diff das ultimas <NUM_DELTAS_HISTORY> mensagens no tópico.
    * 
    * Usado para envio rápido a usuários com atraso de rede temporário
    */
   deltas: Array<{ seq: number; data: any; diff: any }>
}

/**
 * Representação de um tópico
 */
export default class Topic {

   /**
    * Mantém referencia para todos os tópicos criados
    */
   static ALL: Array<Topic> = [];

   /**
    * Os nomes de tópicos registrados (que tem publishers)
    */
   static REGISTERED_NAMES: Array<string> = [];

   static store?: Datastore;

   static setStorage = (store: Datastore) => {
      Topic.store = store;
   }

   /**
    * Obtém a instancia de um topico por nome. Se não exisitr, faz a instanciação do mesmo
    */
   static find = (name: string): Topic | undefined => {
      let topic = Topic.ALL.find(topic => name === topic.getName());
      if (!topic) {
         // Tópico não existe, verifica se o nome do topico é valido
         if (Topic.REGISTERED_NAMES.find(validName => name.split('#')[0] === validName)) {
            topic = new Topic(name);
         }
      }

      return topic;
   }

   /**
    * Faz o envio em um tópico por nome
    * 
    * Se o tópico não existir em memoria, é instanciado um
    */
   static send = (name: string, data: any): void => {
      let topic = Topic.find(name);
      if (topic) {
         topic.send(data);
      }
   }

   /**
    * Faz cache de mensagens por sequencial e deltaSequencial, evita invocar JSON.stringify todo o tempo
    */
   private stringifyCached: any;

   /**
    * O nome do tópico, usado na mensageria
    */
   private name: string;

   /**
   * Sequencial das mensagens deste tópico
   */
   private SEQ = 0;

   /**
    * A cada <RESEND_INTERVAL> segundos envia as mensagens pendentes (clientes que não confirmaram o recebimento)
    */
   private interval: any;

   /**
    * Proxima mensagen a ser enviada.
    * 
    * Pode ocorrer de ser solicitado o envio de novos dados antes de finalizar o envio atual. Registra em memoria os novos dados para reenviar
    * quando o envio atual finalizar.
    */
   private next?: any;

   /**
    * O estado atual do Tópico, contendo a mesagem atual e o diff das ultmas <NUM_DELTAS_HISTORY> mensagens
    */
   private state: TopicState = { seq: 0, data: undefined, deltas: [] };

   /**
   * Indica que está efetuando o carregamento dos dados historicos 
   */
   private isLoading = false;

   /**
    * Indica que está enviando dados neste momento
    */
   private isSending = false;

   /**
    * Os subscritos neste tópico
    */
   private subscribers: Array<TopicSubscriber> = [];

   constructor(name: string) {

      // Verifica se o nome do topico é valido
      if (!Topic.REGISTERED_NAMES.find(validName => name.split('#')[0] === validName)) {
         throw new Error('Não existe um Publisher registrado para esse tópico');
      }

      this.name = name;

      // Já inicia o carregamento do estado atual do tópico
      this.loadFromDB();

      // Registra na lista de tópicos o item atual
      Topic.ALL.push(this);
   }

   getName() {
      return this.name;
   }

   /**
    * Permite enviar dados para o tópico
    * 
    * O dado só será enviado se houver diferença entre o novo dado e o registro anterior.
    * 
    * @param newData 
    */
   send(newData: any) {

      if (this.isLoading || this.isSending) {
         // Adiciona na fila de envio
         this.next = newData;
         return;
      }
      this.isSending = true;

      // Garante que não possui nova mensagen na fila
      this.next = undefined;

      let flattenData = flatten(newData);
      if (flattenData === undefined || flattenData === null) {
         if (Array.isArray(newData)) {
            flattenData = { '@': 1 };
         } else {
            flattenData = {};
         }
      }

      if (!Array.isArray(flattenData) && typeof flattenData !== 'object') {
         // Tópicos só trabalham com Array ou objetos
         this.isSending = false;
         return;
      }

      // Novo estado do tópico
      const newState: TopicState = {
         seq: -1,
         data: flattenData,
         deltas: []
      }

      if (this.state.data) {
         // Já possui uma mensagem atual
         // Verifica se tem alterações

         // ==================================================================
         // Algoritmo de Compactação dos Dados
         // Garantir o transporte apenas do essencial
         // ==================================================================
         //  1 - Flatten (arrays por id)
         //  2 - Diff do flatten (geração do delta)
         //  3 - Compressão
         // ==================================================================

         let delta = DiffPatch.diff(this.state.data, newState.data);
         if (Object.keys(delta).length === 0) {
            // Não possui alterações, ignora o versionamento e envio
            this.isSending = false;
            return;
         }

         // Garante imutabilidade do registro
         newState.deltas = JSON.parse(JSON.stringify(this.state.deltas));

         // Ordena os deltas, os mais recentes no inicio (Os mais antigos vão ser removidos)
         newState.deltas.sort((a, b) => b.seq - a.seq);

         // Limite em apenas <NUM_DELTAS_HISTORY - 1> deltas no estado
         newState.deltas.splice(NUM_DELTAS_HISTORY - 1);

         // Calcula os novos deltas
         newState.deltas.forEach(delta => {
            delta.diff = DiffPatch.diff(delta.data, newState.data)
         });

         // Insere o novo diff no inicio
         newState.deltas.push({
            seq: this.state.seq,
            data: this.state.data,
            diff: delta
         });
      }

      // Possui atualização ou é primeiro registro

      // Incrementa o sequencial da ultima mensagem enviada no tópico
      newState.seq = ++this.SEQ;

      // Persiste o novo estado
      this.persist(newState)
         .then(() => {
            // Finalmente, entrega aos interessados, atualiza o estado do tópico e verifica se tem novas atualizações

            this.isSending = false;

            // Sobrescreve o estado anterior
            this.state = newState;

            this.sendToAllSubscribers();

            if (this.next) {
               // Possui novos dados para enviar
               this.send(this.next);
            }
         })
         .catch(err => {
            this.isSending = false;

            if (this.next) {
               // Possui novos dados para enviar
               this.send(this.next);
            }
         });
   }

   /**
    * Registra um cliente neste tópico
    * 
    * @param ws 
    * @param lastReceivedSeq ID da ultma mensagem recebida pelo cliente
    */
   subscribe(ws: WebSocket, lastReceivedSeq: number) {
      let subscriber = this.subscribers.find(subscriber => subscriber.ws === ws);
      if (subscriber) {
         subscriber.lastReceivedSeq = Math.max(subscriber.lastReceivedSeq, lastReceivedSeq);
      } else {
         subscriber = {
            ws: ws,
            lastSeq: 0,
            lastTs: Date.now(),
            lastReceivedSeq: lastReceivedSeq
         };
         this.subscribers.push(subscriber);
      }

      // Verifica e envia para o subscrito
      this.sendToSubscriberIfNeed(subscriber);

      // Inicializa a tarefa de reenvio
      this.initializeResendJob();
   }

   /**
    * Remove um subscripto deste tópico
    * 
    * @param ws 
    */
   unsubscribe(ws: WebSocket) {
      let subscriber = this.subscribers.find(subscriber => subscriber.ws === ws);
      if (subscriber) {
         const idx = this.subscribers.indexOf(subscriber);
         if (idx >= 0) {
            this.subscribers.splice(idx, 1);
         }
      }
   }

   /**
    * Envia para todos os que não receberam ou não confirmaram o recebimento da ultima mensagem
    */
   private sendToAllSubscribers() {
      // Limpa cache de JSON.stringify
      this.stringifyCached = {};
      this.subscribers.forEach(subscriber => {
         this.sendToSubscriberIfNeed(subscriber);
      });
   }

   /**
    * Envia a mensage para o cliente, se necessário.
    * 
    * Valida se o cliente já possui a versão mais recente e envia apenas a informação necessária, como o diff ou conteúdo completo
    * 
    * @param ws 
    */
   private sendToSubscriberIfNeed(subscriber: TopicSubscriber) {

      const message: TopicResponse = {
         topic: this.getName(),
         seq: this.state.seq
      }


      // Se a ultma mensagem confirmada pelo subscrito é anterior a mensagem atual, e já expirou o tempo de resposta
      if (subscriber.lastReceivedSeq < this.state.seq && subscriber.lastTs < Date.now() - RESEND_TIMEOUT) {

         // Se houver algum delta para a mensagem que o subscrito possui, envia esse delta
         let delta = this.state.deltas.find(delta => delta.seq === subscriber.lastReceivedSeq);
         if (delta) {
            message.delta = delta.diff
            message.deltaSeq = delta.seq;
         } else {
            // Não possui delta, envia a mensagem completa
            message.data = this.state.data
         }
      }

      // Se a ultima versão enviada para o subscrito é anterior a mensagem atual
      else if (subscriber.lastSeq < this.state.seq) {

         // Se houver algum delta para a mensagem que o subscrito possui, envia esse delta
         let delta = this.state.deltas.find(delta => delta.seq === subscriber.lastSeq);
         if (delta) {
            message.delta = delta.diff
            message.deltaSeq = delta.seq;
         } else {
            // Não possui delta, envia a mensagem completa
            message.data = this.state.data
         }
      }

      // Possui dados para enviar?
      if (message.data || message.delta) {
         subscriber.lastSeq = this.state.seq;

         // Evita invocar JSON.stringify a todo o custo
         const cacheId = `${message.seq}_${message.deltaSeq || ''}`;
         if (!this.stringifyCached[cacheId]) {
            this.stringifyCached[cacheId] = JSON.stringify(message);
         }

         subscriber.ws.send(this.stringifyCached[cacheId]);
      }
   }

   /**
    * Inicializa a tarefa de reenvio para clientes que não responderam a tempo
    */
   private initializeResendJob() {
      clearInterval(this.interval);

      // A cada segundo envia novamente mensagem para os que não receberam ou não confirmaram o recebimento
      this.interval = setInterval(() => {
         if (this.subscribers.length > 0) {
            this.sendToAllSubscribers();
         } else {
            // Não possui subscribers, remover a tarefa
            clearInterval(this.interval);
         }
      }, RESEND_TIMEOUT);
   }

   /**
    * Obtém da base de dados o estado inicial do Topic
    */
   private loadFromDB() {
      if (this.isLoading) {
         return;
      }
      this.isLoading = true;

      // Faz tentativas ilimitadas de loading, o Topico só fica disponível para envio quando o carregamento for efetuado
      let retries = 1;
      const tryToLoad = () => {

         if (Topic.store) {
            Topic.store.findOne({ name: this.getName() }, {}, (err, document?: TopicState) => {
               if (err) {
                  console.error(`Erro durante o carregamento do tópico ${this.getName()}, ${retries}a tentativa`, err);
                  setTimeout(tryToLoad, 10);
                  return;
               }

               // Marca como carregamento concluído
               this.isLoading = false;

               if (document) {
                  // Novo tópico
                  this.SEQ = document.seq;
                  this.state.seq = document.seq;
                  this.state.data = document.data;
                  this.state.deltas = document.deltas;
               }

               // Verifica se já possui novas mensagens a enviar
               if (this.next) {
                  // Possui novos dados para enviar
                  this.send(this.next);
               }
            });
         } else {
            // Marca como carregamento concluído
            this.isLoading = false;
         }
      }

      // Inicia a tentativa de carregamento
      tryToLoad();
   }

   /**
    * Persiste o estado atual do tópico na base de dados
    */
   private persist(newState: TopicState): Promise<any> {
      return new Promise<any>((accept, reject) => {

         // Faz 5 tentativas de persistir a informação, após isso, retorna erro
         let retries = 1;
         const tryToPersist = () => {

            const dados = {
               name: this.getName(),
               seq: newState.seq,
               data: newState.data,
               deltas: newState.deltas
            };

            if (Topic.store) {
               Topic.store.update({ name: this.getName() }, { $set: dados }, { upsert: true }, (err) => {
                  if (err) {
                     console.error(`Erro ao persistir tópico ${this.getName()}, ${retries}a tentativa`, err);

                     if (retries++ < 5) {
                        setTimeout(tryToPersist, 10);
                     } else {
                        reject(err);
                     }

                  } else {
                     // Salvo com sucesso
                     accept();
                  }
               });
            } else {
               accept();
            }
         }

         // Tenta persistir o tópico
         tryToPersist();
      });
   }
}
