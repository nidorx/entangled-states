/**
 * Marcador de Arrays
 */
const T_ARRAY = '@';
const T_ARRAY_OBJECT = 1;
const T_ARRAY_PRIMITIVE = 0;

/**
 * Remover todos os arrays de um objeto, mapeando-os por [id|_id|key|_key] em caso de objetos e INDEX para dados simples
 * 
 * Valores UNDEFINED são descartados
 * 
 * @param {*} obj 
 */
export function flatten(obj: any): any {
   let out: any;
   const type = typeof obj;
   if (Array.isArray(obj)) {
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
            const itemFlatten = flatten(item)
            if (itemFlatten !== undefined) {
               out[newId] = itemFlatten;
            }
         }
      });

      // Tipos de array
      out[T_ARRAY] = isObject ? T_ARRAY_OBJECT : T_ARRAY_PRIMITIVE;

      // Array vazio, é aceito
      // if (Object.keys(out).length === 1) {
   } else if (type === 'string' || type === 'number' || type === 'boolean' || type === 'symbol' || obj === null) {
      out = obj
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
         const objIdFlatten = flatten(obj[id])
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
export function unflatten(obj: any): any {
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
               const value = unflatten(obj[flatId]);
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
            const value = unflatten(obj[flatId]);
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