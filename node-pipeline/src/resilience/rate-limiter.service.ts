import { Injectable } from '@nestjs/common';
import { RedisService } from '../infra/index.js';

const TOKEN_BUCKET_SCRIPT = `
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local state = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(state[1])
local last = tonumber(state[2])
if tokens == nil then
  tokens = capacity
  last = now
end
local elapsed = math.max(0, now - last) / 1000
tokens = math.min(capacity, tokens + elapsed * rate)
local allowed = tokens >= 1
if allowed then
  tokens = tokens - 1
end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(capacity / rate * 2000))
return allowed and 1 or 0
`;

@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  async acquire(key: string): Promise<boolean> {
    const result = (await this.redis.redis.eval(
      TOKEN_BUCKET_SCRIPT,
      1,
      key,
      process.env.RATE_LIMIT_PER_SECOND!,
      process.env.RATE_LIMIT_BURST!,
      Date.now().toString(),
    )) as number;
    return result === 1;
  }
}
