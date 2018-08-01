import { ActionResponse, SyncTopicParams } from "./Constants";
import ClientStorage from "./storage/ClientStorage";
import DTO from "./util/DTO";

/**
 * Mensagens provenientes do servidor
 */
interface TopicResponse {
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
   data?: string;
   /**
   * Diff, quando o cliente já possui dados atualizados (3 ultimas atualizações), envia apenas um patch, que será aplicado pelo cliente
   */
   delta?: string;
   /**
    * ID da mensagem que gerou o diff
    */
   deltaSeq?: number;
}

/**
 * Dado do tópico persistido no local storage
 */
interface SubscriptionStorage {
   /**
     * Número sequencial da mensagem 
     */
   seq: number;

   /**
    * Dados do tópico FLAT COMPRESSED.
    */
   compressed: string;
}


/**
 * Representação do estado atual deste tópico
 */
interface SubscriptionState {
   /**
    * Número sequencial da mensagem 
    */
   seq: number;

   /**
    * Dados da mensagen, disponível para uso
    */
   data?: any;

   /**
    * Dados da mensagem, FLAT. Formato persistido e proveniente do servidor (incluido deltas)
    */
   dto?: DTO;

   /**
    * 
    */
   callbacks: Array<(data: any) => void>;
}

/**
 * Classe de acesso aos dados. 
 * 
 * O resultado de todas as mensagens de tópicos são persistidos OFFLINE, com isso, evita tráfego desnecessário.
 * 
 * Implementa um mecanismo de sincronização com o servidor, informando ao mesmo sobre a ultima versão recebida de cada tópico
 */
export default class Client {

   /**
    * Identificador das requisições feitas ao servidor
    */
   static REQUEST_SEQUENCE = { id: Date.now() };

   private ws: WebSocket | undefined;

   private reconnect = true;

   /**
    * Deixa salvo as inscrições em tópicos, em problema de conexão, solicita novamente a subscriçao
    */
   private subscriptions: { [key: string]: SubscriptionState } = {};

   /**
    * Permite receber resposta para uma execução
    */
   private promises: {
      [key: string]: {
         accept: (data: any) => void,
         reject: (cause: any) => void,
      }
   } = {};

   private host: string;

   private storage: ClientStorage;

   constructor(host: string, storage: ClientStorage) {
      this.host = host;
      this.storage = storage;
   }

   /**
    * Quando invocado, não será mais criado novas conexões
    */
   close() {
      this.reconnect = false;

      //@TODO: Limpar todas as referencias para callbacks
      // this.subscriptions = {};

      // Desconecta-se do servidor
      if (this.ws) {
         this.ws.close();
         this.ws = undefined;
      }
   }

   /**
    * Inicializa a conexão do DataLayer com o Backend
    */
   connect(callback?: (err?: any) => void) {
      if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
         return;
      }
      this.reconnect = true;
      this.ws = new WebSocket(this.host);

      this.ws.onopen = () => {
         if (this.ws) {
            // connection opened
            this.syncTopics();
            if (callback) {
               callback();
            }
         }
      };

      this.ws.onmessage = (e) => {
         let data: ActionResponse | TopicResponse;

         try {
            data = JSON.parse(e.data);
         } catch (e) {
            console.warn('Erro ao processar mensagem', e.data);
            return;
         }

         if ((data as ActionResponse).id) {
            // Resposta de uma ação
            data = (data as ActionResponse);

            // Está respondendo a uma solicitação
            if (!this.promises[data.id]) {
               // Promise já foi resolvido
               return;
            }

            // Resolve o promise
            if (data.error) {
               this.promises[data.id].reject(data.error);
            } else {
               this.promises[data.id].accept(data.data);
            }

            // Remove a referencia para o promise
            delete this.promises[data.id];

         } else if ((data as TopicResponse).topic) {
            // Mensagem de um tópico
            const message = (data as TopicResponse);
            const subscription = this.subscriptions[message.topic];

            if (!subscription) {
               // Atualiza o servidor com as informações sobre os tópicos que este deseja ouvir
               this.syncTopics();
               return;
            }

            if (subscription.seq >= message.seq) {
               // A mensagem está atrasada, o servidor já enviou outra mensagem mais recente neste tópico antes
               this.syncTopic(message.topic);
               return;
            }

            let update = false;

            // ==================================================================
            // Algoritmo de Compactação dos Dados
            // Garantir o transporte apenas do essencial
            // ==================================================================
            //  1 - DTO (arrays por id)
            //  2 - Diff do flatten (geração do delta)
            //  3 - Compressão 
            // ==================================================================
            if (message.delta) {
               if (message.deltaSeq === subscription.seq) {
                  // É o diff correto
                  update = true;
                  subscription.seq = message.seq;
                  subscription.dto = (subscription.dto as DTO).patchCompressed(message.delta);
               } else {
                  // Delta inválido, pode ser mensagem atrasada
                  this.syncTopic(message.topic);
               }
            } else {
               // Mensagem completa
               update = true;
               subscription.seq = message.seq;
               subscription.dto = DTO.decompress(message.data as string);
            }

            if (update) {
               subscription.data = (subscription.dto as DTO).unflatten();;

               // Entrega mensagem aos interessados
               subscription.callbacks.forEach((callback: (data: any) => void) => {
                  // callback(data);
                  callback(subscription.data);
               });

               // Sincroniza com o servidor sobre a ultima mensagem recebida no tópico
               this.syncTopic(message.topic);

               // Salva no Storage os dados do tópico
               // Só persiste quando recebe novas mensagens
               setTimeout(() => {
                  this.storage.set(`topic_${message.topic}`, {
                     seq: subscription.seq,
                     compressed: (subscription.dto as DTO).compress(),
                  } as SubscriptionStorage);
               }, 0);
            }
         }
      };

      this.ws.onerror = (e) => {
         // an error occurred
         // console.error(e.message);
      };

      this.ws.onclose = (e) => {
         // connection closed
         if (this.reconnect) {
            // Faz nova conexão
            setTimeout(this.connect.bind(this), 10);
         }
      };
   }

   /**
    * Aguarda uma mensagem específica do servidor (exemplo. wsLoginSucces)
    * 
    * @param topic 
    */
   subscribe(topic: string, callback: (data: any) => void): () => void {

      if (!this.subscriptions[topic]) {
         this.subscriptions[topic] = {
            callbacks: [],
            data: undefined,
            seq: 0
         };
      }
      this.subscriptions[topic].callbacks.push(callback);

      // Se já possuir dados (OFFLINE), já entrega ao solicitante 
      if (this.subscriptions[topic].data) {
         callback(this.subscriptions[topic].data);

         // Sincroniza os tópicos de interesse
         this.syncTopics();
      } else {
         // Verifica se no Storage possui cache da mensagem
         this.storage.get(`topic_${topic}`)
            .then((data) => {
               let idx = this.subscriptions[topic].callbacks.indexOf(callback);
               // Se houver dados no storage e ainda não recebeu a mensagem do server, e ainda o callback é valido
               // Só invoca o callback se esse subscription não tiver sido removido
               if (data && !this.subscriptions[topic].data && idx >= 0) {

                  // Preenche os dados do tópico
                  const storageTopic = data as SubscriptionStorage;
                  const subscription = this.subscriptions[topic];

                  subscription.seq = storageTopic.seq;
                  subscription.dto = DTO.decompress(storageTopic.compressed);
                  subscription.data = subscription.dto.unflatten();

                  callback(this.subscriptions[topic].data);
               }

               // Sincroniza os tópicos de interesse
               this.syncTopics();
            })
            .catch(err => {

               // Sincroniza os tópicos de interesse
               this.syncTopics();
            });
      }

      let canceled = false;
      // Cancelable
      return () => {
         if (canceled) {
            // Evita processamento desnecessário
            return;
         }
         canceled = true;
         // Remove o listener
         let idx = this.subscriptions[topic].callbacks.indexOf(callback);
         if (idx >= 0) {
            this.subscriptions[topic].callbacks.splice(idx, 1);
         }

         // Atualiza os topicos de interesse
         this.syncTopics();
      }
   }

   /**
    * Permite executar alguma ação no server (Ex.: do('login', nomeDeUsuario))
    * 
    * @param action 
    */
   exec(action: string, data: any): Promise<any> {

      const requestId = `${Client.REQUEST_SEQUENCE.id++}`;
      const promise = new Promise<any>((accept, reject) => {
         if (this.ws) {

            this.promises[requestId] = {
               accept: accept,
               reject: reject
            };

            this.ws.send(JSON.stringify({
               id: requestId,
               action: action,
               data: data
            }));

         } else {
            reject('Não está conectado à API');
         }
      });

      // Após 30 segundos, se não hover resposta, Timeout
      setTimeout(() => {
         if (this.promises[requestId]) {
            this.promises[requestId].reject('A resposta da requisição excedeu 30 segundos.');
            delete this.promises[requestId];
         }
      }, 30000);

      return promise;
   }

   /**
    * Informa ao servidor quais os tópicos que essa conexão está ouvindo
    * Evita que o servidor envie todas as mensagens para todos
    */
   private syncTopics() {
      const data = Object.keys(this.subscriptions)
         .map(topic => {
            // Se não existe callback, não está subscrito
            if (this.subscriptions[topic].callbacks.length < 1) {
               return undefined;
            }
            return {
               topic: topic,
               seq: this.subscriptions[topic].seq
            } as SyncTopicParams;
         })
         .filter(item => item !== undefined);
      
      this.exec('syncTopics', data)
         .then(() => { })
         .catch(() => { });
   }

   /**
    * Informa ao servidor quais os tópicos que essa conexão está ouvindo
    * Evita que o servidor envie todas as mensagens para todos
    */
   private syncTopic(topic: string) {
      this.exec('syncTopic', {
         topic: topic,
         seq: this.subscriptions[topic].seq
      } as SyncTopicParams);
   }
}
