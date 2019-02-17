

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'OFF';

let COUNTER = Date.now() % 1e9;

const LEVELS = {
   'TRACE': 0,
   'DEBUG': 1,
   'INFO': 2,
   'WARN': 3,
   'ERROR': 4,
   'OFF': 5
};

const NAMED = {
   'TRACE': 'TRACE',
   'DEBUG': 'DEBUG',
   'INFO': 'INFO ',
   'WARN': 'WARN ',
   'ERROR': 'ERROR',
   'OFF': ''
};

const METHODS = {
   'TRACE': console.log,
   'DEBUG': console.debug,
   'INFO': console.info,
   'WARN': console.warn,
   'ERROR': console.error,
   'OFF': () => { }
};

/**
 * Biblioteca simples de Log
 */
export default class Logger {

   private static DEFAULT_LEVEL: LogLevel = 'INFO';

   private static INSTANCES: { [key: string]: Logger } = {};

   static get(name: string): Logger {
      if (!Logger.INSTANCES[name]) {
         Logger.INSTANCES[name] = new Logger(name);
         Logger.INSTANCES[name].setLevel(Logger.DEFAULT_LEVEL);
      }
      return Logger.INSTANCES[name];
   }

   /**
    * Define o Level padrão e o level de todos os logs criados
    * 
    * @param level 
    */
   static setLevel(level: LogLevel): void {
      Logger.DEFAULT_LEVEL = level;
      for (var name in Logger.INSTANCES) {
         if (!Logger.INSTANCES.hasOwnProperty(name)) {
            continue;
         }
         Logger.INSTANCES[name].setLevel(level);
      }
   }

   private name: string;

   private level: LogLevel;

   private levelName: string;

   private levelValue: number;

   private constructor(name: string) {
      this.name = name;
      this.level = Logger.DEFAULT_LEVEL;
      this.levelName = NAMED[Logger.DEFAULT_LEVEL];
      this.levelValue = LEVELS[Logger.DEFAULT_LEVEL];
   }

   trace(...args: any[]): void {
      this.log('TRACE', args);
   }

   debug(...args: any[]): void {
      this.log('DEBUG', args);
   }

   info(...args: any[]): void {
      this.log('INFO', args);
   }

   warn(...args: any[]): void {
      this.log('WARN', args);
   }

   error(...args: any[]): void {
      this.log('ERROR', args);
   }

   setLevel(level: LogLevel): void {
      this.level = level;
      this.levelValue = LEVELS[level];
      this.levelName = NAMED[level];
   }

   getLevel(): LogLevel {
      return this.level;
   }

   isEnabled(level: LogLevel): boolean {
      return LEVELS[level] >= this.levelValue;
   }

   private log(level: LogLevel, args: any[]): void {
      if (!this.isEnabled(level)) {
         return;
      }

      let date = new Date();

      let out = [date.toISOString() + ' ' + this.levelName + ' ' + this.name + ' - '];
      args.forEach(arg => {
         if (arg instanceof Error) {
            out.push(arg.message);
            if (arg.stack) {
               out.push('\n' + arg.stack);
            }
         } else if (arg instanceof Date) {
            out.push(arg.toISOString());
         } else if (arg === undefined) {
            out.push("undefined");
         } else if (typeof arg === 'object') {
            out.push(JSON.stringify(arg, this.getCircularReplacer(), 2));
         } else {
            out.push(arg + '');
         }
      });

      METHODS[level](out.join(''));
   }

   /**
    * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
    */
   private getCircularReplacer() {
      const ID = '__st' + (Math.random() * 1e9 >>> 0) + (COUNTER++ + '__');
      return (key: string, value: any) => {
         if (typeof value === "object"
            && value !== null
            && !(value instanceof Boolean)
            && !(value instanceof Date)
            && !(value instanceof Number)
            && !(value instanceof RegExp)
            && !(value instanceof String)
         ) {
            if (!!value[ID]) {
               return '';
            }
            Object.defineProperty(value, ID, { value: true, writable: true });
         }
         return value;
      };
   };
}