const chalk = require('chalk');

const Logger = new function () {

    this.setPrefix = function (prefix) {
        this.prefix = prefix;
    };

    this.getPrefix = function () {
        return this.prefix;
    };

    this.warning = function (message, ...args) {
        if (args) {
            console.log(this.getPrefix() + chalk.yellow('[Warning] ') + message, args);
        } else {
            console.log(this.getPrefix() + chalk.yellow('[Warning] ') + message);
        }
    };

    this.error = function (message, ...args) {
        if (args) {
            console.error(this.getPrefix() + chalk.red('[Error] ') + message, args);
        } else {
            console.error(this.getPrefix() + chalk.red('[Error] ') + message);
        }
    };

    this.info = function (message, ...args) {
        if (args) {
            console.info(this.getPrefix() + chalk.blue('[Info] ') + message, args);
        } else {
            console.info(this.getPrefix() + chalk.blue('[Info] ') + message);
        }
    };

};

module.exports = Logger;
