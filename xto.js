/**
 * XadillaX created at 2015-02-12 12:41:10
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved
 */
require("sugar");
var xto = require("xto");
var companyMap = require("xto/const/namemapper");
var AlfredItem = require("alfred-item");
var han = require("han");
var async = require("async");
var fs = require("fs-extra");
var path = require("path");

var HISTORY_PATH = path.join(process.env.HOME, ".alfred/xto/history");
var SHOW_MAX_HISTORY = 8;

function writeResult(company, num, err, info) {
    if(err && (err.message.indexOf("不存在") < 0 || err.message.indexOf("过期") < 0)) {
        return;
    }

    async.waterfall([
        function(callback) {
            fs.ensureFile(HISTORY_PATH, function(err) {
                callback(err);
            });
        },

        function(callback) {
            fs.readJson(HISTORY_PATH, function(err, json) {
                return callback(undefined, json || {});
            });
        },

        function(orig, callback) {
            var code = company.code;
            if(undefined === orig[code]) orig[code] = [];
            var inner = orig[code].reduce(function(res, info) {
                if(info.num !== num) {
                    res.push(info);
                }

                return res;
            }, []);

            var cur = { num: num };
            var updateTime = Date.create().format("{yyyy}年{MM}月{dd}日 {HH}:{mm}:{ss}");
            if(err) {
                cur.title = num + "：" + err.message;
            } else if(info !== undefined && info !== null) {
                cur.title = num + "：" + info.data[0].context;
            }

            if(!cur.title) return callback(undefined, orig);

            cur.subtitle = "最后更新：" + updateTime;
            if(info) {
                cur.subtitle = xto.stateToText(info.state) + "，" + cur.subtitle;
            }
            cur.time = updateTime;
            cur.complete = company.shortname;
            if(cur.complete.indexOf(" ") >= 0) {
                cur.complete = company.code;
            }
            cur.complete += " " + num;
            inner.unshift(cur);

            orig[code] = inner;

            while(orig[code].length > SHOW_MAX_HISTORY) orig[code].pop();

            callback(undefined, orig);
        },

        function(json, callback) {
            fs.writeJson(HISTORY_PATH, json, callback);
        }
    ], function(err) {
        // 有 err 也没办法
        if(err) {
            /** ignore */
            err = null;
        }
    });
}

function outputWait() {
    var item = new AlfredItem();
    item.addItem(0, "查查 ... 到哪了", "Nyaa", "icon.png");
    console.log(item);
}

function outputNoCompany(name) {
    var item = new AlfredItem();
    item.addItem(0, "快递公司 " + name + " 貌似不存在哦~", "请输入正确的快递公司", "icon.png");
    console.log(item);
}

function outputError(err) {
    var item = new AlfredItem();
    item.addItem(0, err.message, "查询出错", "icon.png");
    console.log(item);
}

function pinyinMatched(src, dist) {
    var _src = src.split(" ").compact(true);
    var pinyins = [];
    for(var i = 0; i < src.length; i++) {
        var temp = han.pinyin(_src[i]);
        for(var j = 0; j < temp.length; j++) {
            pinyins.push(temp[j]);
        }
    }

    if(pinyins.length < dist.length) return false;
    dist = dist.toLowerCase();
    for(var i = 0; i < dist.length; i++) {
        if(typeof pinyins[i] === "string") {
            if(dist[i] !== pinyins[i][0].toLowerCase()) return false;
            continue;
        }

        var fit = false;
        for(var j = 0; j < pinyins[i].length; j++) {
            var first = pinyins[i][j][0];
            if(first.toLowerCase() === dist[i]) {
                fit = true;
                break;
            }
        }
        if(!fit) return false;
    }

    return true;
}

function searchCompanies(name) {
    var results = [];
    for(var i = 0; i < companyMap.length; i++) {
        var company = companyMap[i];
        if(company.companyname.startsWith(name) ||
            company.code.startsWith(name) ||
            company.shortname.startsWith(name) ||
            company.url.startsWith(name)) {
            results.push(company);
        } else if(pinyinMatched(company.companyname, name) ||
            pinyinMatched(company.shortname, name)) {
            results.push(company);
        }
    }

    return results;
}

function completeCompanies(name) {
    var results = searchCompanies(name);
    if(!results.length) return outputNoCompany(name);

    var item = new AlfredItem();
    for(var i = 0; i < results.length; i++) {
        var company = results[i];
        var displayName = company.shortname;
        if(displayName.indexOf(" ") >= 0) displayName = company.url;
        item.addItem(
            i,
            "【" + company.companyname + "】查查 ... 到哪了",
            company.companyname + " - " + company.shortname + " - " + company.code + " - " + company.url,
            "icon.png", {
                autocomplete: displayName + " "
            });
    }

    console.log(item);
}

function outputHistory(company, item, maxItems, prefix) {
    if(!maxItems) return console.log(item);

    prefix = prefix.toLowerCase();
    fs.readJson(HISTORY_PATH, function(err, json) {
        if(json) {
            var c = json[company.code];
            for(var i = 0; i < Math.min(c.length, maxItems); i++) {
                if(!c[i].num.toLowerCase().startsWith(prefix)) continue;
                item.addItem(
                    i + 1,
                    "【" + company.companyname + "】" + c[i].title,
                    c[i].subtitle,
                    "icon.png", {
                        autocomplete: c[i].complete
                    });
            }
        }

        return console.log(item);
    });
}

module.exports = function(query) {
    var rawQuery = query;
    var query = query.split(" ").compact(true);
    var item = new AlfredItem();

    // 先查找快递公司
    if(!query.length) {
        return outputWait();
    }

    var companyName = query[0];
    var company = xto.getCompanyInfo(companyName);
    if(!company) {
        if(query.length === 1) {
            return completeCompanies(companyName);
        } else if(query.length > 1) {
            var companies = searchCompanies(companyName);
            if(companies.length !== 1) return outputNoCompany(companyName);
            company = companies[0];
        } else {
            return outputNoCompany(companyName);
        }
    }

    if(query.length === 1) {
        var displayName = company.shortname;
        if(displayName.indexOf(" ") >= 0) displayName = company.code;
        item.addItem(
            0, 
            "【" + company.companyname + "】查查 ... 到哪了",
            "请输入运单号",
            "icon.png", {
                autocomplete: displayName + " "
            });

        return outputHistory(company, item, rawQuery.endsWith(" ") ? SHOW_MAX_HISTORY : 0, "");
    }

    var num = query[1];
    
    // 检验正则
    if(!xto.isNumberValid(num, company)) {
        item.addItem(
            0,
            "【" + company.companyname + "】查查 " + num + " 到哪了",
            "等待输入完整运单号",
            "icon.png");

        return outputHistory(company, item, SHOW_MAX_HISTORY - 1, num);
    }

    // 查询快递
    xto.query(num, company.code, function(err, info) {
        writeResult(company, num, err, info);

        if(err) {
            return outputError(err);
        }

        var state = xto.stateToText(info.state);
        item.addItem(
            0,
            company.companyname + "：" + state,
            "当前运单状态",
            "icon.png");

        for(var i = 0; i < info.data.length; i++) {
            var data = info.data[i];
            item.addItem(i + 1, data.context, data.time, "icon.png");
        }

        console.log(item);
    });
};

