const util = require('util');
const tftp = require('tftp');
const dhcpjs = require('dhcpjs');
const Protocol = dhcpjs.Protocol;
const exec = require('child_process').exec;
const Logger = require('./utils/logger');
const Responder = require('./responder');
const _ = require('underscore');

const Server = function (options) {
    this.options = typeof(options) !== "object" ? {} : options;
    
    _.defaults(this.options, {
        host: '192.168.1.145',
        port: 4687,
        rootDir: 'tftp/',
        denyPUT: true
    });
    
    this.host = this.options.host;
    this.port = this.options.port;
    this.rootDir = this.options.rootDir;
    this.denyPUT = this.options.denyPUT;

    //initialize the dhcp server
    this.dhcpServer = dhcpjs.createServer();

    Logger.setPrefix("[pxejs]");
}

Server.prototype.run = function () {
    
    let that = this;

    this.tftpServer = tftp.createServer({
        host: this.host,
        port: this.port,
        root: this.rootDir,
        denyPUT: this.denyPUT
    });

    this.dhcpServer.on('message', function (m) {
        try {
            let vender = m.options.vendorClassIdentifier.split(':');
        } catch (e) {
            let vender = [];
        }
     
        let mType = m.op.value;
        
        if (mType === Protocol.DHCPMessageType.DHCPDISCOVER.value && vender[0] === "PXEClient") {
             let resp = new Responder();
             resp.bind(that.host);         

             Logger.info('PXEClient DHCPDISCOVER', m.xid);
             Logger.info(util.inspect(m, false, 3));
     
             let pkt = resp.createOfferPacket({
                 xid: m.xid,
                 chaddr: m.chaddr.address,
                 dhcpMessageType: Protocol.DHCPMessageType.DHCPOFFER.value
             });
             
             resp.broadcastPacket(pkt, (err) => {
                 if (err) {
                     Logger.error(err);
                 } else {
                     Logger.info("Offering IP to", m.xid);
                 }
                 
                 resp.close();
             });
        }
        
     
     });
     
     this.dhcpServer.on('listening', function (address) {
        Logger.info('listening on ' + address);
     });

     this.tftpServer.on('error', function (err) {
         //Errors from the main socket
         //The current transfers are not aborted
         Logger.error(err);
     });

     this.tftpServer.on('request', function (req, res) {
        req.on('error', function (err) {
             //Error from the request
             //The connection is already closed
             Logger.error("[" + req.stats.remoteAddress + ":" + req.stats.remotePort +	"] (" + req.file + ") " + error.message);
        });
     });


    this.dhcpServer.bind();

    Logger.info("Servers binded!");
};

module.exports = Server;

