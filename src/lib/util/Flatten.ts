import { compress, decompress } from './Compress';

/**
 * Marcador de Arrays
 */
const T_ARRAY = '@';
const T_ARRAY_OBJECT = 1;
const T_ARRAY_PRIMITIVE = 0;

type ObjectJ = { [key: string]: any };

interface DeltaObj {
   d?: ObjectJ;
   a?: ObjectJ;
   m?: ObjectJ;
   r?: ObjectJ;
   [key: string]: any
};

/**
 * Representação da diferença entre dois objetos Flatten
 */
export class Delta {

   private deltaObj?: DeltaObj;

   private compressed?: string;

   private areEquals?: boolean;

   /**
    * Obtém um objeto Delta a partir da comparação de dois objetos Flatten
    * 
    * @param compressed 
    */
   static diff(flattenA: Flatten, flattenB: Flatten): Delta {
      const instance = new Delta();
      instance.deltaObj = instance.diffObject(flattenA.flatten(), flattenB.flatten());
      instance.areEquals = !!Object.keys(instance.deltaObj)[0];
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
         this.areEquals = !!Object.keys(this.delta())[0];
      }
      return !this.areEquals;
   }

   /**
    * Obtém a versão comprimida do DIFF, usada para tranporte
    */
   compress(): string {
      if (!this.hasDiff()) {
         throw new Error('Não é possível comprimir o objeto. Não existe diferenças. Consultar Delta.hasDiff() antes da invocação deste método');
      }

      if (!this.compressed) {

         if (this.deltaObj) {
            this.compressed = compress(this.deltaObj);
         } else {
            throw new Error('Objeto de delta inicializado de forma errada. Consulte Delta::diff e Delta::decompress');
         }

      }

      return this.compressed;
   }

   /**
    * Obtém o objeto delta desta instancia
    */
   delta(): DeltaObj {
      if (!this.deltaObj) {
         if (this.compressed) {
            this.deltaObj = decompress(this.compressed)
         } else {
            throw new Error('Objeto de delta inicializado de forma errada. Consulte Delta::diff e Delta::decompress');
         }
      }

      return JSON.parse(JSON.stringify(this.deltaObj)) as any;
   }

   /**
    * Aplica esse Delta no outro objeto
    * 
    * @param old 
    */
   patch(old: Flatten): Flatten {
      const flattened = old.flatten();

      this.patchObject(flattened, this.delta());
      return Flatten.flattened(flattened);
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
      const adds: ObjectJ = {};

      // Modificações
      const mods: ObjectJ = {};

      // Alterações recursivas
      const recs: ObjectJ = {};

      // Remoções
      const dels: ObjectJ = {};

      let aI = 0;
      let bI = 0;

      const delta: DeltaObj = {};

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
   private patchObject(flattened: ObjectJ, delta: DeltaObj) {
      let operation: string;
      let key: any;
      let val: any;
      let longKey: any;
      let objKeys = Object.keys(flattened).sort();

      for (operation in delta) {

         // Operation is either 'a', 'm', 'd' or 'r'
         for (key in delta[operation]) {

            val = delta[operation][key];

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
 * Simplificação estrutural de objetos, para facilitar o processo de diff e patch e compactação
 */
export default class Flatten {

   /**
    * Obtém um objeto Flatten a partir de um valor comprimido
    * 
    * @param compressed 
    */
   static decompress(compressed: string): Flatten {
      if (typeof compressed !== 'string') {
         throw new Error('Flatten::decompress() aceita apenas String como entrada.');
      }

      // Não faz processamento agora, deixa pra fazer o processamento na invocação dos métodos
      const instance = new Flatten({});
      instance.object = undefined;
      instance.compressed = compressed;
      return instance;
   }

   /**
    * Obtém um objeto Flatten a partir de um valor modificado
    * 
    * @param flattened 
    */
   static flattened(flattened: any): Flatten {

      // Não faz processamento agora, deixa pra fazer o processamento na invocação dos métodos
      const instance = new Flatten({});
      instance.object = undefined;
      instance.flattened = flattened;
      return instance;
   }

   private object: any;

   private flattened: any;

   private compressed?: string;

   constructor(object: { [key: string]: any }) {
      if (object instanceof Flatten) {
         object = object.unflatten();
      }
      const type = typeof object;
      if (type === 'string' || type === 'number' || type === 'boolean' || type === 'symbol' || object === null || object === undefined) {
         throw new Error('Flatten aceita apenas Objetos e Arrays como entrada.');
      }

      // Evita referencia em memória
      this.object = JSON.parse(JSON.stringify(object));
   }

   /**
   * Obtém a versão modificada do objeto original
   */
   flatten(): { [key: string]: any } {
      if (!this.flattened) {
         this.flattened = this.flattenObject(this.unflatten());
      }

      return JSON.parse(JSON.stringify(this.flattened));
   }

   /**
    * Obtém a versão do objeto original
    */
   unflatten(): { [key: string]: any } {
      if (!this.object) {
         if (this.flattened) {
            this.object = this.unflattenObject(this.flattened);
         } else if (this.compressed) {
            // Decompress
            this.flattened = decompress(this.compressed);
            this.object = this.unflattenObject(this.flattened);
         }
      }

      return JSON.parse(JSON.stringify(this.object));
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
   diff(other: Flatten): Delta {
      return Delta.diff(this, other);
   }

   /**
    * Aplica um patch a esse objeto, retornando uma nova instancia do Flatten
    * 
    * @param delta 
    */
   patch(delta: Delta): Flatten {
      return delta.patch(this);
   }

   /**
   * Aplica um patch (compactado) a esse objeto, retornando uma nova instancia do Flatten
   * 
   * @param delta 
   */
   patchCompressed(compressedDelta: string): Flatten {
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
               throw new Error('Não é permitido o uso de array multidimensional. Ex. key=[[],[]]');
            }

            if (item === undefined) {
               return;
            }

            const type = typeof item;
            if (type === 'string' || type === 'number' || type === 'boolean' || type === 'symbol' || item === null) {

               // validar se existe valor mesclado
               if (isObject) {
                  throw new Error('Não é permitido o uso de Arrays mistos (Objetos e Primitivos)');
               }

               isObject = false;

               // Array por índice mesmo
               out[index] = item;
            } else if (type === 'object') {

               let id = item.$id || item._id || item.id || item._key || item.key;
               if (id === undefined || id === null) {
                  //Essa implementação espera que todos os itens de um array possua id, _id, key ou _key.
                  throw new Error('É necessário que todos os itens de um Array de Objetos tenham identificador (id, _id, key ou _key)');
               }

               if (isObject === false) {
                  throw new Error('Não é permitido o uso de Arrays mistos (Objetos e Primitivos)');
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
