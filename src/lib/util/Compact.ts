

const OBJECT_OPEN = String.fromCharCode(1);
const OBJECT_CLOSE = String.fromCharCode(2);

const PRIMITIVES = {
   'true': true,
   'false': false,
   'null': null as any,
   'undefined': undefined as any,
};

/**
 * As chaves já conhecidas, evita trafego desnecessário
 */
const DEFAULT_KEYS: Array<any> = [
   '{', '}', '|', ':',
   '@',
   'a', 'm', 'd', 'r',
   '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
   0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
   '_id', 'id',
   true, false, undefined, null,
   'true', 'false', 'undefined', 'null'
];

function mapFromIndex(index: number) {
   if (index >= 124) {
      // Ignora caractere "|"
      index++;
   }
   return String.fromCharCode(index + 33);
}

function mapToIndex(str: string) {
   let charCode = str.charCodeAt(0);
   if (charCode > 124) {
      // Restaura caractere "|"
      charCode--;
   }
   return charCode - 33;
}

/**
 * Compactação do objeto para transporte
 * 
 * O objeto precisa ter sido tratado com o Flatten
 * 
 * @param flatObj 
 */
export function compress(flatObj: any) {

   var keys = DEFAULT_KEYS.slice(0);
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
            markedAsString.push(mapFromIndex(output.length));
         } else if (value.match(/^[-+]?[\d.,]+$/)) {
            markedAsString.push(mapFromIndex(output.length));
         } else if (['true', 'false', 'undefined', 'null'].indexOf(value) >= 0) {
            markedAsString.push(mapFromIndex(output.length));
         }
      }
   }

   function parse(obj: any) {
      for (var key in obj) {
         if (!obj.hasOwnProperty(key)) {
            continue;
         }

         let keyIdx = keys.indexOf(key);
         if (keyIdx < 0) {
            keyIdx = keys.push(key) - 1;
         }

         output += mapFromIndex(keyIdx);

         const value = obj[key];
         if (typeof value === 'object') {
            output += OBJECT_OPEN;
            parse(value);
         } else {
            let valIdx = keys.indexOf(value);
            if (valIdx < 0) {
               valIdx = keys.push(value) - 1;
            }

            output += mapFromIndex(valIdx);
            markAsString(value);
         }
      }
      output += OBJECT_CLOSE;
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
   let isKey = true;

   var json = '{';
   var markedAsString = [];
   var keysValues = DEFAULT_KEYS.slice(0);

   let string = '';
   for (var index = 0, l = compressed.length; index < l; index++) {
      char = compressed.charAt(index);
      if (step === 3) {
         // INDEXES
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
         value = keysValues[mapToIndex(char)];

         // Se está determinado que o valor é string, ignora formatação de primitivos
         const parsePrimitive = markedAsString.indexOf(indexReal) < 0;
         if (typeof value === 'string') {
            if (!isKey && parsePrimitive) {
               if (value.match(/^[-+]?\d+$/)) {
                  value = Number.parseInt(value);
               } else if (value.match(/^[-+]?[\d.,]+$/)) {
                  value = Number.parseFloat(value);
               } else if (['true', 'false', 'undefined', 'null'].indexOf(value) >= 0) {
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
      } else {

         if (step === 1) {
            markedAsString.push(mapToIndex(char));
         } else {
            if (char === '|') {
               keysValues.push(string);
               string = '';
            } else {
               string += char;
            }
         }

         // Fechamento de parte (||)
         if (char === '|' && compressed.charAt(index + 1) === '|') {
            step++;
            index++;

            if (step === 3) {
               indexStart = index;
            }
            continue;
         }
      }
   }

   if (json.charAt(json.length - 1) === ',') {
      json = json.slice(0, -1);
   }
   return JSON.parse(json);
}