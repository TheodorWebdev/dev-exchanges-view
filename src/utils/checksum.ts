export const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        };
        table[n] = c >>> 0;
    };
    return table;
})();

export const checksumCRC32 = (str: string): number => {
    let crc = 0xffffffff;
    for (let i = 0, l = str.length; i < l; i++) {
        const code = str.charCodeAt(i);
        crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ code) & 0xff];
    };
    return (crc ^ 0xffffffff) >>> 0;
};