import React from "react";
import Client from "./Client";

/**
 * Implementação do Cliente para trabalhar com React e ReactNative de forma mais natural
 */
export default class ClientReact extends Client {

   /**
    * Método específico para trablhar com componentes React/React native
    * 
    * Injeta no componente a habilitade de ser atualizado quando receber novas mensagens no tópico, 
    * sem a necessidde de remover a referencia quando o componente for removido.
    * 
    * Ex.: 
    * componentDidMount() {
    *     Client.inject(this, 'grupos', (grupos: Array<Grupo>) => {
    *         this.setState({
    *             grupos: grupos
    *         });
    *     });
    * }
    * 
    * @param topic 
    * @param callback 
    */
   inject(component: React.Component, topic: string, callback: (data: any) => void): () => void {

      this.logger.trace('ClientReact injetando no componente. { topic=', topic, 'componente=', component, ' }');
      
      let componentUnmounted = false;
      
      const cancel = this.subscribe(topic, (data) => {
         if (componentUnmounted) {
            cancel();
            return;
         }

         callback(data);
      });

      // Permite ouvir quando o componente não está mais montado, evitando processamento desnecessário
      // https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html
      const bindComponentWillUnmount = (component.componentWillUnmount || new Function).bind(component);
      component.componentWillUnmount = () => {
         componentUnmounted = true;
         cancel();
         bindComponentWillUnmount();
      }

      return cancel;
   }
}
