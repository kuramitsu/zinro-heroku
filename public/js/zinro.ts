/// <reference path="../../typings/main.d.ts" />
/// <reference path="../../zinro.d.ts" />

// Zinro Logic
module ZinroClient {
  // declare var homeurl:string;
  class LS {
    private _key:string = null;
    private _name:string = null;
    private _village:string = null;

    public randomString(len:number):string {
        // http://qiita.com/ryounagaoka/items/4736c225bdd86a74d59c
        var c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var cl = c.length;
        var r = "";
        for (var i = 0; i < len; i++) {
            r += c[Math.floor(Math.random()*cl)];
        }
        return r;
    };
    get key():string {
      if (!this._key) {
        var zinrokey:string = localStorage.getItem("zinrokey");
        if (!zinrokey) {
          let timekey = new Date().getTime().toString(16);
          let randomkey = this.randomString(16);
          zinrokey = timekey + randomkey;
          localStorage.setItem("zinrokey", zinrokey);
        }
        this._key = zinrokey;
      }
      return this._key;
    }
    set key(zinrokey:string) {
      localStorage.setItem("zinrokey", zinrokey);
      this._key = zinrokey;
    }
    get name():string {
      if (!this._name) {
        var zinroname:string = localStorage.getItem("zinroname");
        if (!zinroname) { zinroname = ""; }
        this._name = zinroname;
      }
      return this._name;
    }
    set name(zinroname:string) {
      localStorage.setItem("zinroname", zinroname);
      this._name = zinroname;
    }
    get village():string {
      if (!this._village) {
        var zinrovillage:string = localStorage.getItem("zinrovillage");
        if (!zinrovillage) { zinrovillage = null; }
        this._village = zinrovillage;
      }
      return this._village;
    }
    set village(zinrovillage:string) {
      localStorage.setItem("zinrovillage", zinrovillage);
      this._village = zinrovillage;
    }
  }

  type ClientData = {
    country: CountryStatus;
    village: VillageStatus;
    msgtbl: MessageTable;
  }

  class Client {
    public data: ClientData;
    private country_socket: Socket = null;
    private village_socket: Socket = null;
    constructor(public country_name:string, public zinrokey:string) {
      this.data = {
        country: null,
        village: null,
        msgtbl: null
      }
      this.initialize();
    };
    public initialize() {
      this.initData();
      this.initCountrySocket();
      this.fetchCountryStatus();
    }
    public initData() {
      var msgtbl:MessageTable = {
        villager: [],
        werewolf: [],
        sharer: []
      }
      var country:CountryStatus = {
        name: "人狼国",
        villages: []
      }
      var village:VillageStatus = {
        name: "",
        state: "廃村",
        phase: "吊",
        timelimit: 0,
        admin: null,
        setting: null
      }
      this.data = {
        msgtbl: msgtbl,
        country: country,
        village: village
      }
    }
    public initCountrySocket() {
      var $$ = this;
      var socket = <Socket>io.connect(`/countries/${this.country_name}`);
      socket.on("status", function(data:CountryStatus) {
        console.log(data);
        $$.data.country = data;
      })
      this.country_socket = socket;
    }
    public fetchCountryStatus() {
      let req:CountryStatusRequest = {
        key: this.zinrokey
      }
      this.country_socket.json.emit("status", req)
    }
    public initVillageSocket(village_name:string) {
      var $$ = this;
      var socket = <Socket>io.connect(`/villages/${village_name}`);
      socket.on("status", function(data:VillageStatus) {
        console.log(data);
        $$.data.village = data;
      })
      socket.on("message", function(data:ReceivedMessageData) {
        console.log(data);
        $$.data.msgtbl[data.room] = data.messages;
      })
      console.log(socket);
      this.village_socket = socket;
    }
    public fetchVillageStatus() {
      let req:VillageStatusRequest = {
        key: this.zinrokey
      }
      this.village_socket.json.emit("status", req);
    }
    public sendMessage(room:RoomName, text:string) {
      var msg:SendMessageData = {
        key: this.zinrokey,
        room: room,
        text: text
      }
      console.log(msg)
      this.village_socket.json.emit("message", msg);
    }
  }

  // グローバル変数　（村の状態とか会話履歴とか）
  var zls = new LS();
  var zclient = new Client("人狼国", zls.key)


  // ビュー
  var HeaderComponent = Vue.extend({
    template: `
      <nav id="navheader" class="navbar navbar-default navbar-static-top navbar-inverse">
        <div class="container">
          <div class="navbar-header">
            <a class="navbar-brand"><slot>人狼</slot></a>
          </div>
        </div>
      </nav>
    `
  })

  var IndexView = Vue.extend({
    // http://getbootstrap.com/components/#list-group
    components: {
      "z-header": HeaderComponent
    },
    template: `
      <div>
        <z-header>[[country.name]]</z-header>
        <div class="container">
          <div class="list-group">
            <a v-for="village in country.villages" track-by="name"
            href="#" class="list-group-item"
            @click="selectVillage(village)">
              <span>[[village.name]]</span>
              <span class="badge" :style="badgeStyle(village)">[[village.state]]</span>
            </a>
          </div>
        </div>
      </div>
    `,
    props: {
      zdata: Object
    },
    computed: {
      country: function() {
        let $$:ClientData = this.zdata;
        return $$.country;
      }
    },
    methods: {
      selectVillage: function(village:VillageStatus) {
        console.log(JSON.parse(JSON.stringify(village)));

        this.$dispatch('selectVillage', village);
      },
      badgeStyle: function(village:VillageStatus) {
        var style = {};
        switch(village.state) {
          case "廃村":
            style["background-color"] = "gray";
            break
          case "村民募集中":
            style["background-color"] = "blue";
            break
          case "戦闘中":
            style["background-color"] = "red";
            break
          case "終戦":
            style["background-color"] = "darkolivegreen";
            break
        }
        return style;
      }
    }
  })

  var InputComponent = Vue.extend({
    template: `
      <div class="form-group form-group-sm">
        <label :for="id" class="col-sm-2 control-label">[[label]]</label>
        <div class="col-sm-10">
          <input v-if='type=="number"' :id="id" :type="type" class="form-control" style="max-width:200px;" v-model="model" number>
          <input v-else :id="id" :type="type" class="form-control" style="max-width:200px;" v-model="model">
        </div>
      </div>
    `,
    props: {
      id: String,
      type: {
        type: String,
        default: "text"
      },
      label: String,
      model: [String, Number]
    }
  })

  var BuildView = Vue.extend({
    components: {
      "z-header": HeaderComponent,
      "z-input": InputComponent
    },
    template: `
      <div>
        <z-header>建村中</z-header>
        <div class="container">
          <form class="form-horizontal">
            <z-input id="name" label="村の名前" :model.sync="s.name"></z-input>
            <z-input id="daytime" label="昼時間（秒）" :model.sync="s.daytime" type="number"></z-input>
          </form>
        </div>
      </div>
    `,
    props: {
      zdata: Object
    },
    computed: {
      s: function():VillageSetting {
        let $$:ClientData = this.zdata;
        return $$.village.setting;
      }
    }
  })

  var ChatComponent = Vue.extend({
    filters: {
      "datefmt": function(value:number):string {
        let dd = new Date(value);
        let hours = `0${dd.getHours()}`.slice(-2);
        let minutes = `0${dd.getMinutes()}`.slice(-2);
        let seconds = `0${dd.getSeconds()}`.slice(-2);
        return `${hours}:${minutes}:${seconds}`
      }
    },
    template: `
      <div style="margin-bottom:10px;">
        <form @submit.prevent.stop="sendMessage()" role="form">
          <div class="input-group">
            <input type="text" class="form-control" v-model="text">
            <span class="input-group-btn">
              <button type="submit" class="btn btn-primary">投稿</button>
            </span>
          </div>
        </form>
      </div>
      <div v-for="msg in msgs | orderBy 'msgid' -1" track-by="msgid">
        <div style="position: relative;">
          <span>[[msg.name]]</span>
          <span class="pull-right" style="position: absolute; bottom: 0; right: 0; color:gray; font-size:xx-small;">[[msg.timestamp | datefmt]]</span>
        </div>
        <pre>[[msg.text]]</pre>
      </div>
    `,
    props: {
      zdata: zclient.data,
      zkey: zclient.zinrokey,
      room: String,
    },
    data: function() {
      return {
        text: ""
      }
    },
    computed: {
      msgs: function():Array<ReceivedMessage> {
        let $$:ClientData = this.zdata;
        return $$.msgtbl.villager
      }
    },
    methods: {
      sendMessage: function() {
        let $$:ClientData = this.zdata;
        if (this.text) {
          var msg:SendMessageData = {
            room: this.room,
            key: this.zkey,
            text: this.text
          };
          this.$dispatch('sendMessage', msg);
          this.text =  "";
        }
      }
    }
  })

  var AbandonedView = Vue.extend({
    template: `
      <div>
        <a>村を作ってください...</a>
      </div>
    `,
  })

  var VillagerChatView  = Vue.extend({
    components: {
      "z-header": HeaderComponent,
      "chat": ChatComponent
    },
    template: `
      <z-header>[[village.name]]</z-header>
      <div class="container">
        <chat room="villager" :zdata="zdata" :zkey="zkey"></chat>
      </div>
    `,
    props: {
      zdata: Object,
      zkey: String
    },
    computed: {
      village: function() {
        var $$:ClientData = this.zdata;
        return $$.village;
      }
    }
  })

  var vm_zinro = new Vue({
    el: "#zinro",
    components: {
      "Index": IndexView,
      "Build": BuildView,
      "Abandoned": AbandonedView,       // 廃村
      "VillagerChat": VillagerChatView  // 村会チャット
    },
    data: {
      zdata: zclient.data,
      zkey: zclient.zinrokey,
      zname: zls.name,
      select_village_name: ""
    },
    computed: {
      current_view: function():string {
        let $$:ClientData = this.zdata;
        if (!$$.village.name) {
          return "Index";
        }
        if ($$.village.state == "廃村") {
          return "Build";
        }
        //let v:string = zls.village;
        return "VillagerChat";
      },
      title: function():string {
        let $$:ClientData = this.zdata;
        if (!$$.village.name) {
          return $$.country.name;
        }
        return $$.village.name;
      }
    },
    methods: {
      connectVillage: function(name:string) {
        var socket = <Socket>io.connect(`/villages/${name}`);
        socket.on("message", function(data:ReceivedMessageData) {
          console.log(data);
          socket[data.room] = data.messages;
        })
        socket.on("status", function(data:VillageStatus) {
          console.log(data);
          // updateVillageStatus(data);
        })

      }
    },
    watch: {
      select_village_name: function(vname:string) { // 村の選択が変わったら接続し直し
        console.log(vname)
        if (vname) {
          zclient.initVillageSocket(vname);

          zclient.fetchVillageStatus();
        }
      }
    },
    events: {
      sendMessage: function(msg:SendMessageData) {
        zclient.sendMessage(msg.room, msg.text);
        // io_village.json.emit("message", msg);
        console.log(msg)
      },
      selectVillage: function(village:VillageStatus) {

        this.select_village_name = village.name;
      }
    }
  })
}
