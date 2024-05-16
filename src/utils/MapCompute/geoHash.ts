const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BITS = [16, 8, 4, 2, 1];

// 根据 geohash 字符串获取范围 (chatGPT)
export function decodeGeohash(geohash: string) {
  let isEven = true;
  let latRange = [-90.0, 90.0];
  let lonRange = [-180.0, 180.0];

  for (let i = 0; i < geohash.length; i++) {
    const currentChar = geohash[i];
    const currentBits = BASE32.indexOf(currentChar);

    for (let j = 0; j < BITS.length; j++) {
      const mask = BITS[j];
      if (isEven) {
        if (currentBits & mask) {
          lonRange[0] = (lonRange[0] + lonRange[1]) / 2;
        } else {
          lonRange[1] = (lonRange[0] + lonRange[1]) / 2;
        }
      } else {
        if (currentBits & mask) {
          latRange[0] = (latRange[0] + latRange[1]) / 2;
        } else {
          latRange[1] = (latRange[0] + latRange[1]) / 2;
        }
      }
      isEven = !isEven;
    }
  }

  const latitude = (latRange[0] + latRange[1]) / 2;
  const longitude = (lonRange[0] + lonRange[1]) / 2;
  return {
    latitude,
    longitude,
    latRange,
    lonRange,
  };
}

// 根据经纬度生成 geohash (chatGPT)
export function encodeGeohash(
  latitude: number,
  longitude: number,
  precision: number,
) {
  let isEven = true;
  let bit = 0;
  let ch = 0;
  let geohash = '';

  let latRange = [-90.0, 90.0];
  let lonRange = [-180.0, 180.0];

  while (geohash.length < precision) {
    let mid;

    if (isEven) {
      mid = (lonRange[0] + lonRange[1]) / 2;
      if (longitude > mid) {
        ch |= BITS[bit];
        lonRange[0] = mid;
      } else {
        lonRange[1] = mid;
      }
    } else {
      mid = (latRange[0] + latRange[1]) / 2;
      if (latitude > mid) {
        ch |= BITS[bit];
        latRange[0] = mid;
      } else {
        latRange[1] = mid;
      }
    }

    isEven = !isEven;

    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}

// 示例用法
// const latitude = 37.7749;  // 例如，旧金山的纬度
// const longitude = -122.4194;  // 例如，旧金山的经度
// const geohash = encodeGeohash(latitude, longitude);
// console.log(geohash);  // 输出 geohash，例如 '9q8yyk8rgn3q'

// 根据 GeoHash 获取范围
export function geohashBounds(hash: string) {
  if (hash.length === 0) {
    return null;
  }

  const BITS = [16, 8, 4, 2, 1];
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let isEven = true;
  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;
  let latMid = 0,
    lonMid = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let bit = 0;
  let ch = 0;

  for (let i = 0; i < hash.length; i++) {
    ch = BASE32.indexOf(hash[i]);
    for (let j = 0; j < 5; j++) {
      const mask = BITS[j];
      if (isEven) {
        lonMid = (lonMin + lonMax) / 2;
        if (ch & mask) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        latMid = (latMin + latMax) / 2;
        if (ch & mask) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }
      isEven = !isEven;
    }
  }

  return {
    latitude: latMid,
    longitude: lonMid,
    latitudeMin: latMin,
    latitudeMax: latMax,
    longitudeMin: lonMin,
    longitudeMax: lonMax,
  };
}

/**
 * @description: 生成geohash (github)
 * @param {number} lat: 纬度
 * @param {number} lon: 经度
 * @param {number} precision: 精度
 * @return {string} geohash
 * @example:
 * geoHash(39.9042, 116.4074, 8) => "wx4g0s8q"
 * geoHash(39.9042, 116.4074, 12) => "wx4g0s8q3srx"
 */
export function centerGeoHash(
  lat: number,
  lon: number,
  precision: number,
): string {
  const BITS = [16, 8, 4, 2, 1];
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let isEven = true;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let i = 0;
  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;
  let bit = 0;
  let ch = 0;
  let geohash = '';

  while (geohash.length < precision) {
    if (isEven) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon > lonMid) {
        ch |= BITS[bit];
        lonMin = lonMid;
      } else {
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat > latMid) {
        ch |= BITS[bit];
        latMin = latMid;
      } else {
        latMax = latMid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}
