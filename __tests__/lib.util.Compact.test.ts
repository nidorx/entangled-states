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

   const COMPRESSED = "||string|@@string|number|float|0.5|arrayString|string2|string3|arrayNumber|arrayMixed|0.05|arrayEmpty|arrayEmpty2|arrayObject||!MMNMO9PQLIJGKHR!.M/S0T)8#U!.9/:0;)8#V!.9/M0W1I)8#X!)8#Y!)8#Z!/!D9MMO9PQLIJGKHR!.M/S0T)8#U!.9/:0;)8#V!.9/M0W1I)8#X!)8#Y!)8#Z!1!D;MMO9PQLIJGKHR!.M/S0T)8#U!.9/:0;)8#V!.9/M0W1I)8#X!)8#Y!)8#Z!)8##)9##0!D:MMO9PQLIJGKHR!.M/S0T)8#U!.9/:0;)8#V!.9/M0W1I)8#X!)8#Y!)8#Z!)8##)9##";

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