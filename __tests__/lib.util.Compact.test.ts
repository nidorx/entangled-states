import { compress, decompress } from './../src/lib/util/Compact';
// import fs from 'fs';

describe('Compact', () => {

   /**
    * Formato do objeto após aplicar o flatten
    */
   const FLATTED = {
      string: 'string',
      "@@string": 'string',
      number: 1,
      float: 0.5,
      null: null,
      true: true,
      false: false,
      arrayString: { "@": 0, "0": "string", "1": "string2", "2": "string3" },
      arrayNumber: { "@": 0, "0": 1, "1": 2, "2": 3 },
      arrayMixed: { "@": 0, "0": 1, "1": "string", "2": 0.05, "3": null },
      arrayEmpty: { "@": 0 },
      arrayEmpty2: { "@": 0 },
      arrayObject: {
         "@": 1,
         "1": {
            id: 1,
            string: 'string',
            number: 1,
            float: 0.5,
            null: null,
            true: true,
            false: false,
            arrayString: { "@": 0, "0": "string", "1": "string2", "2": "string3" },
            arrayNumber: { "@": 0, "0": 1, "1": 2, "2": 3 },
            arrayMixed: { "@": 0, "0": 1, "1": "string", "2": 0.05, "3": null },
            arrayEmpty: { "@": 0 },
            arrayEmpty2: { "@": 0 },
            arrayObject: {
               "@": 1,
               "3": {
                  id: 3,
                  string: 'string',
                  number: 1,
                  float: 0.5,
                  null: null,
                  true: true,
                  false: false,
                  arrayString: { "@": 0, "0": "string", "1": "string2", "2": "string3" },
                  arrayNumber: { "@": 0, "0": 1, "1": 2, "2": 3 },
                  arrayMixed: { "@": 0, "0": 1, "1": "string", "2": 0.05, "3": null },
                  arrayEmpty: { "@": 0 },
                  arrayEmpty2: { "@": 0 },
                  arrayObject: { "@": 0 },
               }
            },
         },
         "2": {
            id: 2,
            string: 'string',
            number: 1,
            float: 0.5,
            null: null,
            true: true,
            false: false,
            arrayString: { "@": 0, "0": "string", "1": "string2", "2": "string3" },
            arrayNumber: { "@": 0, "0": 1, "1": 2, "2": 3 },
            arrayMixed: { "@": 0, "0": 1, "1": "string", "2": 0.05, "3": null },
            arrayEmpty: { "@": 0 },
            arrayEmpty2: { "@": 0 },
            arrayObject: { "@": 0 },
         }
      },
   };

   const COMPRESSED = "||string|@@string|number|float|0.5|arrayString|string2|string3|arrayNumber|arrayMixed|0.05|arrayEmpty|arrayEmpty2|arrayObject||\u0001GGHGI5JKF\u0001\u0002DAEBL\u0001*G+M,N%4\u0002O\u0001*5+6,7%4\u0002P\u0001*5+G,Q-\u0001\u0002%4\u0002R\u0001%4\u0002S\u0001%4\u0002T\u0001+\u0001?5GGI5JKF\u0001\u0002DAEBL\u0001*G+M,N%4\u0002O\u0001*5+6,7%4\u0002P\u0001*5+G,Q-\u0001\u0002%4\u0002R\u0001%4\u0002S\u0001%4\u0002T\u0001-\u0001?7GGI5JKF\u0001\u0002DAEBL\u0001*G+M,N%4\u0002O\u0001*5+6,7%4\u0002P\u0001*5+G,Q-\u0001\u0002%4\u0002R\u0001%4\u0002S\u0001%4\u0002T\u0001%4\u0002\u0002%5\u0002\u0002,\u0001?6GGI5JKF\u0001\u0002DAEBL\u0001*G+M,N%4\u0002O\u0001*5+6,7%4\u0002P\u0001*5+G,Q-\u0001\u0002%4\u0002R\u0001%4\u0002S\u0001%4\u0002T\u0001%4\u0002\u0002%5\u0002\u0002";

   it('Deve comprimir um objeto Flatted', () => {
      const result = compress(FLATTED);

      // Quando precisar gerar um novo
      // fs.writeFileSync(__dirname + '/teste.compressed', JSON.stringify(result));

      expect(result).toEqual(COMPRESSED);
   });

   it('Deve reverter a string comprimida para um objeto Flatted', () => {
      const result = decompress(COMPRESSED);

      expect(result).toStrictEqual(FLATTED);
   });
});