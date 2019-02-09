export { default as Client } from './lib/Client';

export { default as ClientStorage } from './lib/storage/ClientStorage';
export { default as ClientStorageAbstract } from './lib/storage/ClientStorageAbstract';
export { default as ClientStorageMemory } from './lib/storage/ClientStorageMemory';
export { default as ClientStorageReactNative } from './lib/storage/ClientStorageReactNative';

export {
   default as DTO,
   Delta,
   DeltaObject,
   ErrorIdRequired,
   ErrorArrayMixedNotAccepted,
   ErrorDeltaCompressHasNoDiff,
   ErrorDeltaBadInitialization,
   ErrorOnlyObjectOrArrayAccepted,
   ErrorDecompressAcceptOnlyStrings,
   ErrorArrayMultidimensionalNotAccepted
} from './lib/util/DTO';
