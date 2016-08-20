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
    var zls = new LS();
    var zinrokey = zls.key;
    var g_msgtbl = {
        villager: [],
        werewolf: [],
        sharer: []
    };
    var g_c_status = {
        name: "",
        villages: []
    };
    var io_country = io.connect("/countries/人狼国");
    io_country.on("status", function (data) {
        console.log(data);
        g_c_status.name = data.name;
        g_c_status.villages = data.villages;
    });
    var csrequest = {
        key: zinrokey
    };
    io_country.json.emit("status", csrequest);
    var g_v_status = {
        name: "",
        state: "廃村",
        phase: "吊",
        timelimit: 0,
        admin: null
    };
    function updateVillageStatus(status) {
        g_v_status.name = status.name;
        g_v_status.state = status.state;
        g_v_status.phase = status.phase;
        g_v_status.timelimit = status.timelimit;
        g_v_status.admin = status.admin;
    }
    var io_village = null;
    var IndexVue = Vue.extend({
        template: "\n      <div>\n        <table class=\"table\">\n          <thead>\n            <tr>\n              <th>\u6751\u540D</th><th>\u72B6\u614B</th>\n            </tr>\n          </thead>\n          <tbody>\n            <tr v-for=\"village in villages\" track-by=\"name\" @click=\"selectVillage(village)\">\n              <td>[[village.name]]</td>\n              <td>[[village.state]]</td>\n            </tr>\n          </tbody>\n        </table>\n      </div>\n    ",
        data: function () {
            return {
                c_status: g_c_status
            };
        },
        computed: {
            country_name: function () {
                var c_status = this.c_status;
                return c_status.name;
            },
            villages: function () {
                var c_status = this.c_status;
                return c_status.villages;
            }
        },
        methods: {
            selectVillage: function (village) {
                this.$dispatch('selectVillage', village.name);
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
            village: String,
            room: String,
            msgs: Array
        },
        data: function () {
            return {
                text: "",
                key: zinrokey
            };
        },
        methods: {
            sendMessage: function () {
                var msg = {
                    room: this.room,
                    key: this.key,
                    text: this.text
                };
                this.$dispatch('sendMessage', msg);
                this.text = "";
            }
        }
    });
    var AbandonedView = Vue.extend({
        template: "\n      <div>\n        <a>\u6751\u3092\u4F5C\u3063\u3066\u304F\u3060\u3055\u3044...</a>\n      </div>\n    ",
    });
    var VillagerChatView = Vue.extend({
        components: { "chat": ChatComponent },
        template: '<chat :village="village" room="villager" :msgs="msgs"></chat>',
        props: { village: String },
        data: function () { return { msgtbl: g_msgtbl }; },
        computed: {
            msgs: function () { return this.msgtbl.villager; }
        }
    });
    var vm_zinro = new Vue({
        el: "#zinro",
        components: {
            "index": IndexVue,
            "chat": ChatComponent,
            "Abandoned": AbandonedView,
            "VillagerChat": VillagerChatView
        },
        data: {
            country_status: g_c_status,
            village_status: g_v_status,
            userkey: zls.key,
            username: zls.name,
            select_village: zls.village
        },
        computed: {
            current_view: function () {
                var village = this.select_village;
                if (!village) {
                    return "index";
                }
                return "VillagerChat";
            }
        },
        methods: {
            connectVillage: function (name) {
                io_village = io.connect("/villages/" + name);
                io_village.on("message", function (data) {
                    console.log(data);
                    g_msgtbl[data.room] = data.messages;
                });
                io_village.on("status", function (data) {
                    console.log(data);
                    updateVillageStatus(data);
                });
            }
        },
        watch: {
            select_village: function (vname) {
                console.log(vname);
                if (vname) {
                    this.connectVillage(vname);
                    io_village.json.emit("status", { key: this.userkey });
                }
            }
        },
        events: {
            sendMessage: function (msg) {
                io_village.json.emit("message", msg);
                console.log(msg);
            },
            selectVillage: function (vname) {
                this.select_village = vname;
            }
        }
    });
})(ZinroClient || (ZinroClient = {}));
