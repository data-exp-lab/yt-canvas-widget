export {
  VariableMesh,
  Colormap,
  ColormapCollection,
  FixedResolutionBuffer
} from '@data-exp-lab/yt-tools';
export const yt_tools = await import('@data-exp-lab/yt-tools');

export function serializeArray<T extends ArrayBufferView>(array: T): DataView {
  return new DataView(array.buffer.slice(0));
}

export function arrayDeserializerFactory<T>(type: {
  new (v: ArrayBuffer): T;
}): (a: DataView | null) => T | null {
  function arrayDeserializerImpl(dataview: DataView | null): T | null {
    if (dataview === null) {
      return null;
    }

    return new type(dataview.buffer);
  }
  return arrayDeserializerImpl;
}

export interface IArraySerializers {
  serialize: (array: ArrayBufferView) => DataView;
  deserialize: (buffer: DataView | null) => ArrayBufferView;
}

export const f32Serializer: IArraySerializers = {
  serialize: serializeArray,
  deserialize: arrayDeserializerFactory<Float32Array>(Float32Array)
};
export const f64Serializer: IArraySerializers = {
  serialize: serializeArray,
  deserialize: arrayDeserializerFactory<Float64Array>(Float64Array)
};
export const u8Serializer: IArraySerializers = {
  serialize: serializeArray,
  deserialize: arrayDeserializerFactory<Uint8Array>(Uint8Array)
};
export const u64Serializer: IArraySerializers = {
  serialize: serializeArray,
  deserialize: arrayDeserializerFactory<BigUint64Array>(BigUint64Array)
};
