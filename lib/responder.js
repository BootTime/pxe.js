const EventEmitter = require('events').EventEmitter;
const util = require('util');
const dgram = require('dgram');
const V4Address = require('ip-address').Address4;
const protocol = require('dhcpjs').Protocol;
const logger = require('./utils/logger');

const Responder = function (options) {
    this.options = typeof(options) !== "object" ? {} : options;

    let self = this;
    EventEmitter.call(this, options);

    this.socket = dgram.createSocket('udp4');
    this.socket.on('error', (err) => {
        logger.error(`Responder error:\n${err.stack}`);
    });
}

util.inherits(Responder, EventEmitter);
module.exports = Responder;

Responder.prototype.bind = (host) => {
    let that = this;

    this.socket.bind({address: host}, () => {
        that.socket.setTTL(1);
        that.socket.setBroadcast(true);
        logger.info('Responder binded');
    });
}

Responder.prototype.close = () => {
    this.socket.close();
}

Responder.prototype.broadcastPacket = (pkt, cb) => {
    let port = 68;
    let host = '255.255.255.255';
    this.socket.send(pkt, 0, pkt.length, port, host, cb);
}

Responder.prototype.createPacket = (pkt) => {
    if (!('xid' in pkt)) {
        throw new Error('pkt.xid required');
    }

    let ci = new Buffer(('ciaddr' in pkt) ? new V4Address(pkt.ciaddr).toArray() : [0, 0, 0, 0]);
    let yi = new Buffer(('yiaddr' in pkt) ? new V4Address(pkt.yiaddr).toArray() : [0, 0, 0, 0]);
    let si = new Buffer(('siaddr' in pkt) ? new V4Address(pkt.siaddr).toArray() : [0, 0, 0, 0]);
    let gi = new Buffer(('giaddr' in pkt) ? new V4Address(pkt.giaddr).toArray() : [0, 0, 0, 0]);

    if (!('chaddr' in pkt)) {
        throw new Error('pkt.chaddr required');
        let hw = new Buffer(pkt.chaddr.split(':').map((part) => {
            return parseInt(part, 16);
        }));
    }

    if (hw.length !== 6) {
        throw new Error('pkt.chaddr malformed, only ' + hw.length + ' bytes');
    }

    let p = new Buffer(1500);
    let i = 0;

    p.writeUInt8(pkt.op,    i++);
    p.writeUInt8(pkt.htype, i++);
    p.writeUInt8(pkt.hlen,  i++);
    p.writeUInt8(pkt.hops,  i++);
    p.writeUInt32BE(pkt.xid,   i); i += 4;
    p.writeUInt16BE(pkt.secs,  i); i += 2;
    p.writeUInt16BE(pkt.flags, i); i += 2;
    ci.copy(p, i); i += ci.length;
    yi.copy(p, i); i += yi.length;
    si.copy(p, i); i += si.length;
    gi.copy(p, i); i += gi.length;
    hw.copy(p, i); i += hw.length;
    p.fill(0, i, i + 10); i += 10; // hw address padding
    p.fill(0, i, i + 192); i += 192;
    p.writeUInt32BE(0x63825363, i); i += 4;

    if (pkt.options && 'requestedIpAddress' in pkt.options) {
        p.writeUInt8(50, i++); // option 50
        let requestedIpAddress = new Buffer(new v4.Address(pkt.options.requestedIpAddress).toArray());
        p.writeUInt8(requestedIpAddress.length, i++);
        requestedIpAddress.copy(p, i); i += requestedIpAddress.length;
    }

    if (pkt.options && 'dhcpMessageType' in pkt.options) {
        p.writeUInt8(53, i++); // option 53
        p.writeUInt8(1, i++);  // length
        p.writeUInt8(pkt.options.dhcpMessageType.value, i++);
    }

    if (pkt.options && 'serverIdentifier' in pkt.options) {
        p.writeUInt8(54, i++); // option 54
        let serverIdentifier = new Buffer(new v4.Address(pkt.options.serverIdentifier).toArray());
        p.writeUInt8(serverIdentifier.length, i++);
        serverIdentifier.copy(p, i); i += serverIdentifier.length;
    }

    if (pkt.options && 'parameterRequestList' in pkt.options) {
        p.writeUInt8(55, i++); // option 55
        let parameterRequestList = new Buffer(pkt.options.parameterRequestList);
        
        if (parameterRequestList.length > 16) {
            throw new Error('pkt.options.parameterRequestList malformed');
        }

        p.writeUInt8(parameterRequestList.length, i++);
        parameterRequestList.copy(p, i); i += parameterRequestList.length;
    }

    if (pkt.options && 'clientIdentifier' in pkt.options) {
        let clientIdentifier = new Buffer(pkt.options.clientIdentifier);
        let optionLength = 1 + clientIdentifier.length;
        
        if (optionLength > 0xff) {
            throw new Error('pkt.options.clientIdentifier malformed');
        }

        p.writeUInt8(61, i++);           // option 61
        p.writeUInt8(optionLength, i++); // length
        p.writeUInt8(0, i++);            // hardware type 0
        clientIdentifier.copy(p, i); i += clientIdentifier.length;
    }

    // option 255 - end
    p.writeUInt8(0xff, i++);

    // padding
    if ((i % 2) > 0) {
        p.writeUInt8(0, i++);
    } else {
        p.writeUInt16BE(0, i++);
    }

    let remaining = 300 - i;
    if (remaining) {
        p.fill(0, i, i + remaining); i+= remaining;
    }

    return p.slice(0, i);
}

Responder.prototype.createOfferPacket = (request) => {
    
    let pkt = {
        op: protocol.BOOTPMessageType.BOOTPREPLY.value,
        htype: 	0x01,
        hlen:   0x06,
        hops:   0x00,
        xid:    0x00000000,
        secs:   0x0000,
        flags:  0x0000,
        ciaddr: '0.0.0.0',
        yiaddr: '192.168.33.3',
        siaddr: '192.168.33.1',
        giaddr: '0.0.0.0',
    };
    
    pkt.xid = request.xid;
    pkt.chaddr = request.chaddr;
    pkt.options = request.options;
    
    return Responder.prototype.createPacket(pkt);
}

