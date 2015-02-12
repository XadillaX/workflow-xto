/**
 * XadillaX created at 2015-02-12 12:41:10
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved
 */
var xto = require("xto");
var AlfredItem = require("alfred-item");
var companyMap = require("xto/const/namemapper");
var han = require("han");

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

function completeCompanies(name) {
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

module.exports = function(query) {
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
        return console.log(item);
    }

    var num = query[1];
    
    // 检验正则
    if(!xto.isNumberValid(num, company)) {
        item.addItem(
            0,
            "【" + company.companyname + "】查查 " + num + " 到哪了",
            "等待输入完整运单号",
            "icon.png");
        return console.log(item);
    }

    // 查询快递
    xto.query(num, company.code, function(err, info) {
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

