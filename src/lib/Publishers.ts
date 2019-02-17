import Topic from './Topic';
import { AnyObject } from './Constants';
import Repository from './repository/Repository';

/**
 * Limita a execução dos Publisher a no máximo 1 a cada <EXEC_LIMIT_TIMEOUT> ms
 */
const EXEC_LIMIT_TIMEOUT = 100;

/**
 * Configurações da consulta usada por um publicador
 */
export interface QueryConfig {
   /**
   * Repositório que possui os dados desejados nesta consulta
   */
   repository: Repository<any>;
   /**
    * Os parametros de consulta no store.
    * 
    * Quando o Tópico é COM IDENTIFICADOR os parametros com valor = $id serão substituidos pelo identificador do tópico. Ex. query:{ idCategoria : '$id' }.
    */
   params?: AnyObject;
   /**
    * Permite configurar opções adicionais do Repositório usado
    */
   options?: AnyObject;
   /**
    * Permite definir se o resultado dessa consulta será um array ou uma entidade única. 
    * 
    * Se TRUE usará o método findOne do Repositório, se FALSE usará o método find. O valor padrão é FALSE.
    */
   singleResult?: boolean;
   /**
    * Após consultar os registros, permite realizar um filtro em memória.
    * 
    * Não se aplica quando singleResult=true
    */
   filter?: (row: AnyObject, index: number, rows: Array<AnyObject>, prevResults: Array<any>) => boolean;
   /**
    * Após filtrar os registros, permite visitar cada um dos itens.
    * 
    * Não se aplica quando singleResult=true
    */
   forEach?: (row: AnyObject, index: number, rows: Array<AnyObject>, prevResults: Array<any>) => void;
   /**
    * Permite mapear o resultado para outra estrutura de dados diferente da disponibilizada pelo Repositório
    */
   map?: (row: AnyObject, index: number, rows: Array<AnyObject>, prevResults: Array<any>) => any;
   /**
    * Permite extrair um ÚNICO valor de saída, a partir dos resultado da Query atual e das Queries anteriores.
    */
   extract?: (rows: Array<AnyObject>, prevResults: Array<any>) => AnyObject;
}

/**
 * Configurações de um publisher
 */
export interface PublisherConfig {
   /**
    * Nome do tópico
    */
   topic: string;
   /**
   * Informa que este tópico é por ID, tópico de detalhamento de um item
   */
   idRequired?: boolean;
   /**
    * A configuração da Query deste publicador. 
    * 
    * Permite aninhar diversas queries
    */
   query: QueryConfig | Array<QueryConfig>;
   /**
    * Invocado após o envio do tópico
    */
   then?: (lastResult: AnyObject) => void;
}

/**
 * Permite criação e invocação de publicadores
 * 
 * @TODO: Permitir adicionar MidleWares nos publicadores
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
   create(config: PublisherConfig) {
      let topic = config.topic;
      const byId = config.idRequired;

      let queries: Array<QueryConfig>;
      if (Array.isArray(config.query)) {
         queries = config.query as Array<QueryConfig>;
      } else {
         queries = [config.query as QueryConfig];
      }

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
   private exec(id: any, prevResults: Array<any>, config: QueryConfig): Promise<Array<AnyObject>> {

      const repository = config.repository;
      const params = { ...(config.params || {}) };
      const options = { ...(config.options || {}) };
      const fnFilter = config.filter;
      const fnForEach = config.forEach;
      const fnMap = config.map;
      const fnExtract = config.extract;

      return new Promise<Array<any>>((accept, reject) => {

         changeQueryIdValue(params, id);

         if (config.singleResult) {
            repository.findOne(params, options)
               .then((doc) => {

                  if (fnMap && doc !== undefined) {
                     doc = fnMap(doc, 0, [doc], prevResults);
                  }

                  if (fnExtract && doc !== undefined) {
                     doc = fnExtract([doc], prevResults);
                  }

                  accept(doc !== undefined ? [doc] : []);
               })
               .catch(reject);

         } else {

            repository.find(params, options)
               .then((docs) => {
                  if (docs) {
                     if (fnFilter) {
                        docs = docs.filter((value, index, array) => {
                           return fnFilter(value, index, array, prevResults);
                        });
                     }

                     if (fnForEach) {
                        docs.forEach((value, index, array) => {
                           fnForEach(value, index, array, prevResults);
                        });
                     }

                     if (fnMap) {
                        docs = docs.map((value, index, array) => {
                           return fnMap(value, index, array, prevResults);
                        });
                     }

                     if (fnExtract) {
                        docs = [fnExtract(docs, prevResults)];
                     }
                  }

                  accept(docs || []);
               })
               .catch(reject);
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