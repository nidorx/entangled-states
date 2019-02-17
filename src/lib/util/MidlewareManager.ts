
export type MidleWare<T> = (context: T, next: (err?: any) => void) => void;


/**
 * Gerenciador de Midlewares genérico
 */
export default class MidlewareManager<T> {

   private count: number;

   private counterId: string;

   private middlewares: { [key: string]: Array<MidleWare<T>> } = {
      '*': []
   };

   constructor() {
      this.count = 0;
      // Nome da propriedade usada para ordenação de execução deste Midleware
      // Um mesmo Midleware pode ser usado em outras funcionalidades, cada contador é único por instancia de MidlewareManager
      this.counterId = '__midlewareOrder' + (Math.random() * 1e9 >>> 0) + '__';
   }

   /**
    * Permite adicionar Midlewares 
    * 
    * @param middlewares Um ou mais midlewares
    * @param name O Wildcard "*" é usado quando se deseja adicionar um midleware para todas as actions (basta não informar a action)
    */
   add(middlewares: MidleWare<T> | Array<MidleWare<T>>, name?: string): void {

      if (name === null || name === undefined) {
         name = '*';
      }

      if (!this.middlewares[name]) {
         this.middlewares[name] = [];
      }

      if (!Array.isArray(middlewares)) {
         middlewares = [middlewares];
      }
      (middlewares as Array<MidleWare<T>>).forEach(middleware => {
         if (middleware === null || middleware === undefined || typeof middleware !== 'function') {
            return;
         }
         Object.defineProperty(middleware, this.counterId, { value: this.count++ });
         this.middlewares[name as string].push(middleware);
      });

   }

   /**
    * Permite remover um Midleware adicionado anteriormente
    * 
    * @param name 
    * @param middleware 
    */
   remove(middleware: MidleWare<T>, name?: string) {
      if (name == null || name == undefined) {
         name = '*';
      }
      if (!this.middlewares[name]) {
         return;
      }

      if (name === '*') {
         for (var attr in this.middlewares) {
            if (!this.middlewares.hasOwnProperty(attr)) {
               continue;
            }

            const idx = this.middlewares[attr].indexOf(middleware);
            if (idx >= 0) {
               this.middlewares[attr].splice(idx, 1);
            }
         }
      } else {
         const idx = this.middlewares[name].indexOf(middleware);
         if (idx >= 0) {
            this.middlewares[name].splice(idx, 1);
         }
      }
   }

   /**
    * Executa os MidleWare informados
    * 
    * Se o Midleware não acionar o next, o Promise nunca é resolvido (portanto, ignorado)
    * 
    * @param event 
    * @param context 
    */
   exec(names: string | Array<string>, context: T): Promise<T> {

      let middlewares: Array<MidleWare<T>> = (this.middlewares['*'] || []);

      if (!Array.isArray(names)) {
         names = [names];
      }
      names.forEach(name => {
         if (name === null || name === undefined || typeof name !== 'string') {
            return;
         }
         middlewares = middlewares.concat(this.middlewares[name] || []);
      });

      // Define a ordem de execução dos Midlewares
      middlewares.sort((a: any, b: any) => {
         return a[this.counterId] - b[this.counterId];
      });

      // Remove duplicidades
      middlewares = middlewares.filter((value, index, self) => {
         return self.indexOf(value) === index;
      });

      return new Promise<any>((resolve, reject) => {
         // last called middleware #
         let index = -1

         dispatch(0, null);

         function dispatch(actual: number, err: any) {
            if (err) {
               return reject(err);
            }

            if (actual <= index) {
               console.error('next() called multiple times');
               // next() called multiple times
               return;
            }

            index = actual;

            if (actual === middlewares.length) {
               return resolve(context);
            }

            try {
               let next = dispatch.bind(null, actual + 1);
               middlewares[actual](context, next);
            } catch (err) {
               reject(err);
            }
         }
      });
   }
}