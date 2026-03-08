require('dotenv').config()
const http = require('http')
const net = require('net')
const url = require('url')
const {addToCache,getFromCache,deleteFromCache,seeCache,cache} = require('./controllers/redis.js')
const { start } = require('repl')


const ParseIncomingRequest = (origin)=> async (clientReq, clientRes) => {

    let originUrl = url.parse(origin);
    // const originUrl = new URL(origin)

    let options = {
        method: clientReq.method,
        headers: clientReq.headers,
        host: originUrl.hostname,
        port: originUrl.port || 80,
        path: originUrl.path,
    }
    let req_url = `http://${options.host}:${options.port}/${options.path}`
    let cache_response =  await getFromCache(req_url,cache)
    // console.log(response)
    
    if(cache_response){
        console.log(cache_response)
        return
    }
    else{
        makeExternalReqeust(clientReq, clientRes, options)
    }
   

}

const makeExternalReqeust = async (clientReq, clientRes, options) => {
    externalReq = http.request(options, (externalRes) => {
        const chunks = [];
        clientRes.writeHead(externalRes.statusCode, externalRes.headers)

        externalRes.on('data', (chunk) => {
            clientRes.write(chunk);
            chunks.push(chunk)
        })


        externalRes.on('end', () => {
            clientRes.end();
            const data = Buffer.concat(chunks).toString()
            console.log('CHUNK TRANSER COMPLETE, CHACHING CHUNK ARRAY')
            
            addToCache(`http://${options.host}:${options.port}/${options.path}`,data,cache)
            
        })

    })

    clientReq.on('data', (chunk) => {
        externalReq.write(chunk)
    })

    clientReq.on('end', () => {
        externalReq.end();
    })
    externalReq.on('error', (err) => {
        console.error('External request error:', err.message)
        clientRes.writeHead(502)
        clientRes.end(`Proxy error: ${err.message}`)
    })


}

const handleConnect = (clientReq, clientSocket, head) => {
    const { port, hostname } = new URL(`https://${clientReq.url}`)

    console.log(`CONNECT tunnel: ${hostname}:${port || 443}`)

    const serverSocket = net.connect(port || 443, hostname, () => {
        // Tell curl the tunnel is ready
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')

        // Forward any initial bytes that came with the CONNECT request
        if (head && head.length) serverSocket.write(head)

        // Pipe bytes in both directions — proxy is now a dumb pipe
        serverSocket.pipe(clientSocket)
        clientSocket.pipe(serverSocket)
    })

    serverSocket.on('error', (err) => {
        console.error('CONNECT tunnel error:', err.message)
        clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n')
        clientSocket.end()
    })

    clientSocket.on('error', (err) => {
        console.error('Client socket error:', err.message)
        serverSocket.destroy()
    })

    serverSocket.on('end', () => clientSocket.end())
    clientSocket.on('end', () => serverSocket.end())

}

async function start_proxy(given_port,origin){
    
    const ProxyServer = http.createServer(ParseIncomingRequest(origin));


    ProxyServer.on('connect', handleConnect)

    ProxyServer.on('error', (err) => {
        console.error('Proxy server error:', err.message)
    })

    ProxyServer.listen(given_port, () => {
        console.log(`Proxy started on port ${given_port}`)
        console.log(`Forwarding to ${origin}`)
    })

    
}

// start_proxy(4000,'http://example.com')

module.exports = {start_proxy}
