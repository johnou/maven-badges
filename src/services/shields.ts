import axios from 'axios';
import RedisClientWrapper from './redisClientWrapper';

const BASE_URI = 'http://img.shields.io';

const encode = (input: string) => input.replace(/_/g, '__').replace(/\s/g, '_').replace(/-/g, '--');

export const getBadgeImage = async (redisClient: RedisClientWrapper, subject: string, version: string, color: string, format: string, style = 'default') => {
  const url = `${BASE_URI}/badge/${encode(subject)}-${encode(version)}-${encode(color)}.${format}?style=${style}`;
  const serializedImageBuffer = await redisClient.getAsync(url);
  if (serializedImageBuffer) {
    console.log(`serving ${url} badge from cache`);
    return new Buffer(serializedImageBuffer, 'hex');
  }

  const { data: buffer } = await axios.get(url, {
    responseType: 'arraybuffer'
  });
  await redisClient.setAsync(url, buffer.toString('hex'), 'EX', 60 * 60 * 12); // sets an expiry time to 12h
  console.log(`saved ${url} badge to cache`);
  return buffer;
}

