/**********************************************************
 * Copyright (c) SESHENGHUO.COM All rights reserved       *
 **********************************************************/

/**
 * 存储模块
 * @charset utf-8
 * @author lijun
 * @date 2014.4
 */
;define(function DB(require, exports, module){
    var MemTable = function(){
        this.db = {};
        this.key = "SE_STORAGE_BLOCK";
    };

    MemTable.prototype = {
        expired : function(key, obj){
            if(obj && obj.expired){
                var now = new Date().getTime();
                var expire = (now - obj.expired >= 0);

                if(true === expire){
                    this.remove(key);
                }

                return expire;
            }
            return false;
        },
        put : function(key, obj){
            this.db[key] = obj;
        },
        get : function(key){
            if(key in this.db){
                var obj = this.db[key];
                return this.expired(key, obj) ? null : obj;
            }
            return null;
        },
        remove : function(key){
            if(key in this.db){
                delete this.db[key];
            }
        },
        clear : function(){
            this.db = {};
        },
        toString : function(){
            var tmp = {};

            for(var key in this.db){
                if(this.db.hasOwnProperty(key)){
                    if(!this.expired(key, this.db[key])){
                        tmp[key] = this.db[key];
                    }else{
                        this.remove(key);
                    }
                }
            }
            JSON.stringify(tmp);
        }
    };

    var pdb = new MemTable();
    var sdb = new MemTable();
    var mdb = new MemTable();

    var Persistent = {
        supported : -1,
        set : function(key, value, expired){
            pdb.put(key, {
                "value" : value,
                "expired" : expired || 0,
                "timestamp" : new Date().getTime()
            });

            this.flush();
        },
        get : function(key){
            var m = pdb.get(key);
            var p = null;
            var v = null;
            var o = null;

            if(null != m){
                v =  m.value;
            }else{
                if(this.support()){
                    p = window.localStorage.getItem(pdb.key)||"{}";                
                    o = $.parseJSON(p);

                    if(key in o){
                        m = pdb.expired(o[key]) ? null : o[key];

                        v = (null == m ? null : m.value);
                    }
                }else{
                    v = Mem.get(key, pdb);
                }
            }

            return v;
        },
        remove : function(key){
            var p = null;

            if(this.support()){
                p = window.localStorage.getItem(pdb.key)||"{}"; 
                pdb.db = $.parseJSON(p);

                pdb.remove(key);
                this.flush();
            }else{
                Mem.remove(key, pdb);
            }
        },
        clear : function(){
            if(this.support()){
                pdb.clear();
                this.flush();
            }else{
                Mem.clear(pdb);
            }
        },
        flush : function(){
            if(this.support()){
                window.localStorage.setItem(pdb.key, pdb.toString());
            }else{
                Mem.flush(pdb);
            }
        },
        /**
         * 是否支持storage
         * @return Boolean support true/false
         */
        support : function(){
            var __is = false;
            var key = "SE_CACHE_SUPPORT";
            var cache = this.supported;
            
            if(cache != -1){
                return cache;
            }else{
                try{
                    var storage = window.localStorage;
                    
                    storage.setItem(key, "1");
                    __is = ("1" == storage.getItem(key));
                    this.supported = __is;

                    storage.removeItem(key);
                }catch(e){}finally{
                    return __is;
                }
            }
        }
    };

    var Session = {
        supported : -1,
        set : function(key, value){
            sdb.put(key, {
                "value" : value,
                "expired" : 0,
                "timestamp" : new Date().getTime()
            });

            this.flush();
        },
        get : function(key){
            var m = sdb.get(key);
            var p = null;
            var v = null;
            var o = null;

            if(null != m){
                v =  m.value;
            }else{
                if(this.support()){
                    p = window.sessionStorage.getItem(sdb.key)||"{}";                
                    o = $.parseJSON(p);

                    if(key in o){
                        m = sdb.expired(o[key]) ? null : o[key];

                        v = (null == m ? null : m.value);
                    }
                }else{
                    v = Mem.get(key, sdb);
                }
            }

            return v;
        },
        remove : function(key){
            var p = null;

            if(this.support()){
                p = window.sessionStorage.getItem(sdb.key)||"{}"; 
                sdb.db = $.parseJSON(p);

                sdb.remove(key);
                this.flush();
            }else{
                Mem.remove(key, sdb);
            }
        },
        clear : function(){
            if(this.support()){
                sdb.clear();
                this.flush();
            }else{
                Mem.clear(sdb);
            }
        },
        flush : function(){
            if(this.support()){
                window.sessionStorage.setItem(sdb.key, sdb.toString());
            }else{
                Mem.flush(sdb);
            }
        },
        /**
         * 是否支持storage
         * @return Boolean support true/false
         */
        support : function(){
            var __is = false;
            var key = "SE_CACHE_SUPPORT";
            var cache = this.supported;
            
            if(cache != -1){
                return cache;
            }else{
                try{
                    var storage = window.sessionStorage;
                    
                    storage.setItem(key, "1");
                    __is = ("1" == storage.getItem(key));
                    this.supported = __is;

                    storage.removeItem(key);
                }catch(e){}finally{
                    return __is;
                }
            }
        }
    };

    var Mem = {
        get : function(key, db){
            var m = db.get(key);
            var p = null;
            var v = null;
            var o = null;

            if(null != m){
                v =  m.value;
            }else{
                p = window.name||"{}";
                o = $.parseJSON(p);

                if(key in o){
                    m = db.expired(o[key]) ? null : o[key];

                    v = (null == m ? null : m.value);
                }
            }

            return v;
        },
        remove : function(key, db){
            var p = window.name||"{}";
            db.db = $.parseJSON(p);

            db.remove(key);
            this.flush(db);
        },
        clear : function(db){
            db.clear();
            this.flush(db);
        },
        flush : function(db){
            window.name = db.toString();
        }
    };

    module.exports = {
        "Persistent" : Persistent,
        "Session" : Session
    }
});