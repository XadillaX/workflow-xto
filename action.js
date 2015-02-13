/**
 * XadillaX created at 2015-02-13 16:32:36
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved
 */
require("sugar");
var fs = require("fs-extra");
var spawn = require("child_process").spawn;
var common = require("./common");

function clean(company) {
    console.log(company);

    if(!company) {
        return fs.remove(common.HISTORY_PATH, function(err) {
            // 有 error 也没事...
            err = null;
        });
    }

    fs.readJson(common.HISTORY_PATH, function(err, json) {
        if(err) {
            return;
        }

        if(!json) return;

        delete json[company];
        fs.writeJson(common.HISTORY_PATH, json, function(err) {
            // 有 error 也没事...
            err = null;
        });
    });
}

module.exports = function(arg) {
    var arg = JSON.parse(arg);

    switch(arg.cmd) {
        case "open": {
            spawn("open", arg.args);
            break;
        }

        case "clean": {
            clean(arg.code, arg.query);
            break;
        }

        default: break;
    }
};

