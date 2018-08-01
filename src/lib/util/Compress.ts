
// IGNORA
//  34 = '"'
//  92 = '\'
// 124 = '|'

const PRIMITIVES = {
   'true': true,
   'false': false,
   'null': null as any
};

/**
 * As chaves já conhecidas, evita trafego desnecessário
 */
const DEFAULT_KEYS: Array<any> = [
   ' ', '{', '}', '|', ':',
   '@',
   'a', 'm', 'd', 'r',
   '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
   0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
   '$id', '_id', 'id', 'key', '_key',
   true, false, null,
   'true', 'false', 'null'
];

const SPACE = fromIndex(DEFAULT_KEYS.indexOf(' '));
const OBJECT_OPEN = fromIndex(DEFAULT_KEYS.indexOf('{'));
const OBJECT_CLOSE = fromIndex(DEFAULT_KEYS.indexOf('}'));

/**
 * Obtém o caractere que representa o índice informado
 * 
 * @param index 
 */
function fromIndex(index: number) {
   if (index >= 124) {
      // Ignora caracteres "|" e "\"
      index += 2;
   } else if (index >= 92) {
      // Ignora caractere "\"
      index++;
   }
   return String.fromCharCode(index + 35);
}

/**
 * Obtém o índice representado pleo caractere
 * 
 * @param str 
 */
function toIndex(str: string) {
   let charCode = str.charCodeAt(0);
   if (charCode > 124) {
      // Restaura caracteres "|" e "\"
      charCode -= 2;
   } else if (charCode > 92) {
      // Restaura caractere "\"
      charCode--;
   }

   return charCode - 35;
}

/**
 * Compactação do objeto para transporte
 * 
 * O objeto precisa ter sido tratado com o DTO::flatten
 * 
 * @param flatObj 
 */
export function compress(flatObj: any) {

   const keys = DEFAULT_KEYS.slice(0);


   // Quando o tipo do dado é dúbil (ex 1.21 pode ser "1.21" ou um float, ou true, pode ser "true" ou o booleano)
   // O índice é salvo
   var markedAsString: Array<string> = [];
   var output = '';

   /**
    * Marca o valor como string, para evitar tratamento de primitivos no decompress
    * 
    * @param {*} value 
    */
   function markAsString(value: any) {
      if (typeof value === 'string') {
         if (value.match(/^[-+]?\d+$/)) {
            markedAsString.push(fromIndex(output.length));
         } else if (value.match(/^[-+]?[\d.,]+$/)) {
            markedAsString.push(fromIndex(output.length));
         } else if (['true', 'false', 'null'].indexOf(value) >= 0) {
            markedAsString.push(fromIndex(output.length));
         }
      }
   }

   function parse(obj: any) {
      const type = typeof obj;
      if (type === 'string') {
         const words = obj.split(' ');
         words.forEach((str: string, index: number) => {

            if (str !== '') {
               let keyIdx = keys.indexOf(str);
               if (keyIdx < 0) {
                  keyIdx = keys.push(str) - 1;
               }

               output += fromIndex(keyIdx);
               markAsString(str);
            }

            if (index < words.length - 1) {
               output += SPACE;
            }
         });
      } else if (type === 'number' || type === 'boolean' || type === 'symbol' || obj === null) {
         let keyIdx = keys.indexOf(obj);
         if (keyIdx < 0) {
            keyIdx = keys.push(obj) - 1;
         }

         output += fromIndex(keyIdx);
      } else if (Array.isArray(obj)) {

         throw new Error('Array não é permitido. Objeto deve ser tratado com o DTO.flatten() antes de acionar esse método.');

      } else if (typeof obj === 'object') {

         output += OBJECT_OPEN;
         for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
               continue;
            }

            let keyIdx = keys.indexOf(key);
            if (keyIdx < 0) {
               keyIdx = keys.push(key) - 1;
            }

            output += fromIndex(keyIdx);
            parse(obj[key]);
         }
         output += OBJECT_CLOSE;

      }
      // else {

      //    let valIdx = keys.indexOf(obj);
      //    if (valIdx < 0) {
      //       valIdx = keys.push(obj) - 1;
      //    }

      //    output += fromIndex(valIdx);
      //    markAsString(obj);
      // }
   }

   parse(flatObj);

   // Remove os caracteres conhecidos
   keys.splice(0, DEFAULT_KEYS.length);

   let header = '';
   if (markedAsString.length > 0) {
      markedAsString.forEach(idx => {
         header += `${idx}`.replace(/[|]/g, '\\|') + '|';
      });
      header += '|';
   } else {
      header += '||';
   }

   if (keys.length > 0) {
      keys.forEach(key => {
         header += `${key}`.replace(/[|]/g, '\\|') + '|';
      });
      header += '|';
   } else {
      header += '||';
   }
   return header + output;
}

/**
 * Transforma uma string comprimida em um flatten object
 * 
 * STRINGS||KEYS_VALUES||INDEXES
 * @param {*} strings 
 */
export function decompress(compressed: string) {
   let step = 1;
   let char;
   let value;
   let indexStart = 0;
   let indexReal;
   let isKey = false;

   var json = '';
   var markedAsString = [];
   var keysValues = DEFAULT_KEYS.slice(0);

   let string = '';
   for (var index = 0, l = compressed.length; index < l; index++) {
      char = compressed.charAt(index);

      if (step === 1) {
         markedAsString.push(toIndex(char));
      } else if (char === '|') {
         keysValues.push(string);
         string = '';
      } else {
         string += char;
      }

      // Fechamento de parte (||)
      if (char === '|' && compressed.charAt(index + 1) === '|') {
         step++;
         index++;

         // INDEXES
         if (step === 3) {
            index++;
            indexStart = index;
            // Loop interno para o passo 3, evita os IF's acima 
            for (; index < l; index++) {
               char = compressed.charAt(index);

               if (char === OBJECT_OPEN) {
                  json += '{';
                  isKey = true;
                  continue;
               }

               if (char === OBJECT_CLOSE) {
                  // js.substring , 
                  json = json.slice(0, -1) + '},';
                  isKey = compressed.charAt(index + 1) !== OBJECT_CLOSE;
                  continue;
               }

               indexReal = index - indexStart;
               value = keysValues[toIndex(char)];

               // Se está determinado que o valor é string, ignora formatação de primitivos
               const parsePrimitive = markedAsString.indexOf(indexReal) < 0;
               if (typeof value === 'string') {
                  if (!isKey && parsePrimitive) {
                     if (value.match(/^[-+]?\d+$/)) {
                        value = Number.parseInt(value);
                     } else if (value.match(/^[-+]?[\d.,]+$/)) {
                        value = Number.parseFloat(value);
                     } else if (['true', 'false', 'null'].indexOf(value) >= 0) {
                        value = (PRIMITIVES as any)[value];
                     } else {
                        value = '"' + value + '"';
                     }
                  } else {
                     value = '"' + value + '"';
                  }
               }

               json += value;
               if (isKey) {
                  json += ':';
                  isKey = false;
               } else {
                  isKey = true;
                  json += ',';
               }
            }
         }
      }
   }

   if (json.charAt(json.length - 1) === ',') {
      json = json.slice(0, -1);
   }

   return JSON.parse(json);
}