declare module 'dffptch' {

   export default class DiffPatch {

      static diff: (a: any, b: any) => any;

      static patch: (a: any, b: any) => void;
   }
}
