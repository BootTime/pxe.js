# pxe.js
pxe.js is a NodeJS based PXE server.

## Installing
You can install pex.js with npm or yarn. (We reccomend using yarn to install pxe.js)
```
yarn add pxe.js
```
```
npm i --save pxe.js
```

## Usage
pxe.js is simple to use, to start a pxe server, all you have to do is import it, and set your settings. By default, pxe.js supports tftp and dhcp out of the box. Note that for security reasons, denyPUT is denied by default for tftp. If for some reason, you want to allow PUT, simpily change denyPUT in the options.
```javascript
const pxejs = require('pxe.js');
const pxe = new pxejs.Server();
pxe.run();
```

If you want to provide specific config options, you can use pxe.js in the following way.
```javascript
const pxejs = require('pxe.js');
const pxe = new pxejs.Server({
  host: '192.168.1.90'
  port: 4687,
  rootDir: 'tftp/',
  denyPUT: true
});
pxe.run();
```
