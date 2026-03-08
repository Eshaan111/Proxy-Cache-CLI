require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const {Redis} = require('ioredis')
const { resolve } = require('url')
const token_upstash = process.env.UPSTASH_REDIS_REST_TOKEN


console.log('HUHUHUHUHU', token_upstash)
const cache = new Redis(`rediss://default:${token_upstash}@magical-beetle-47725.upstash.io:6379`)




async function addToCache(url,response){
    console.log(`REDI : Add req for url: ${url} `)
    try{
        await cache.set(`url:${url}`,response,'EX',600 )
        console.log('REDI : ADDED SUCCESSFULLY')
        return;
    }
    catch(err){
        console.log('REDIS ADD ERR : ', err)
    }
}


async function getFromCache(url){
    console.log(`REDI : GET req for url: ${url} `)
    try{
        response = await cache.get(`url:${url}`)
        if(response){
            console.log(`CACHE: HIT : GET req for url: ${url} `)
            return(response)
        }
        console.log(`CACHE: MISS : GET req for url: ${url}`)
        
        return(0,null);
    }
    catch(err){
        console.log('REDIS GET ERR : ', err)
    }
    
}

async function deleteFromCache(url){
    try {
        await cache.del(`url:${url}`)
        console.log('REDIS DEL : ', url)
    } catch (e) {
        console.log('REDIS DEL ERROR : ', e.message)
    }
}

async function seeCache() {
    let keys = cache.keys('*')
    keys.forEach(async (key )=> {
        console.log(`${key} ->> ${await getFromCache(key)}`);
    });
}

module.exports = {addToCache,getFromCache,deleteFromCache,seeCache}
