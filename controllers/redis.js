require('dotenv').config()
const {Redis} = require('ioredis')
const { resolve } = require('url')
const token_upstash = process.env.UPSTASH_REDIS_REST_TOKEN

const cache = new Redis(`rediss://default:${token_upstash}@magical-beetle-47725.upstash.io:6379`)

async function addToCache(url,response){
    await cache.set(`url:${url}`,response,'EX',600 )
    return;
}

