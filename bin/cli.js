#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const {Command} = require('commander')
const program = new Command();
const {start_proxy} = require('../proxy.js')

console.log('Hi From Cli')

program
    .name('Cacher-Proxy')
    .description('Caches Response and returns from Cache if exists')
    .version('1.0.0')
    .requiredOption('--port <number>', 'port to run the proxy on', parseInt)
    .requiredOption('--origin <url>','url to connect to')

program.parse(process.argv)

const {port, origin} = program.opts()

start_proxy(port,origin).then(()=>{
    const {exec} = require('child_process')
    exec(`curl -x http://localhost:${port} ${origin}`,(err,stdout)=>{
        console.log(stdout)
    })
})
