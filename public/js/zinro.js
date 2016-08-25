var ZinroClient;
(function (ZinroClient) {
    var LS = (function () {
        function LS() {
            this._key = null;
            this._name = null;
            this._village = null;
        }
        LS.prototype.randomString = function (len) {
            var c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var cl = c.length;
            var r = "";
            for (var i = 0; i < len; i++) {
                r += c[Math.floor(Math.random() * cl)];
            }
            return r;
        };
        ;
        Object.defineProperty(LS.prototype, "key", {
            get: function () {
                if (!this._key) {
                    var zinrokey = localStorage.getItem("zinrokey");
                    if (!zinrokey) {
                        var timekey = new Date().getTime().toString(16);
                        var randomkey = this.randomString(16);
                        zinrokey = timekey + randomkey;
                        localStorage.setItem("zinrokey", zinrokey);
                    }
                    this._key = zinrokey;
                }
                return this._key;
            },
            set: function (zinrokey) {
                localStorage.setItem("zinrokey", zinrokey);
                this._key = zinrokey;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(LS.prototype, "name", {
            get: function () {
                if (!this._name) {
                    var zinroname = localStorage.getItem("zinroname");
                    if (!zinroname) {
                        zinroname = "";
                    }
                    this._name = zinroname;
                }
                return this._name;
            },
            set: function (zinroname) {
                localStorage.setItem("zinroname", zinroname);
                this._name = zinroname;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(LS.prototype, "village", {
            get: function () {
                if (!this._village) {
                    var zinrovillage = localStorage.getItem("zinrovillage");
                    if (!zinrovillage) {
                        zinrovillage = null;
                    }
                    this._village = zinrovillage;
                }
                return this._village;
            },
            set: function (zinrovillage) {
                localStorage.setItem("zinrovillage", zinrovillage);
                this._village = zinrovillage;
            },
            enumerable: true,
            configurable: true
        });
        return LS;
    }());
    var Client = (function () {
        function Client(country_name, zinrokey) {
            this.country_name = country_name;
            this.zinrokey = zinrokey;
            this.country_socket = null;
            this.village_socket = null;
            this.data = {
                country: null,
                village: null,
                msgtbl: null
            };
            this.initialize();
        }
        ;
        Client.prototype.initialize = function () {
            this.initData();
            this.initCountrySocket();
            this.fetchCountryStatus();
        };
        Client.prototype.initData = function () {
            var msgtbl = {
                villager: [],
                werewolf: [],
                sharer: []
            };
            var country = {
                name: "人狼国",
                villages: []
            };
            var village = {
                name: "",
                state: "廃村",
                phase: "吊",
                timelimit: 0,
                admin: null,
                setting: null
            };
            this.data = {
                msgtbl: msgtbl,
                country: country,
                village: village
            };
        };
        Client.prototype.initCountrySocket = function () {
            var $$ = this;
            var socket = io.connect("/countries/" + this.country_name);
            socket.on("status", function (data) {
                console.log(data);
                $$.data.country = data;
            });
            this.country_socket = socket;
        };
        Client.prototype.fetchCountryStatus = function () {
            var req = {
                key: this.zinrokey
            };
            this.country_socket.json.emit("status", req);
        };
        Client.prototype.initVillageSocket = function (village_name) {
            var $$ = this;
            var socket = io.connect("/villages/" + village_name);
            socket.on("status", function (data) {
                console.log(data);
                $$.data.village = data;
            });
            socket.on("message", function (data) {
                console.log(data);
                $$.data.msgtbl[data.room] = data.messages;
            });
            console.log(socket);
            this.village_socket = socket;
        };
        Client.prototype.fetchVillageStatus = function () {
            var req = {
                key: this.zinrokey
            };
            this.village_socket.json.emit("status", req);
        };
        Client.prototype.sendMessage = function (room, text) {
            var msg = {
                key: this.zinrokey,
                room: room,
                text: text
            };
            console.log(msg);
            this.village_socket.json.emit("message", msg);
        };
        return Client;
    }());
    var zls = new LS();
    var zclient = new Client("人狼国", zls.key);
    var zroles = [
        '村人', '占い師', '狂人', '狩人', '霊能者', '共有者',
        '人狼',
        '妖狐'
    ];
    var zfamilymap = {
        '村人': "人",
        '占い師': "人",
        '狂人': "人",
        '狩人': "人",
        '霊能者': "人",
        '共有者': "人",
        '人狼': "狼",
        '妖狐': "狐"
    };
    var HeaderComponent = Vue.extend({
        template: "\n      <nav id=\"navheader\" class=\"navbar navbar-default navbar-static-top navbar-inverse\">\n        <div class=\"container\">\n          <div class=\"navbar-header\">\n            <a class=\"navbar-brand\"><slot>\u4EBA\u72FC</slot></a>\n          </div>\n        </div>\n      </nav>\n    "
    });
    var IndexView = Vue.extend({
        components: {
            "z-header": HeaderComponent
        },
        template: "\n      <div>\n        <z-header>[[country.name]]</z-header>\n        <div class=\"container\">\n          <div class=\"list-group\">\n            <a v-for=\"village in country.villages\" track-by=\"name\"\n            href=\"#\" class=\"list-group-item\"\n            @click=\"selectVillage(village)\">\n              <span>[[village.name]]</span>\n              <span class=\"badge\" :style=\"badgeStyle(village)\">[[village.state]]</span>\n            </a>\n          </div>\n        </div>\n      </div>\n    ",
        props: {
            zdata: Object
        },
        computed: {
            country: function () {
                var $$ = this.zdata;
                return $$.country;
            }
        },
        methods: {
            selectVillage: function (village) {
                console.log(JSON.parse(JSON.stringify(village)));
                this.$dispatch('selectVillage', village);
            },
            badgeStyle: function (village) {
                var style = {};
                switch (village.state) {
                    case "廃村":
                        style["background-color"] = "gray";
                        break;
                    case "村民募集中":
                        style["background-color"] = "blue";
                        break;
                    case "戦闘中":
                        style["background-color"] = "red";
                        break;
                    case "終戦":
                        style["background-color"] = "darkolivegreen";
                        break;
                }
                return style;
            }
        }
    });
    var InputComponent = Vue.extend({
        template: "\n      <div class=\"form-group form-group-sm\">\n        <label :for=\"id\" class=\"col-sm-2 control-label\">[[label]]</label>\n        <div class=\"col-sm-10\">\n          <input v-if='type==\"number\"' :id=\"id\" :type=\"type\" class=\"form-control\" style=\"max-width:200px;\" v-model=\"model\" number :min=\"min\" :step=\"step\">\n          <input v-else :id=\"id\" :type=\"type\" class=\"form-control\" style=\"max-width:200px;\" v-model=\"model\">\n        </div>\n      </div>\n    ",
        props: {
            id: String,
            type: {
                type: String,
                default: "text"
            },
            label: String,
            model: [String, Number],
            min: Number,
            step: {
                type: Number,
                default: 1
            }
        }
    });
    var BuildView = Vue.extend({
        components: {
            "z-header": HeaderComponent,
            "z-input": InputComponent
        },
        template: "\n      <div>\n        <z-header>\u5EFA\u6751\u4E2D</z-header>\n        <div class=\"container\">\n          <form class=\"form-horizontal\">\n            <z-input id=\"name\" label=\"\u6751\u306E\u540D\u524D\" :model.sync=\"s.name\"></z-input>\n            <z-input id=\"daytime\" label=\"\u663C\u6642\u9593\uFF08\u79D2\uFF09\" :model.sync=\"s.daytime\" type=\"number\" :min=\"1\"></z-input>\n            <z-input id=\"nighttime\" label=\"\u591C\u6642\u9593\uFF08\u79D2\uFF09\" :model.sync=\"s.nighttime\" type=\"number\" :min=\"1\"></z-input>\n            <z-input id=\"hangtime\" label=\"\u540A\u6642\u9593\uFF08\u79D2\uFF09\" :model.sync=\"s.hangtime\" type=\"number\" :min=\"1\"></z-input>\n            <z-input id=\"bitetime\" label=\"\u565B\u6642\u9593\uFF08\u79D2\uFF09\" :model.sync=\"s.bitetime\" type=\"number\" :min=\"1\"></z-input>\n            <div class=\"form-group form-group-sm\">\n              <label for=\"inputVillageRoles\" class=\"col-sm-2 control-label\">\u69CB\u6210\u54E1</label>\n              <div class=\"col-sm-10 form-inline\">\n                <template v-for=\"role in roles\">\n                <label :for=\"role\" class=\"control-label\">[[role]]</label>\n                <input :id=\"role\" type=\"number\" class=\"form-control\" style=\"max-width:50px;\" v-model=\"s.rolenum[role]\" number min=0>\n                </template>\n              </div>\n            </div>\n            <div class=\"form-group form-group-sm\">\n                <div class=\"col-sm-offset-2 col-sm-10\">\n                    <div class=\"checkbox\">\n                        <label>\n                            <input id=\"firstnpc\" type=\"checkbox\" v-model=\"s.firstnpc\"> \u521D\u65E5NPC &nbsp;\n                        </label>\n                        <label>\n                            <input id=\"roledeath\" type=\"checkbox\" v-model=\"s.roledeath\"> \u521D\u65E5\u5F79\u8077\u6B7B &nbsp;\n                        </label>\n                        <label>\n                            <input id=\"zombie\" type=\"checkbox\" v-model=\"s.zombie\"> \u30BE\u30F3\u30D3\n                        </label>\n                    </div>\n                </div>\n            </div>\n          </form>\n          <ul style=\"color:red\">\n            <li v-for=\"error in errors\">[[error]]</li>\n          </ul>\n\n          <pre>[[s|json]]</pre>\n          <pre>[[humannum]]</pre>\n          <pre>[[wolfnum]]</pre>\n        </div>\n      </div>\n    ",
        props: {
            zdata: Object
        },
        data: function () {
            return {
                roles: zroles
            };
        },
        computed: {
            s: function () {
                var $$ = this.zdata;
                return $$.village.setting;
            },
            humannum: function () {
                var $$ = this.zdata;
                var roles = this.roles;
                var rnum = $$.village.setting.rolenum;
                var humannum = 0;
                for (var _i = 0, roles_1 = roles; _i < roles_1.length; _i++) {
                    var role = roles_1[_i];
                    if (zfamilymap[role] == "人") {
                        humannum += rnum[role];
                    }
                }
                return humannum;
            },
            wolfnum: function () {
                var $$ = this.zdata;
                var rnum = $$.village.setting.rolenum;
                return rnum.人狼;
            },
            errors: function () {
                var $$ = this.zdata;
                var s = $$.village.setting;
                var humannum = this.humannum;
                var wolfnum = this.wolfnum;
                var errors = [];
                if (!s.name)
                    errors.push("村の名前がありません。");
                if (wolfnum < 1)
                    errors.push("人狼がいません。");
                if (humannum <= wolfnum + 1)
                    errors.push("人間が少なすぎます。");
                if (s.daytime < 1)
                    errors.push("昼の時間が短すぎます。");
                if (s.nighttime < 1)
                    errors.push("夜の時間が短すぎます。");
                if (s.hangtime < 1)
                    errors.push("吊る時間が短すぎます。");
                if (s.bitetime < 1)
                    errors.push("噛む時間が短すぎます。");
                return errors;
            }
        }
    });
    var ChatComponent = Vue.extend({
        filters: {
            "datefmt": function (value) {
                var dd = new Date(value);
                var hours = ("0" + dd.getHours()).slice(-2);
                var minutes = ("0" + dd.getMinutes()).slice(-2);
                var seconds = ("0" + dd.getSeconds()).slice(-2);
                return hours + ":" + minutes + ":" + seconds;
            }
        },
        template: "\n      <div style=\"margin-bottom:10px;\">\n        <form @submit.prevent.stop=\"sendMessage()\" role=\"form\">\n          <div class=\"input-group\">\n            <input type=\"text\" class=\"form-control\" v-model=\"text\">\n            <span class=\"input-group-btn\">\n              <button type=\"submit\" class=\"btn btn-primary\">\u6295\u7A3F</button>\n            </span>\n          </div>\n        </form>\n      </div>\n      <div v-for=\"msg in msgs | orderBy 'msgid' -1\" track-by=\"msgid\">\n        <div style=\"position: relative;\">\n          <span>[[msg.name]]</span>\n          <span class=\"pull-right\" style=\"position: absolute; bottom: 0; right: 0; color:gray; font-size:xx-small;\">[[msg.timestamp | datefmt]]</span>\n        </div>\n        <pre>[[msg.text]]</pre>\n      </div>\n    ",
        props: {
            zdata: zclient.data,
            zkey: zclient.zinrokey,
            room: String,
        },
        data: function () {
            return {
                text: ""
            };
        },
        computed: {
            msgs: function () {
                var $$ = this.zdata;
                return $$.msgtbl.villager;
            }
        },
        methods: {
            sendMessage: function () {
                var $$ = this.zdata;
                if (this.text) {
                    var msg = {
                        room: this.room,
                        key: this.zkey,
                        text: this.text
                    };
                    this.$dispatch('sendMessage', msg);
                    this.text = "";
                }
            }
        }
    });
    var AbandonedView = Vue.extend({
        template: "\n      <div>\n        <a>\u6751\u3092\u4F5C\u3063\u3066\u304F\u3060\u3055\u3044...</a>\n      </div>\n    ",
    });
    var VillagerChatView = Vue.extend({
        components: {
            "z-header": HeaderComponent,
            "chat": ChatComponent
        },
        template: "\n      <z-header>[[village.name]]</z-header>\n      <div class=\"container\">\n        <chat room=\"villager\" :zdata=\"zdata\" :zkey=\"zkey\"></chat>\n      </div>\n    ",
        props: {
            zdata: Object,
            zkey: String
        },
        computed: {
            village: function () {
                var $$ = this.zdata;
                return $$.village;
            }
        }
    });
    var vm_zinro = new Vue({
        el: "#zinro",
        components: {
            "Index": IndexView,
            "Build": BuildView,
            "Abandoned": AbandonedView,
            "VillagerChat": VillagerChatView
        },
        data: {
            zdata: zclient.data,
            zkey: zclient.zinrokey,
            zname: zls.name,
            select_village_name: ""
        },
        computed: {
            current_view: function () {
                var $$ = this.zdata;
                if (!$$.village.name) {
                    return "Index";
                }
                if ($$.village.state == "廃村") {
                    return "Build";
                }
                return "VillagerChat";
            },
            title: function () {
                var $$ = this.zdata;
                if (!$$.village.name) {
                    return $$.country.name;
                }
                return $$.village.name;
            }
        },
        methods: {
            connectVillage: function (name) {
                var socket = io.connect("/villages/" + name);
                socket.on("message", function (data) {
                    console.log(data);
                    socket[data.room] = data.messages;
                });
                socket.on("status", function (data) {
                    console.log(data);
                });
            }
        },
        watch: {
            select_village_name: function (vname) {
                console.log(vname);
                if (vname) {
                    zclient.initVillageSocket(vname);
                    zclient.fetchVillageStatus();
                }
            }
        },
        events: {
            sendMessage: function (msg) {
                zclient.sendMessage(msg.room, msg.text);
                console.log(msg);
            },
            selectVillage: function (village) {
                this.select_village_name = village.name;
            }
        }
    });
})(ZinroClient || (ZinroClient = {}));
