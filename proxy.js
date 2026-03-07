const http = require('http')
const net = require('net')
const url = require('url')
const {addToCache,getFromCache,deleteFromCache,seeCache} = require('./controllers/redis.js')


const ParseIncomingRequest = async (clientReq, clientRes) => {

    let reqToFulfill = url.parse(clientReq.url);

    let options = {
        method: clientReq.method,
        headers: clientReq.headers,
        host: reqToFulfill.hostname,
        port: reqToFulfill.port || 80,
        path: reqToFulfill.path,
    }
    let req_url = `htpp://${options.host}:${options.port}/${options.path}`
    let response =  await getFromCache(req_url)
    // console.log(response)
    
    if(response){
        console.log(response)
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
            
            addToCache(`htpp://${options.host}:${options.port}/${options.path}`,data)
            
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




const ProxyServer = http.createServer(ParseIncomingRequest);


ProxyServer.on('connect', handleConnect)

ProxyServer.on('error', (err) => {
    console.error('Proxy server error:', err.message)
})

ProxyServer.listen(4998, () => {
    console.log('PROXY SERVER STARTED ON PORT 4998')
})

