import MidlewareManager from '../../src/lib/util/MidlewareManager';

describe('MidlewareManager', () => {

   it('Deve executar todos os Midlewares e ao final resolver o Promise', async (done) => {

      const manager = new MidlewareManager<any>();

      manager.add((context, next) => {
         
         expect(context.count).toStrictEqual(0);

         context.count++;
         setTimeout(next, 10);
      });

      manager.add((context, next) => {
         
         expect(context.count).toStrictEqual(1);

         context.count++;
         setTimeout(next, 10);
      });

      manager.add((context, next) => {
         
         expect(context.count).toStrictEqual(2);

         context.count++;
         setTimeout(next, 10);
      });

      manager.exec('*', { count: 0 })
         .then(context => {
            // cada promise fez o incremento
            expect(context.count).toStrictEqual(3);

            done();
         })
         .catch(cause => {
            // deve estourar timeout
            throw cause;
         });
   });

   it('Deve executar somente os Midlewares com o namespace informado', async (done) => {

      const manager = new MidlewareManager<any>();

      manager.add((context, next) => {
         
         expect(context.count).toStrictEqual(0);

         context.count++;
         setTimeout(next, 10);
      }, 'xpto-a');

      manager.add((context, next) => {

         throw new Error('Este midleware não deve ser invocado');
      }, 'xpto-b');

      // Namespace = '*'
      manager.add((context, next) => {

         
         expect(context.count).toStrictEqual(1);

         context.count++;
         setTimeout(next, 10);
      });

      manager.exec('xpto-a', { count: 0 })
         .then(context => {
            // Somente dois itens deve ser chamado
            expect(context.count).toStrictEqual(2);

            done();
         })
         .catch(cause => {
            // deve estourar timeout
            throw cause;
         });
   });
});