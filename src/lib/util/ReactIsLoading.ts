import React from "react";
import { AnyObject } from "../Constants";

/**
 * Classe utilitária para facilitar a observação de resolução de promises dentro de um componente
 * 
 * Ex.:
 * observerLogin: PromiseObserver = new PromiseObserver(this);
 * ...
 * this.observerLogin.observe<Usuario>(LocalStorage.get('usuario')) // O estado foi atualizado 
 *     .then((usuario) => {
 *        if (usuario && usuario._id) {
 *           SessaoUsuario.start(usuario as Usuario);    
 *           // Está logado
 *           this.props.navigation.replace('Inicio');
 *        }
 *     });
 * ...
 * <Button
 *      isLoading={this.observerLogin.isLoding} // Bloqueio de campo até que o promise seja resolvido
 *      reverse={true}
 *      title="Entrar"
 *      onPress={this.efetuarLogin}
 *      disabled={this.state.usuario === ''}
 *      style={{ marginTop: 10 }}
 *   />
 */
export default class ReactIsLoading {

   /**
    * Informa que é o primeiro carregamento observado por essa instancia
    */
   public isFirstLoding = true;

   /**
    * Informa se existe promise sendo processado agora
    */
   public isLoding = false;

   /**
    * Informa se possui algum erro
    */
   public hasError = false;

   /**
    * Hash usado para permitir usar como ExtraData em listas, afim de forçar renderização de PureComponents
    */
   public hash: number = (new Date()).getTime();

   /**
    * O último erro capturado
    */
   public error: any;

   private componentUnmounted = false;

   private component: React.Component | undefined;

   private promises: Array<Promise<any>> = [];

   private hashName = `__LoadingObserver_${(new Date()).getTime()}`;

   constructor(component: React.Component) {
      this.component = component;

      // Permite ouvir quando o componente não está mais montado, evitando processamento desnecessário
      // https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html
      const oldcomponentWillUnmount = (component.componentWillUnmount || new Function).bind(component);
      component.componentWillUnmount = () => {
         this.componentUnmounted = true;
         oldcomponentWillUnmount();

         // Remove referencia para o componente
         this.component = undefined
      }
   }

   /**
    * Quando o promise for resolvido, altera o estado do componente, permitindo uma nova renderização do mesmo
    * 
    * O promise será finalizado antes de o componente informar o status (isLoading = true)
    * 
    * @param promise 
    */
   observe<T>(promise: Promise<T>): Promise<T> {
      if (this.componentUnmounted) {
         // Componente não está montado
         return promise;
      }

      if (this.promises.find(p => p === promise)) {
         // promise já existe
         return promise;
      }

      // Salva promise na lista
      this.promises.push(promise);

      // Já seta novo estado para o componente
      this.newState();

      // Ao finalizar o promise, remove da lista
      const removePromise = () => {
         const idx = this.promises.indexOf(promise);
         if (idx >= 0) {
            this.promises.splice(idx, 1);
         }
         this.isFirstLoding = false;
      }

      // Observa a resolução do promise
      let received = false;

      // Garante setar novo status quando o interessado receber a resolução do promise
      const newStateOnReceive = () => {
         if (!received) {
            setTimeout(newStateOnReceive, 0);
         } else {
            // Define novo estado
            this.newState();
         }
      }

      return promise
         .then((response) => {

            removePromise();
            this.error = undefined;
            this.hasError = false;

            // Permite executar a cadeia do promise antes de definir novo status 
            return new Promise<any>((accept) => {

               if (this.componentUnmounted) {
                  // Nunca resolve o promise, componente não está montado
                  return;
               }

               // Resolve promise
               accept(response);

               newStateOnReceive();
            });
         })
         .then((response) => {
            received = true;
            return response;
         })
         .catch((reason) => {

            removePromise();

            this.error = reason;
            this.hasError = true;
            received = true;

            // Define novo estado
            this.newState();

            if (this.componentUnmounted) {
               // Nunca resolve o promise, componente não está montado
               return;
            }

            // Estoura erro ocorrido
            throw reason
         });
   }

   private newState() {
      // Se ainda possuir promises, está carregando
      this.isLoding = this.promises.length > 0;

      if (this.componentUnmounted || !this.component) {
         return;
      }

      const state: AnyObject = {};
      this.hash = (new Date()).getTime();
      state[this.hashName] = this.hash;

      this.component.setState(state);
   }
}