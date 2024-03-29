/**********************************************************
 * Copyright (c) SESHENGHUO.COM All rights reserved       *
 **********************************************************/

/**
 * 公共命令模块
 * @charset utf-8
 * @author lijun
 * @date 2014.4
 */
;define(function CMD(require, exports, module){
    var Util    = $.Util    = require("mod/se/util.js");
    var Request = $.Request = require("mod/se/request.js");
    var DB      = $.Storage = require("mod/se/storage.js");
    var Loading = $.Loading = require("mod/se/loading");

    var ErrorMap = {
        // "EXAMPLE_CODE" : function(handler){
        //     //todo
        //     Util.execHandler(handler);
        //     return true;
        // }
    };

    //响应类型
    var RespTypes = {
        "J" : "json",
        "P" : "jsonp",
        "T" : "text",
        "R" : "redirect"
    };

    //命令集，由外部注入
    var commands = {
        // "mod_name" : {
        //     "request_type1" : {
        //         "request_name":{"url":"xxxx.do", "data":"", "method":"POST", "cross":false, "spa":false, "replace":false, "cache":"auto", "append":"auto", "dataType":RespTypes.J}
        //     },
        //     "request_type2" : {
        //         "request_name":{"url":"xxxx.shtml", "data":"", "method":"GET", "cross":false, "spa":false, "replace":false,, "cache":"auto", "append":true, "dataType":RespTypes.R}
        //     }
        // }       
    };

    /**
     * 触发一个错误处理
     * @param String code 错误码
     * @param String msg 错误信息
     * @param Object handler 
     */
    function FireError(code, msg, handler){
        msg = msg.replace(/\[\d+\]/, "");
        handler = handler || {};

        var args = handler.args || [];
        handler.args = [code, msg].concat(args);

        if(code in ErrorMap){
            ErrorMap[code].apply(null, [handler]);
        }else{
            Util.execHandler(handler);
        }
    }

    /**
     * 缓存请求信息
     * @param String url 请求的完成URL
     * @param Object info 请求参数
     */
    function SetRequestInfo(url, info){
        var req = Request.parseURL(url);
        var host = req.host;
        var pathname = req.pathname;
        var name = host + pathname;

        DB.Session.set(name, Request.stringify(info));

        req = null;
    }

    /**
     * 获取请求信息
     * @param String url 请求的完成URL
     * @return Object info 信息对象
     */
    function GetRequestInfo(url){
        var req = Request.parseURL((url||document.URL));
        var host = req.host;
        var pathname = req.pathname;
        var name = host + pathname;
        var cacheInfo = DB.Session.get(name);
        var info = Request.serialized(cacheInfo);

        return info;
    }

    /**
     * 注册命令
     * @param Object cmds 命令集 @see commands
     */
    function InjectCommands(cmds){
        $.extend(commands, cmds);
    }

    /**
     * 注册错误信息
     * @param Object errInfo 错误信息 @see ErrorMap
     */
    function InjectErrorInfo(errInfo){
        $.extend(ErrorMap, errInfo);
    }

    /**
     * 检测这个命令是否存在
     * @param String namespace 执行命令字，格式：mod_name.request_type.request_name
     */
    function ExistCommand(namespace){
        var items = namespace.split(".");
        var mod_name = items[0];
        var request_type = items[1];
        var request_name = items[2];
        var exist = false;

        try{
            var cmd = commands[mod_name][request_type][request_name];
            exist = (cmd ? true : false);
        }catch(e){
            exist = false;
        }finally{
            return exist;
        }
    }

    /**
     * 复制命令
     * @param Object obj 命令
     * @return Object cmd 复制后的命令
     */
    function CloneCMD(obj){
        var cmd = {};

        cmd = $.extend(cmd, obj);

        return cmd;
    }

    /**
     * 获取一个命令字
     * @param String namespace 执行命令字，格式：mod_name.request_type.request_name
     * @param Object tplData 数据模板数据
     * @return Object cmd
     */
    function GetCommand(namespace, tplData){
        var cmd = null;
        var conf = null;
        var req = null;
        var items = namespace.split(".");
        var mod_name = items[0];
        var request_type = items[1];
        var request_name = items[2];

        if(ExistCommand(namespace)){
            cmd = CloneCMD(commands[mod_name][request_type][request_name]);
            cmd.data = Util.formatData(cmd.data||"", tplData||null);
        }else{
            throw new Error("unknown command (" + namespace + ")!");
        }        

        return cmd;
    }

    /**
     * 回调
     * @param Object cmd 命令
     * @param Object ajaxSetting ajax设置 ==> @see $.ajax(options)
     */
    function CallBack(cmd, ajaxSetting){
        cmd.traditional = ajaxSetting.traditional || true;
        cmd.type = ajaxSetting.type || cmd.method;

        cmd = $.extend(cmd, ajaxSetting);
        cmd.xhrFields = ajaxSetting.xhrFields || {};

        if(true === cmd.cross){
            cmd.xhrFields["withCredentials"] = true;
        }

        var fnBeforeSend = cmd.beforeSend;
        var fnComplete = cmd.complete;

        var _beforeSend = function(xhr, settings){
            //ajaxSetting.loadingText
            //loading...
            Loading.show(settings.loadingText || "加载中...");

            if(fnBeforeSend){
                fnBeforeSend.apply(null, [xhr, settings]);
            }

            fnBeforeSend = null;
        };
        cmd.beforeSend = _beforeSend;

        var _complete = function(xhr, settings){
            //hide loading...
            Loading.hide();

            if(fnComplete){
                fnComplete.apply(null, [xhr, settings]);
            }

            fnComplete = null;
        };
        cmd.complete = _complete;

        $.ajax(cmd);
    }

    /**
     * 获取一个命令字
     * @param String namespace 执行命令字，格式：mod_name.request_type.request_name
     * @param Object tplData 数据模板数据
     * @param Object ajaxSetting ajax设置 ==> @see $.ajax(options)
     * @return Object cmd
     */
    function Exec(namespace, tplData, ajaxSetting){
        var cmd = GetCommand(namespace, tplData || null);

        if(null != cmd){
            switch(cmd.dataType){
                case RespTypes.J:
                case RespTypes.P:
                case RespTypes.T:
                    CallBack(cmd, ajaxSetting);
                break;
                case RespTypes.R:
                    SetRequestInfo(cmd.url, Request.serialized(cmd.data));
                    
                    if(cmd.append === undefined || cmd.append == "auto" || true === cmd.append){
                        Request.append(cmd.url, cmd.data);
                    }

                    if(true === cmd.spa){
                        //spa interface
                    }else{
                        if(true === cmd.replace){
                            location.replace(cmd.url);
                        }else{
                            location.href = cmd.url;
                        }
                    }
                break;
                default:
                    throw new Error("unknown response type(" + cmd.dataType + ")!");
                break;
            }
        }else{
            throw new Error("unknown command(" + namespace + ")");
        }
    }

    module.exports = {
        "exec": Exec,
        "existCommand" : ExistCommand,
        "fireError" : FireError,
        "setRequestInfo" : SetRequestInfo,
        "getRequestInfo" : GetRequestInfo,
        "injectCommands" : InjectCommands,
        "injectErrorInfo" : InjectErrorInfo,
        //-------------------------------------------------
        "ResponseTypes" : RespTypes
    };
});