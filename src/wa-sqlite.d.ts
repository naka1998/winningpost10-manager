declare module 'wa-sqlite/dist/wa-sqlite-async.mjs' {
  const factory: () => Promise<unknown>;
  export default factory;
}

declare module 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js' {
  export class IDBBatchAtomicVFS implements SQLiteVFS {
    constructor(name: string, options?: Record<string, unknown>);
    xClose(fileId: number): number;
    xRead(fileId: number, pData: Uint8Array, iOffset: number): number;
    xWrite(fileId: number, pData: Uint8Array, iOffset: number): number;
    xTruncate(fileId: number, iSize: number): number;
    xSync(fileId: number, flags: number): number;
    xFileSize(fileId: number, pSize64: DataView): number;
    xLock(fileId: number, flags: number): number;
    xUnlock(fileId: number, flags: number): number;
    xCheckReservedLock(fileId: number, pResOut: DataView): number;
    xFileControl(fileId: number, flags: number, pOut: DataView): number;
    xDeviceCharacteristics(fileId: number): number;
    xOpen(name: string | null, fileId: number, flags: number, pOutFlags: DataView): number;
    xDelete(name: string, syncDir: number): number;
    xAccess(name: string, flags: number, pResOut: DataView): number;
  }
}

declare module 'wa-sqlite/src/examples/OriginPrivateFileSystemVFS.js' {
  export class OriginPrivateFileSystemVFS implements SQLiteVFS {
    constructor(name?: string);
    xClose(fileId: number): number;
    xRead(fileId: number, pData: Uint8Array, iOffset: number): number;
    xWrite(fileId: number, pData: Uint8Array, iOffset: number): number;
    xTruncate(fileId: number, iSize: number): number;
    xSync(fileId: number, flags: number): number;
    xFileSize(fileId: number, pSize64: DataView): number;
    xLock(fileId: number, flags: number): number;
    xUnlock(fileId: number, flags: number): number;
    xCheckReservedLock(fileId: number, pResOut: DataView): number;
    xFileControl(fileId: number, flags: number, pOut: DataView): number;
    xDeviceCharacteristics(fileId: number): number;
    xOpen(name: string | null, fileId: number, flags: number, pOutFlags: DataView): number;
    xDelete(name: string, syncDir: number): number;
    xAccess(name: string, flags: number, pResOut: DataView): number;
  }
}
