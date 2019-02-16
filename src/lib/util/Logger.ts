

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'OFF';

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

   private static LOGS: { [key: string]: Logger } = {};

   private static mainLogger = Logger.get('main');

   static get(name: string): Logger {
      if (!Logger.LOGS[name]) {
         Logger.LOGS[name] = new Logger(name)
      }
      return Logger.LOGS[name];
   }

   private name: string;

   private level: LogLevel = 'INFO';

   private levelValue: number = LEVELS['INFO'];

   private levelName: string = NAMED['INFO'];

   private constructor(name: string) {
      this.name = name;
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
      const seen = new WeakSet();
      return (key: string, value: any) => {
         if (typeof value === "object"
            && value !== null
            && !(value instanceof Boolean)
            && !(value instanceof Date)
            && !(value instanceof Number)
            && !(value instanceof RegExp)
            && !(value instanceof String)
         ) {
            if (seen.has(value)) {
               return '';
            }
            seen.add(value);
         }
         return value;
      };
   };
}