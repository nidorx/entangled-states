import DTO, {
   ErrorIdRequired,
   ErrorArrayMixedNotAccepted,
   ErrorOnlyObjectOrArrayAccepted,
   ErrorDecompressAcceptOnlyStrings,
   ErrorArrayMultidimensionalNotAccepted
} from './../../src/lib/util/DTO';
// import fs from 'fs';

describe('DTO', () => {

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

   const COMPRESSED = "||string|@@string|number|float|0.5|arrayString|string2|string3|arrayNumber|arrayMixed|0.05|arrayEmpty|arrayEmpty2|arrayObject||$LLMLN8OPKHIFJGQ$-L.R/S(7%T$-8.9/:(7%U$-8.L/V0H(7%W$(7%X$(7%Y$.$C8LLN8OPKHIFJGQ$-L.R/S(7%T$-8.9/:(7%U$-8.L/V0H(7%W$(7%X$(7%Y$0$C:LLN8OPKHIFJGQ$-L.R/S(7%T$-8.9/:(7%U$-8.L/V0H(7%W$(7%X$(7%Y$(7%%(8%%/$C9LLN8OPKHIFJGQ$-L.R/S(7%T$-8.9/:(7%U$-8.L/V0H(7%W$(7%X$(7%Y$(7%%(8%%";


   /**
    * Alterações no objeto inicial
    */
   const UNFLATTED_DIFF = {
      string: 'string',
      "@string": 'string',
      number: 2,
      float: 0.7,
      null: null,
      true: false,
      false: true,
      undefined: undefined,
      arrayString: ['string2', 'string3', undefined, 'string4'],
      arrayNumber: [1, 3, undefined, 4],
      arrayMixed: [1, 'string2'],
      arrayEmpty: ['string', 'string2', 'string3'],
      arrayEmpty2: [undefined, undefined, { id: 1, valor: 3 }, { id: 2, valor: 5 }],
      arrayObject: [
         {
            id: 1,
            string: 'string',
            number: 1,
            float: 0.5,
            null: null,
            true: true,
            arrayString: ['string', 'string2'],
            arrayNumber: [1, 2, 3, undefined],
            arrayMixed: [1, 'string', 0.05, null, undefined],
            arrayEmpty: [],
            arrayEmpty2: [undefined, undefined],
            arrayObject: [],
         },
         {
            id: 2,
            string: 'string',
            number: 1,
            float: 0.5,
            true: false,
            false: true,
            undefined: undefined,
            arrayString: ['string', 'string3', 'string5', undefined],
            arrayNumber: [1, 2, 3, undefined],
            arrayMixed: [1, 'string', 0.05, null, undefined],
            arrayEmpty: ['string'],
            arrayEmpty2: [undefined, undefined],
            arrayObject: [],
         }
      ],
   };

   const DELTA = {
      "m": {
         "7": true,
         "8": 0.7,
         ":": 2,
         "<": false
      },
      "r": {
         "1": {
            "a": {
               "0": "string",
               "1": "string2",
               "2": "string3"
            }
         },
         "2": {
            "a": {
               "1": {
                  "id": 1,
                  "valor": 3
               },
               "2": {
                  "id": 2,
                  "valor": 5
               }
            },
            "m": {
               "0": 1
            }
         },
         "3": {
            "d": {
               "2": 1,
               "3": 1
            },
            "m": {
               "1": "string2"
            }
         },
         "4": {
            "m": {
               "1": 3,
               "2": 4
            }
         },
         "5": {
            "r": {
               "0": {
                  "d": {
                     "6": 1
                  },
                  "r": {
                     "4": {
                        "d": {
                           "0": 1
                        },
                        "m": {
                           "1": 0
                        }
                     },
                     "5": {
                        "d": {
                           "2": 1
                        }
                     }
                  }
               },
               "1": {
                  "d": {
                     "9": 1
                  },
                  "m": {
                     "6": true,
                     "<": false
                  },
                  "r": {
                     "0": {
                        "a": {
                           "0": "string"
                        }
                     },
                     "5": {
                        "m": {
                           "1": "string3",
                           "2": "string5"
                        }
                     }
                  }
               }
            }
         },
         "6": {
            "m": {
               "0": "string2",
               "1": "string3",
               "2": "string4"
            }
         }
      }
   };

   const DELTA_COMPRESSED = "||0.7|<|string|string2|string3|valor|string5|string4||$*$4F5L'9MG%,$.$)$-N.O/P%%/$)$.$C8Q:%/$C9Q<%%*$-8%%0$+$/808%*$.O%%1$*$.:/;%%2$,$-$+$38%,$1$+$-8%*$.7%%2$+$/8%%%%.$+$68%*$3FMG%,$-$)$-N%%2$*$.P/R%%%%%%3$*$-O.P/S%%%%";

   /**
    * Formato final do objeto, após receber o patch
    */
   const PATCH = {
      string: 'string',
      "@string": 'string',
      number: 2,
      float: 0.7,
      null: null,
      true: false,
      false: true,
      arrayString: ['string2', 'string3', 'string4'],
      arrayNumber: [1, 3, 4],
      arrayMixed: [1, 'string2'],
      arrayEmpty: ['string', 'string2', 'string3'],
      arrayEmpty2: [{ id: 1, valor: 3 }, { id: 2, valor: 5 }],
      arrayObject: [
         {
            id: 1,
            string: 'string',
            number: 1,
            float: 0.5,
            null: null,
            true: true,
            arrayString: ['string', 'string2'],
            arrayNumber: [1, 2, 3],
            arrayMixed: [1, 'string', 0.05, null],
            arrayEmpty: [],
            arrayEmpty2: [],
            arrayObject: [],
         },
         {
            id: 2,
            string: 'string',
            number: 1,
            float: 0.5,
            true: false,
            false: true,
            arrayString: ['string', 'string3', 'string5'],
            arrayNumber: [1, 2, 3],
            arrayMixed: [1, 'string', 0.05, null],
            arrayEmpty: ['string'],
            arrayEmpty2: [],
            arrayObject: [],
         }
      ],
   };

   it('Deve mapear um objeto complexo para um DTO', () => {
      const dto = new DTO(UNFLATTED);

      expect(dto.flatten()).toStrictEqual(FLATTED);
      expect(dto.unflatten()).toStrictEqual(REVERSED);
      expect(dto.compress()).toStrictEqual(COMPRESSED);
   });

   it('Deve reverter um Flatted a partir de um mapeamento', () => {
      const dto = DTO.flattened(FLATTED);

      expect(dto.flatten()).toStrictEqual(FLATTED);
      expect(dto.unflatten()).toStrictEqual(REVERSED);
      expect(dto.compress()).toStrictEqual(COMPRESSED);
   });

   it('Deve reverter um Flatted a partir da string comprimida', () => {
      const dto = DTO.decompress(COMPRESSED);

      expect(dto.flatten()).toStrictEqual(FLATTED);
      expect(dto.unflatten()).toStrictEqual(REVERSED);
      expect(dto.compress()).toStrictEqual(COMPRESSED);
   });

   it('Só deve aceitar string no método DTO::decompress()', () => {
      expect(() => {
         DTO.decompress({} as any)
      }).toThrow(ErrorDecompressAcceptOnlyStrings);

      expect(() => {
         DTO.decompress(1 as any)
      }).toThrow(ErrorDecompressAcceptOnlyStrings);

      expect(() => {
         DTO.decompress([] as any)
      }).toThrow(ErrorDecompressAcceptOnlyStrings);

      expect(() => {
         DTO.decompress(null as any)
      }).toThrow(ErrorDecompressAcceptOnlyStrings);

      expect(() => {
         DTO.decompress(undefined as any)
      }).toThrow(ErrorDecompressAcceptOnlyStrings);

      expect(() => {
         DTO.decompress(true as any)
      }).toThrow(ErrorDecompressAcceptOnlyStrings);
   });

   it('Só deve aceitar Objetos e Arrays no construtor', () => {
      expect(() => {
         new DTO('' as any)
      }).toThrow(ErrorOnlyObjectOrArrayAccepted);

      expect(() => {
         new DTO(1 as any)
      }).toThrow(ErrorOnlyObjectOrArrayAccepted);

      expect(() => {
         new DTO(null as any)
      }).toThrow(ErrorOnlyObjectOrArrayAccepted);

      expect(() => {
         new DTO(undefined as any)
      }).toThrow(ErrorOnlyObjectOrArrayAccepted);

      expect(() => {
         new DTO(true as any)
      }).toThrow(ErrorOnlyObjectOrArrayAccepted);
   });

   it('Deve aceitar outro DTO no construtor', () => {
      const dtoA = new DTO(UNFLATTED);
      const dto = new DTO(dtoA);

      expect(dto.flatten()).toStrictEqual(FLATTED);
      expect(dto.unflatten()).toStrictEqual(REVERSED);
      expect(dto.compress()).toStrictEqual(COMPRESSED);
   });


   it('Não deve aceitar o uso de array multidimensional', () => {

      expect(() => {
         new DTO({
            arrayString: ['string', 'string2', 'string3', ['string', 'string2', 'string3']],
         }).flatten();
      }).toThrow(ErrorArrayMultidimensionalNotAccepted);

      expect(() => {
         new DTO({
            arrayObjeto: [[{ id: 33, b: 35 }]],
         }).flatten();
      }).toThrow(ErrorArrayMultidimensionalNotAccepted);

   });

   it('Todos objeto de array deve possuir id', () => {

      expect(() => {
         new DTO({
            arrayObjeto: [{ a: 33 }],
         }).flatten();
      }).toThrow(ErrorIdRequired);

      expect(() => {
         new DTO({
            rrayObjeto: [{ id: 33 }, { a: 22 }],
         }).flatten();
      }).toThrow(ErrorIdRequired);

   });

   it('Não deve aceitar array mesclado (Primitivos e Objetos)', () => {
      expect(() => {
         new DTO({
            arrayString: ['string', 'string2', 'string3', { id: 33 }],
         }).flatten();
      }).toThrow(ErrorArrayMixedNotAccepted);

      expect(() => {
         new DTO({
            arrayString: ['string', 'string2', 'string3', { id: 33, b: 35 }],
         }).flatten();
      }).toThrow(ErrorArrayMixedNotAccepted);

      expect(() => {
         new DTO({
            arrayString: [5, { id: 33, b: 35 }],
         }).flatten();
      }).toThrow(ErrorArrayMixedNotAccepted);

      expect(() => {
         new DTO({
            arrayObjeto: [{ id: 33, b: 35 }, 'string'],
         }).flatten();
      }).toThrow(ErrorArrayMixedNotAccepted);

      expect(() => {
         new DTO({
            arrayObjeto: [{ id: 33, b: 35 }, 25],
         }).flatten();
      }).toThrow(ErrorArrayMixedNotAccepted);
   });


   it('Deve permitir fazer o DIFF de dois objetos e restaurar com Patch', () => {
      const dtoA = new DTO(UNFLATTED);
      const dtoB = new DTO(UNFLATTED_DIFF);

      const delta = dtoA.diff(dtoB);

      expect(delta.hasDiff());

      // console.log(JSON.stringify(delta.delta()));
      // fs.writeFileSync(__dirname + '/delta.compress', JSON.stringify(delta.compress()));

      expect(delta.delta()).toStrictEqual(DELTA);
      expect(delta.compress()).toStrictEqual(DELTA_COMPRESSED);


      const dtoC = new DTO(UNFLATTED);
      const dtoD = dtoC.patch(delta);

      // Os dois objetos devem ser iguais
      expect(dtoD.unflatten()).toStrictEqual(dtoB.unflatten());

      expect(dtoD.unflatten()).toStrictEqual(PATCH);
   });


   it('Deve permitir aplicar o Patch a partir do delta comprimido', () => {
      const dtoServer = new DTO(UNFLATTED_DIFF);

      const dtoClient = new DTO(UNFLATTED);
      const dtoPatch = dtoClient.patchCompressed(DELTA_COMPRESSED);

      // Os dois objetos devem ser iguais, em todos os aspectos
      expect(dtoPatch.unflatten()).toStrictEqual(dtoServer.unflatten());
      expect(dtoPatch.flatten()).toStrictEqual(dtoServer.flatten());
      expect(dtoPatch.compress()).toStrictEqual(dtoServer.compress());
      expect(dtoPatch.unflatten()).toStrictEqual(PATCH);


      const delta = dtoServer.diff(dtoPatch);

      // Não deve apontar diferenças entre os dois objetos
      expect(!delta.hasDiff());
   });
});