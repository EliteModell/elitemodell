type VideoContainer = "mp4" | "webm";

export type InspectedVideoDuration = {
  container: VideoContainer;
  durationSeconds: number;
};

function uint64(buffer: Buffer, offset: number) {
  if (offset < 0 || offset + 8 > buffer.length) return null;
  return buffer.readBigUInt64BE(offset);
}

type IsoBox = { type: string; payload: number; end: number };

function isoBoxes(buffer: Buffer, start: number, end: number) {
  const boxes: IsoBox[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = BigInt(buffer.readUInt32BE(offset));
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    let headerSize = 8;
    if (size === BigInt(1)) {
      const extended = uint64(buffer, offset + 8);
      if (extended === null) return null;
      size = extended;
      headerSize = 16;
    } else if (size === BigInt(0)) {
      size = BigInt(end - offset);
    }
    if (size < BigInt(headerSize) || size > BigInt(end - offset) || size > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    const boxEnd = offset + Number(size);
    boxes.push({ type, payload: offset + headerSize, end: boxEnd });
    offset = boxEnd;
  }
  return offset === end ? boxes : null;
}

function isoHeaderDuration(buffer: Buffer, box: IsoBox) {
  if (box.payload + 20 > box.end) return null;
  const version = buffer[box.payload];
  if (version !== 0 && version !== 1) return null;
  const timescaleOffset = version === 1 ? box.payload + 20 : box.payload + 12;
  const durationOffset = version === 1 ? box.payload + 24 : box.payload + 16;
  if (timescaleOffset + 4 > box.end) return null;
  const timescale = buffer.readUInt32BE(timescaleOffset);
  const duration = version === 1
    ? uint64(buffer, durationOffset)
    : durationOffset + 4 <= box.end ? BigInt(buffer.readUInt32BE(durationOffset)) : null;
  if (!timescale || duration === null || duration <= BigInt(0)) return null;
  const seconds = Number(duration) / timescale;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function inspectIsoBmff(buffer: Buffer): InspectedVideoDuration | null {
  const roots = isoBoxes(buffer, 0, buffer.length);
  const moov = roots?.find((item) => item.type === "moov");
  if (!moov) return null;
  const children = isoBoxes(buffer, moov.payload, moov.end);
  const mvhd = children?.find((item) => item.type === "mvhd");
  const movieDuration = mvhd ? isoHeaderDuration(buffer, mvhd) : null;
  if (!children || movieDuration === null) return null;

  const trackDurations: number[] = [];
  for (const trak of children.filter((item) => item.type === "trak")) {
    const trackChildren = isoBoxes(buffer, trak.payload, trak.end);
    const mdia = trackChildren?.find((item) => item.type === "mdia");
    if (!mdia) return null;
    const mediaChildren = isoBoxes(buffer, mdia.payload, mdia.end);
    const mdhd = mediaChildren?.find((item) => item.type === "mdhd");
    const trackDuration = mdhd ? isoHeaderDuration(buffer, mdhd) : null;
    if (trackDuration === null) return null;
    trackDurations.push(trackDuration);
  }
  if (!trackDurations.length) return null;
  return { container: "mp4", durationSeconds: Math.max(movieDuration, ...trackDurations) };
}

function readEbmlSize(buffer: Buffer, offset: number) {
  if (offset >= buffer.length) return null;
  const first = buffer[offset];
  let length = 1;
  let marker = 0x80;
  while (length <= 8 && !(first & marker)) {
    marker >>= 1;
    length += 1;
  }
  if (length > 8 || offset + length > buffer.length) return null;
  let value = BigInt(first & (marker - 1));
  for (let index = 1; index < length; index += 1) value = (value << BigInt(8)) | BigInt(buffer[offset + index]);
  return { length, value };
}

function findEbmlElement(buffer: Buffer, id: Buffer, start = 0) {
  const offset = buffer.indexOf(id, start);
  if (offset < 0) return null;
  const size = readEbmlSize(buffer, offset + id.length);
  if (!size || size.value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const dataOffset = offset + id.length + size.length;
  const dataLength = Number(size.value);
  if (dataOffset + dataLength > buffer.length) return null;
  return { dataOffset, dataLength };
}

function inspectWebM(buffer: Buffer): InspectedVideoDuration | null {
  if (buffer.length < 16 || !buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return null;
  const info = findEbmlElement(buffer, Buffer.from([0x15, 0x49, 0xa9, 0x66]));
  if (!info) return null;
  const infoEnd = info.dataOffset + info.dataLength;
  const duration = findEbmlElement(buffer, Buffer.from([0x44, 0x89]), info.dataOffset);
  if (!duration || duration.dataOffset + duration.dataLength > infoEnd || ![4, 8].includes(duration.dataLength)) return null;
  const durationValue = duration.dataLength === 4
    ? buffer.readFloatBE(duration.dataOffset)
    : buffer.readDoubleBE(duration.dataOffset);
  const scaleElement = findEbmlElement(buffer, Buffer.from([0x2a, 0xd7, 0xb1]), info.dataOffset);
  let timecodeScale = 1_000_000;
  if (scaleElement && scaleElement.dataOffset + scaleElement.dataLength <= infoEnd && scaleElement.dataLength >= 1 && scaleElement.dataLength <= 8) {
    let value = BigInt(0);
    for (let index = 0; index < scaleElement.dataLength; index += 1) value = (value << BigInt(8)) | BigInt(buffer[scaleElement.dataOffset + index]);
    if (value <= BigInt(0) || value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    timecodeScale = Number(value);
  }
  const declaredSeconds = durationValue * timecodeScale / 1_000_000_000;
  let latestClusterSeconds = 0;
  let searchOffset = infoEnd;
  const clusterId = Buffer.from([0x1f, 0x43, 0xb6, 0x75]);
  while (searchOffset < buffer.length) {
    const cluster = findEbmlElement(buffer, clusterId, searchOffset);
    if (!cluster) break;
    const clusterEnd = cluster.dataOffset + cluster.dataLength;
    const timecode = findEbmlElement(buffer, Buffer.from([0xe7]), cluster.dataOffset);
    if (!timecode || timecode.dataOffset + timecode.dataLength > clusterEnd || timecode.dataLength < 1 || timecode.dataLength > 8) return null;
    let value = BigInt(0);
    for (let index = 0; index < timecode.dataLength; index += 1) value = (value << BigInt(8)) | BigInt(buffer[timecode.dataOffset + index]);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    latestClusterSeconds = Math.max(latestClusterSeconds, Number(value) * timecodeScale / 1_000_000_000);
    searchOffset = clusterEnd;
  }
  const seconds = Math.max(declaredSeconds, latestClusterSeconds);
  return Number.isFinite(seconds) && seconds > 0
    ? { container: "webm", durationSeconds: seconds }
    : null;
}

export function inspectServerVideoDuration(buffer: Buffer, mimeType: string) {
  if (mimeType === "video/webm") return inspectWebM(buffer);
  if (mimeType === "video/mp4" || mimeType === "video/quicktime") return inspectIsoBmff(buffer);
  return null;
}
