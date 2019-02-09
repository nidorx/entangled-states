
export { default as Client } from './lib/Client';

export { default as ClientStorage } from './lib/storage/ClientStorage';
export { default as ClientStorageAbstract } from './lib/storage/ClientStorageAbstract';
export { default as ClientStorageMemory } from './lib/storage/ClientStorageMemory';
export { default as ClientStorageWebLocal } from './lib/storage/ClientStorageWebLocal';
export { default as ClientStorageWebSession } from './lib/storage/ClientStorageWebSession';

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
