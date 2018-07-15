import Topic from './Topic';
import { Datastore } from './Constants';

/**
 * Limita a execução dos Publisher a no máximo 1 a cada <EXEC_LIMIT_TIMEOUT> ms
 */
const EXEC_LIMIT_TIMEOUT = 100;

export interface QueryConfig {
   /**
   * Banco de dados que possui a informação
   */
   store: Datastore;
   /**
    * A Query de consulta no store
    *
    * Quando o tópico for por id, pode se usar o formato query:{ nomeCampo : '$id' }. O $id será substituido pelo valor informado na publicação
    */
   query?: { [key: string]: any };
   /**
    * Permite delimitar os campos que serão recuperados do store
    */
   projection?: any;
   /**
    * Informa que dever retornar apenas um resultado (findOne)
    */
   singleResult?: boolean;
   /**
    * Após a recuperação, permite adicionar um filtro mais sofisticado
    * 
    * Não se aplica quando singleResult=true
    */
   filter?: (value: any, index: number, array: Array<any>, prevResults: Array<any>) => boolean;
   /**
    * Após filtrar os valores, permite visitar cada um dos itens
    * 
    * Não se aplica quando singleResult=true
    */
   forEach?: (value: any, index: number, array: Array<any>, prevResults: Array<any>) => void;
   /**
    * Permite mapear o resultado para outra estrutura de dados
    */
   map?: (value: any, index: number, array: Array<any>, prevResults: Array<any>) => any;
   /**
    * Permite extrair o valor de saída, a partir dos resultado atual e anteriores
    */
   extract?: (array: Array<any>, prevResults: Array<any>) => any;
}

export interface Config {
   /**
    * Nome do tópico
    */
   topic: string;
   /**
   * Informa que este tópico é por ID, tópico de detalhamento de um item
   */
   idRequired?: boolean;
   /**
    * Permite aninhar diversas queries
    */
   queries: Array<QueryConfig>;
   /**
    * Invocado após o envio do tópico
    */
   then?: (lastResult: any) => void;
}

/**
 * Permite criação e invocação de publicadores
 */
class Publishers {

   private publishers: { [key: string]: (id?: any) => void } = {};

   // No momento da execução, cria um trotle
   private publishersByID: { [key: string]: (id?: any) => void } = {};

   /**
    * Faz a publicação em um tópico
    * 
    * @param topic 
    * @param id 
    */
   publish(topic: string, id?: string | number) {

      // Tópico não existe, verifica se o nome do topico é valido
      if (!this.publishers.hasOwnProperty(topic)) {
         return;
      }

      this.publishers[topic](id);
   }

   /**
    * Registra uma nova ação que pode ser executada pelo usuário
    * 
    * @param name 
    * @param callback 
    */
   create(config: Config) {
      let topic = config.topic;
      const byId = config.idRequired;
      const queries = config.queries;
      const then = config.then;

      // Registra o nome do tópico, sem isso, não existe instanciação automática
      Topic.REGISTERED_NAMES.push(topic);


      /**
       * Funcao de publicacao
       * 
       * @param id 
       */
      const publisher = (id?: string | number) => {

         let topicName = topic;

         if (byId) {
            if (id === undefined) {
               console.error(`${topic}: ID is required`);
               return;
            }
            topicName = `${topicName}#${id}`;
         }

         // Na primeira execução do Publisher, cria a função de execução real, limitando as chamadas
         if (!this.publishersByID[topicName]) {

            // Debounced 
            this.publishersByID[topicName] = (() => {
               let timeout: any;

               return () => {
                  if (timeout) {
                     // Se for invocado nova chamada para esse cara, cancela o agendamento anterior
                     clearTimeout(timeout);
                  }

                  timeout = setTimeout(() => {
                     let index = 0;
                     const prevResults: Array<any> = [];
                     const next = () => {
                        if (index > queries.length - 1) {
                           let lastResult = prevResults.pop();

                           // Sempre entrega algum resultado
                           if (lastResult === undefined || lastResult === null) {
                              if (queries[queries.length - 1].singleResult) {
                                 lastResult = null
                              } else {
                                 lastResult = [];
                              }
                           }

                           // Se houver registros, faz envio do tópico
                           Topic.send(topicName, lastResult);
                           if (then) {
                              then(lastResult);
                           }
                        } else {
                           // Executa proxima query
                           this.exec(id, prevResults, queries[index++])
                              .then(result => {
                                 prevResults.push(result);
                              })
                              .then(next)
                              .catch(err => {
                                 console.error(`${topicName}`, err);
                              });
                        }
                     };

                     // Inicio da execução
                     next();
                  }, EXEC_LIMIT_TIMEOUT);
               }
            })();
         }

         // Solicita execução do throtle
         this.publishersByID[topicName]();
      }

      this.publishers[topic] = publisher;
   }

   /**
   * Executa uma query
   * 
   * @param id 
   * @param prevResults 
   * @param config 
   */
   private exec(id: any, prevResults: Array<any>, config: QueryConfig): Promise<Array<any>> {

      const store = config.store;
      const query = { ...(config.query || {}) };
      const projection = config.projection || {};
      const filter = config.filter;
      const forEach = config.forEach;
      const map = config.map;
      const extract = config.extract;

      return new Promise<Array<any>>((accept, reject) => {

         changeQueryIdValue(query, id);

         // console.log('Executando query', query);

         if (config.singleResult) {
            store.findOne(query, projection, (err, doc: any) => {
               if (err) {
                  return reject(err);
               }

               if (map) {
                  doc = map(doc, 0, [doc], prevResults);
               }

               if (extract) {
                  doc = extract([doc], prevResults);
               }

               accept(doc);
            });

         } else {

            store.find(query, projection, (err, docs: Array<any>) => {
               if (err) {
                  return reject(err);
               }

               if (filter) {
                  docs = docs.filter((value: any, index: number, array: Array<any>) => {
                     return filter(value, index, array, prevResults);
                  });
               }

               if (forEach) {
                  docs.forEach((value: any, index: number, array: Array<any>) => {
                     forEach(value, index, array, prevResults);
                  });
               }


               if (map) {
                  docs = docs.map((value: any, index: number, array: Array<any>) => {
                     return map(value, index, array, prevResults);
                  });
               }

               if (extract) {
                  docs = extract(docs, prevResults);
               }

               accept(docs);
            });
         }
      });
   }
}

/**
 * Substitui em tempo de execução o $id informado
 * 
 * @param query 
 * @param id 
 */
const changeQueryIdValue = (query: any, id: string) => {
   if (Array.isArray(query)) {
      query.forEach((item: any) => changeQueryIdValue(item, id));
   } else if (typeof query === 'object') {
      for (var a in query) {
         if (!query.hasOwnProperty(a)) {
            continue;
         }

         if (query[a] === '$id') {
            query[a] = id;
         } else if (Array.isArray(query[a])) {
            changeQueryIdValue(query[a], id);
         } else if (typeof query[a] === 'object') {
            changeQueryIdValue(query[a], id);
         }
      }
   }
}

export default new Publishers;