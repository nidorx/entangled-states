import { compress, decompress } from './Compress';
import { Json } from '../Constants';

/**
 * Marcador de Arrays
 */
const T_ARRAY = '@';
const T_ARRAY_OBJECT = 1;
const T_ARRAY_PRIMITIVE = 0;

export const ErrorIdRequired = 'É necessário que todos os itens de um Array de Objetos tenham identificador (id, _id, key ou _key)';
export const ErrorArrayMixedNotAccepted = 'Não é permitido o uso de Arrays mistos (Objetos e Primitivos)';
export const ErrorDeltaCompressHasNoDiff = 'Não é possível comprimir o objeto. Não existe diferenças. Consultar Delta.hasDiff() antes da invocação deste método';
export const ErrorDeltaBadInitialization = 'Objeto de delta inicializado de forma errada. Consulte Delta::diff e Delta::decompress';
export const ErrorOnlyObjectOrArrayAccepted = ' DTO aceita apenas Objetos e Arrays como entrada.';
export const ErrorDecompressAcceptOnlyStrings = ' DTO::decompress() aceita apenas String como entrada.';
export const ErrorArrayMultidimensionalNotAccepted = 'Não é permitido o uso de array multidimensional. Ex. key=[[],[]]';


/**
 * Data Transfer Object
 * 
 * Utilitário para padronizar o transporte de dados pela rede.
 * 
 * O DTO pode fazer diff e patch do objeto além de permitir comprimir os dados para transporte
 */
export default class DTO {

   /**
    * Obtém um objeto DTO a partir de um valor comprimido
    * 
    * @param compressed 
    */
   static decompress(compressed: string): DTO {
      if (typeof compressed !== 'string') {
         throw new Error(ErrorDecompressAcceptOnlyStrings);
      }

      // Não faz processamento agora, deixa pra fazer o processamento na invocação dos métodos
      const instance = new DTO({});
      instance.object = undefined;
      instance.compressed = compressed;
      return instance;
   }

   /**
    * Obtém um objeto DTO a partir de um valor modificado
    * 
    * @param flattened 
    */
   static flattened(flattened: any): DTO {

      // Não faz processamento agora, deixa pra fazer o processamento na invocação dos métodos
      const instance = new DTO({});
      instance.object = undefined;
      instance.flattened = flattened;
      return instance;
   }

   private object: any;

   private flattened: any;

   private compressed?: string;

   constructor(object: Json) {
      if (object instanceof DTO) {
         object = object.unflatten();
      }
      const type = typeof object;
      if (type === 'string' || type === 'number' || type === 'boolean' || type === 'symbol' || object === null || object === undefined) {
         throw new Error(ErrorOnlyObjectOrArrayAccepted);
      }

      // Evita referencia em memória
      this.object = JSON.parse(JSON.stringify(object, stringifyReplacer));
   }

   /**
   * Obtém a versão modificada do objeto original
   */
   flatten(): Json {
      if (!this.flattened) {
         this.flattened = this.flattenObject(this.unflatten());
      }

      return JSON.parse(JSON.stringify(this.flattened, stringifyReplacer));
   }

   /**
    * Obtém a versão do objeto original
    */
   unflatten(): Json {
      if (!this.object) {
         if (this.flattened) {
            this.object = this.unflattenObject(this.flattened);
         } else if (this.compressed) {
            // Decompress
            this.flattened = decompress(this.compressed);
            this.object = this.unflattenObject(this.flattened);
         }
      }

      return JSON.parse(JSON.stringify(this.object, stringifyReplacer));
   }

   /**
    * Gera uma versão comprimida deste objeto
    */
   compress(): string {
      if (!this.compressed) {
         this.compressed = compress(this.flatten());
      }
      return this.compressed;
   }

   /**
    * Permite obter a diferença entre o objeto atual e outro objeto
    * 
    * @param other 
    */
   diff(other: DTO): Delta {
      return Delta.diff(this, other);
   }

   /**
    * Aplica um patch a esse objeto, retornando uma nova instancia do DTO
    * 
    * @param delta 
    */
   patch(delta: Delta): DTO {
      return delta.patch(this);
   }

   /**
   * Aplica um patch (compactado) a esse objeto, retornando uma nova instancia do DTO
   * 
   * @param delta 
   */
   patchCompressed(compressedDelta: string): DTO {
      return Delta.decompress(compressedDelta).patch(this);
   }

   /**
    * Remover todos os arrays de um objeto, mapeando-os por [id|_id|key|_key] em caso de objetos e INDEX para dados simples
    * 
    * Valores UNDEFINED são descartados
    * 
    * @param {*} obj 
    */
   private flattenObject(obj: any): any {
      let out: any;
      const type = typeof obj;
      if (type === 'string' || type === 'number' || type === 'boolean' || type === 'symbol' || obj === null) {
         out = obj
      } else if (Array.isArray(obj)) {
         out = {};
         let isObject: any = undefined;
         obj.forEach((item, index) => {
            if (Array.isArray(item)) {
               throw new Error(ErrorArrayMultidimensionalNotAccepted);
            }

            if (item === undefined) {
               return;
            }

            const type = typeof item;
            if (type === 'string' || type === 'number' || type === 'boolean' || type === 'symbol' || item === null) {

               // validar se existe valor mesclado
               if (isObject) {
                  throw new Error(ErrorArrayMixedNotAccepted);
               }

               isObject = false;

               // Array por índice mesmo
               out[index] = item;
            } else if (type === 'object') {

               let id = item.$id || item._id || item.id || item._key || item.key;
               if (id === undefined || id === null) {
                  //Essa implementação espera que todos os itens de um array possua id, _id, key ou _key.
                  throw new Error(ErrorIdRequired);
               }

               if (isObject === false) {
                  throw new Error(ErrorArrayMixedNotAccepted);
               }
               isObject = true;

               // Se id começar com @, adiciona outra para validação no unflatten
               const newId = (typeof (id) === 'string' && id.charAt(0) === T_ARRAY) ? (T_ARRAY + id) : id;
               const itemFlatten = this.flattenObject(item)
               if (itemFlatten !== undefined) {
                  out[newId] = itemFlatten;
               }
            }
         });

         // Tipos de array
         out[T_ARRAY] = isObject ? T_ARRAY_OBJECT : T_ARRAY_PRIMITIVE;

         // Array vazio, é aceito
         // if (Object.keys(out).length === 1) {
      } else if (type === 'object') {
         out = {};
         for (var id in obj) {
            if (!obj.hasOwnProperty(id)) {
               continue;
            }

            if (obj[id] === undefined) {
               continue;
            }

            // Se id começar com @, adiciona outra para validação no unflatten
            const newId = (typeof (id) === 'string' && id.charAt(0) == T_ARRAY) ? (T_ARRAY + id) : id;
            const objIdFlatten = this.flattenObject(obj[id])
            if (objIdFlatten !== undefined) {
               out[newId] = objIdFlatten;
            }
         }
      }

      return out;
   }

   /**
    * Faz a decodificação do objeto anterior
    * 
    * @param {*} obj 
    */
   private unflattenObject(obj: any): any {
      let out: any;
      if (Array.isArray(obj)) {
         // Não aceita
         return undefined;
      }

      const type = typeof obj;

      if (type === 'string' || type === 'number' || type === 'boolean' || type === 'symbol' || obj === null) {
         // primitivo
         out = obj
      } else if (type === 'object') {
         if (T_ARRAY in obj) {
            // Reverte array
            out = [];
            if (obj[T_ARRAY] === T_ARRAY_OBJECT) {

               // Array de Objetos
               for (var flatId in obj) {
                  if (!obj.hasOwnProperty(flatId) || flatId === T_ARRAY) {
                     continue;
                  }
                  const value = this.unflattenObject(obj[flatId]);
                  if (value === undefined) {
                     continue;
                  }
                  out.push(value);
               }

            } else {

               // Array de primitivos
               for (var flatId in obj) {
                  if (!obj.hasOwnProperty(flatId) || flatId === T_ARRAY) {
                     continue;
                  }
                  out[Number.parseInt(flatId)] = obj[flatId];
               }
            }

         } else {

            // Objeto normal
            out = {};
            for (var flatId in obj) {
               if (!obj.hasOwnProperty(flatId)) {
                  continue;
               }
               const value = this.unflattenObject(obj[flatId]);
               if (value === undefined) {
                  continue;
               }

               // Remove marcação de array
               const newId = (typeof (flatId) === 'string' && flatId.charAt(0) == T_ARRAY) ? flatId.substring(1) : flatId;
               out[newId] = value;
            }
         }
      }

      return out;
   }
}

/**
 * Definição do objeto de diff
 */
export interface DeltaObject {
   /**
    * Diferenças entre os objetos
    */
   d?: Json;
   /**
    * Atributos adicionados
    */
   a?: Json;
   /**
    * Atributos modificados
    */
   m?: Json;
   /**
    * Alterações recursivas
    */
   r?: Json;
};

/**
 * Representação da diferença entre dois objetos DTO
 */
export class Delta {

   private deltaObj?: DeltaObject;

   private compressed?: string;

   private areEquals?: boolean = undefined;

   /**
    * Obtém um objeto Delta a partir da comparação de dois objetos DTO
    * 
    * @param compressed 
    */
   static diff(dtoA: DTO, dtoB: DTO): Delta {
      const instance = new Delta();
      instance.deltaObj = instance.diffObject(dtoA.flatten(), dtoB.flatten());
      return instance;
   }

   /**
    * Obtém um objeto Delta a partir de um valor comprimido
    * 
    * @param compressedDelta 
    */
   static decompress(compressedDelta: string): Delta {
      const instance = new Delta();
      instance.compressed = compressedDelta;
      return instance;
   }

   /**
    * Informa que não existe diferença entre os dois objetos testados
    */
   hasDiff(): boolean {
      if (this.areEquals === undefined) {
         this.areEquals = !(Object.keys(this.delta())[0]);
      }
      return !this.areEquals;
   }

   /**
    * Obtém a versão comprimida do DIFF, usada para tranporte
    */
   compress(): string {
      if (!this.hasDiff()) {
         throw new Error(ErrorDeltaCompressHasNoDiff);
      }

      if (!this.compressed) {

         if (this.deltaObj) {
            this.compressed = compress(this.deltaObj);
         } else {
            throw new Error(ErrorDeltaBadInitialization);
         }

      }

      return this.compressed;
   }

   /**
    * Obtém o objeto delta desta instancia
    */
   delta(): DeltaObject {
      if (!this.deltaObj) {
         if (this.compressed) {
            this.deltaObj = decompress(this.compressed)
         } else {
            throw new Error(ErrorDeltaBadInitialization);
         }
      }

      return JSON.parse(JSON.stringify(this.deltaObj, stringifyReplacer)) as any;
   }

   /**
    * Aplica esse Delta no outro objeto
    * 
    * @param old 
    */
   patch(old: DTO): DTO {
      const flattened = old.flatten();

      this.patchObject(flattened, this.delta());
      return DTO.flattened(flattened);
   }

   /**
    * Obtém a diferença entre dois objetos (Baseado no dffptch com modificações).
    * 
    * @link https://github.com/paldepind/dffptch
    * 
    * @param a 
    * @param b 
    */
   private diffObject(a: any, b: any) {
      const aKeys = Object.keys(a).sort();
      const bKeys = Object.keys(b).sort();

      // Adições
      const adds: Json = {};

      // Modificações
      const mods: Json = {};

      // Alterações recursivas
      const recs: Json = {};

      // Remoções
      const dels: Json = {};

      let aI = 0;
      let bI = 0;

      const delta: DeltaObject = {};

      // Continuar o loop, desde que não cheguemos ao final das duas listas de chaves
      while (aKeys[aI] || bKeys[bI]) {
         let aKey = aKeys[aI];
         let shortAKey = String.fromCharCode(aI + 48);
         let bKey = bKeys[bI];
         let aVal = a[aKey];
         let bVal = b[bKey];

         if (aKey == bKey) {
            /**
             * Nós estamos olhando para duas chaves iguais, isto é uma mudança - possivelmente para um objeto ou matriz
             */
            if (Object(aVal) === aVal && Object(bVal) === bVal) {
               // Encontre mudanças no objeto recursivamente
               var rDelta = this.diffObject(aVal, bVal);

               // Adicionar delta recursivo se tiver modificações
               if (Object.keys(rDelta)[0]) {
                  recs[shortAKey] = rDelta;
               }
            } else if (aVal !== bVal) {
               mods[shortAKey] = bVal;
            }

            aI++;
            bI++;

         } else if (aKey > bKey || !aKey) {
            // aKey está à frente, isso significa que as chaves foram adicionadas a b
            adds[bKey] = bVal;
            bI++;
         } else {
            // bKey é maior, as chaves foram eliminadas
            dels[shortAKey] = 1;
            aI++;
         }
      }

      // Adicionamos somente os tipos de mudança ao delta se eles contiverem alterações
      if (Object.keys(dels)[0]) {
         delta.d = dels;
      }

      if (Object.keys(adds)[0]) {
         delta.a = adds;
      }

      if (Object.keys(mods)[0]) {
         delta.m = mods;
      }

      if (Object.keys(recs)[0]) {
         delta.r = recs;
      }

      return delta;
   }

   /**
    * Aplica o delta em um objeto (Baseado no dffptch com modificações)
    * 
    * @link https://github.com/paldepind/dffptch 
    * @param flattened 
    * @param delta 
    */
   private patchObject(flattened: Json, delta: DeltaObject) {
      let operation: string;
      let key: any;
      let val: any;
      let longKey: any;
      let objKeys = Object.keys(flattened).sort();

      for (operation in delta) {

         // Operation is either 'a', 'm', 'd' or 'r'
         for (key in (delta as any)[operation]) {

            val = (delta as any)[operation][key];

            longKey = objKeys[key.charCodeAt() - 48];

            operation == 'a'
               // addition
               ? flattened[key] = val
               : operation == 'm'
                  // modification
                  ? flattened[longKey] = val
                  : operation == 'd'
                     // deletion
                     ? delete flattened[longKey]
                     // recuse
                     : this.patchObject(flattened[longKey], val);
         }
      }
   }
}


/**
 * Remove os valores undefined dos arrays 
 * 
 * @param name 
 * @param val 
 */
function stringifyReplacer(name: string | number, val: any) {
   if (Array.isArray(val)) {
      return val.filter((item) => item !== undefined);
   }
   return val;
};