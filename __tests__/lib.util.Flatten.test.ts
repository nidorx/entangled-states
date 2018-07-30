import { flatten, unflatten } from './../src/lib/util/Flatten';

describe('Flatten', () => {

   /**
    * Formato inicial do objeto
    */
   const UNFLATTED = {
      string: 'string',
      "@string": 'string',
      number: 1,
      float: 0.5,
      null: null,
      true: true,
      false: false,
      undefined: undefined,
      arrayString: ['string', 'string2', 'string3', undefined],
      arrayNumber: [1, 2, 3, undefined],
      arrayMixed: [1, 'string', 0.05, null, undefined],
      arrayEmpty: [],
      arrayEmpty2: [undefined, undefined],
      arrayObject: [
         {
            id: 1,
            string: 'string',
            number: 1,
            float: 0.5,
            null: null,
            true: true,
            false: false,
            undefined: undefined,
            arrayString: ['string', 'string2', 'string3', undefined],
            arrayNumber: [1, 2, 3, undefined],
            arrayMixed: [1, 'string', 0.05, null, undefined],
            arrayEmpty: [],
            arrayEmpty2: [undefined, undefined],
            arrayObject: [
               {
                  id: 3,
                  string: 'string',
                  number: 1,
                  float: 0.5,
                  null: null,
                  true: true,
                  false: false,
                  undefined: undefined,
                  arrayString: ['string', 'string2', 'string3', undefined],
                  arrayNumber: [1, 2, 3, undefined],
                  arrayMixed: [1, 'string', 0.05, null, undefined],
                  arrayEmpty: [],
                  arrayEmpty2: [undefined, undefined],
                  arrayObject: [],
               }
            ],
         },
         {
            id: 2,
            string: 'string',
            number: 1,
            float: 0.5,
            null: null,
            true: true,
            false: false,
            undefined: undefined,
            arrayString: ['string', 'string2', 'string3', undefined],
            arrayNumber: [1, 2, 3, undefined],
            arrayMixed: [1, 'string', 0.05, null, undefined],
            arrayEmpty: [],
            arrayEmpty2: [undefined, undefined],
            arrayObject: [],
         }
      ],
   };

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

   /**
    * Formato do objeto após a reversão
    * 
    * Os undefineds são discartados do objeto
    */
   const REVERSED = {
      string: 'string',
      "@string": 'string',
      number: 1,
      float: 0.5,
      null: null,
      true: true,
      false: false,
      arrayString: ['string', 'string2', 'string3'],
      arrayNumber: [1, 2, 3],
      arrayMixed: [1, 'string', 0.05, null],
      arrayEmpty: [],
      arrayEmpty2: [],
      arrayObject: [
         {
            id: 1,
            string: 'string',
            number: 1,
            float: 0.5,
            null: null,
            true: true,
            false: false,
            arrayString: ['string', 'string2', 'string3'],
            arrayNumber: [1, 2, 3],
            arrayMixed: [1, 'string', 0.05, null],
            arrayEmpty: [],
            arrayEmpty2: [],
            arrayObject: [
               {
                  id: 3,
                  string: 'string',
                  number: 1,
                  float: 0.5,
                  null: null,
                  true: true,
                  false: false,
                  arrayString: ['string', 'string2', 'string3'],
                  arrayNumber: [1, 2, 3],
                  arrayMixed: [1, 'string', 0.05, null],
                  arrayEmpty: [],
                  arrayEmpty2: [],
                  arrayObject: [],
               }
            ],
         },
         {
            id: 2,
            string: 'string',
            number: 1,
            float: 0.5,
            null: null,
            true: true,
            false: false,
            arrayString: ['string', 'string2', 'string3'],
            arrayNumber: [1, 2, 3],
            arrayMixed: [1, 'string', 0.05, null],
            arrayEmpty: [],
            arrayEmpty2: [],
            arrayObject: [],
         }
      ],
   };

   it('Deve mapear objetos mistos para objetos simples', () => {
      const result = flatten(UNFLATTED);

      expect(result).toStrictEqual(FLATTED);
   });

   it('Deve reverter o mapeamento', () => {
      const result = unflatten(FLATTED);

      expect(result).toStrictEqual(REVERSED);
   });
});