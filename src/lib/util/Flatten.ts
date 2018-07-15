/**
 * Marcador de Arrays
 */
const T_ARRAY = '@';
const T_ARRAY_OBJECT = 1;
const T_ARRAY_PRIMITIVE = 0;

/**
 * Remover todos os arrays de um objeto, mapeando-os por [id|_id|key|_key] em caso de objetos e INDEX para dados simples
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
            // Essa implementação não aceita o uso de array multidimensional. Ex. key=[[],[]]
            return;
         }
         const type = typeof item;
         if (type === 'object') {
            let id = item._id || item.id || item._key || item.key;
            if (id === undefined || id === null) {
               //Essa implementação espera que todos os itens de um array possua id, _id, key ou _key.
               return;
            }

            if (isObject === false) {
               // Essa implementação não permite valores mesclados no array
               return;
            }
            isObject = true;

            // Se id começar com @, adiciona outra para validação no unflatten
            id = (typeof (id) === 'string' && id.charAt(0) == T_ARRAY) ? T_ARRAY + id : id;


            out[id] = flatten(item);

         } else if (type === 'string' || type === 'number' || type === 'boolean' || type === 'symbol') {

            // validar se existe valor mesclado
            if (isObject) {
               // Essa implementação não permite valores mesclados  no array
               return;
            }

            isObject = false;

            // Array por índice mesmo
            out[index] = item;
         }
      });

      // Tipos de array
      out[T_ARRAY] = isObject ? T_ARRAY_OBJECT : T_ARRAY_PRIMITIVE;

      if (Object.keys(out).length === 1) {
         // Array vazio
         out = undefined;
      }
   } else if (type === 'object') {
      out = {};
      for (var id in obj) {
         if (!obj.hasOwnProperty(id)) {
            continue;
         }
         // Se id começar com @, adiciona outra para validação no unflatten
         id = (typeof (id) === 'string' && id.charAt(0) == T_ARRAY) ? T_ARRAY + id : id;
         out[id] = flatten(obj[id]);
      }
   } else if (type === 'string' || type === 'number' || type === 'boolean' || type === 'symbol') {
      out = obj
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

   if (type === 'object') {
      if (T_ARRAY in obj) {
         // Reverte array
         out = [];
         if (obj[T_ARRAY] === T_ARRAY_OBJECT) {

            // Array de Objetos
            for (var a in obj) {
               if (!obj.hasOwnProperty(a) || a === T_ARRAY) {
                  continue;
               }
               const value = unflatten(obj[a]);
               if (value === undefined) {
                  continue;
               }
               out.push(value);
            }

         } else {

            // Array de primitivos
            for (var a in obj) {
               if (!obj.hasOwnProperty(a) || a === T_ARRAY) {
                  continue;
               }
               out[Number.parseInt(a)] = obj[a];
            }
         }

      } else {

         // Objeto normal
         out = {};
         for (var a in obj) {
            if (!obj.hasOwnProperty(a)) {
               continue;
            }
            const value = unflatten(obj[a]);
            if (value === undefined) {
               continue;
            }

            // Remove marcação de array
            const id = (typeof (a) === 'string' && a.charAt(0) == T_ARRAY) ? a.substring(1) : a;
            out[a] = value;
         }
      }
   } else if (type === 'string' || type === 'number' || type === 'boolean' || type === 'symbol') {
      // primitivo
      out = obj
   }

   return out;
}