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
    my: VillagerStatus;
  }

  class Client {
    public data: ClientData;
    private country_socket: Socket = null;
    private village_socket: Socket = null;
    constructor(public country_name:string, public zinrokey:string, myname:string="") {
      this.data = {
        msgtbl: null,
        country: null,
        village: null,
        my: null
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
        villagers: [],
        state: "廃村",
        phase: "吊",
        timelimit: 0,
        admin: null,
        setting: null
      }
      var my:VillagerStatus = {
        name: "",
        alive: null,
        role: null
      }
      this.data.msgtbl = msgtbl;
      this.data.country = country;
      this.data.village = village;
      this.data.my = my;
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
      socket.on("villager_status", function(data:VillagerStatus) {
        console.log(data);
        $$.data.my = data;
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
    public buildVillage(setting:VillageSetting) {
      let req:BuildVillageRequest = {
        key: this.zinrokey,
        setting: setting
      }
      console.log(req);
      this.village_socket.json.emit("buildVillage", req);
    }
    public joinVillage(joinname:string) {
      let req:JoinVillageRequest = {
        key: this.zinrokey,
        name: joinname
      }
      console.log(req);
      this.village_socket.json.emit("joinVillage", req);
    }
  }

  // グローバル変数　（村の状態とか会話履歴とか）
  var zls = new LS();
  var zclient = new Client("人狼国", zls.key)
  var zroles = [
    '村人', '占い師', '狂人', '狩人', '霊能者', '共有者',
    '人狼',
    '妖狐'
  ];
  var zfamilymap:{[key:string]:Family} = {
    '村人': "人",
    '占い師': "人",
    '狂人': "人",
    '狩人': "人",
    '霊能者': "人",
    '共有者': "人",
    '人狼': "狼",
    '妖狐': "狐"
  }
  zclient.data.my.name = zls.name;

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
          <input v-if='type=="number"' :id="id" :type="type" class="form-control" style="max-width:200px;" v-model="model" number :min="min" :step="step">
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
      model: [String, Number],
      min: Number,
      step: {
        type: Number,
        default: 1
      }
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
          <form class="form-horizontal" @submit.prevent="buildVillage()">
            <z-input id="name" label="村の名前" :model.sync="s.name"></z-input>
            <z-input id="daytime" label="昼時間（秒）" :model.sync="s.daytime" type="number" :min="1"></z-input>
            <z-input id="nighttime" label="夜時間（秒）" :model.sync="s.nighttime" type="number" :min="1"></z-input>
            <z-input id="hangtime" label="吊時間（秒）" :model.sync="s.hangtime" type="number" :min="1"></z-input>
            <z-input id="bitetime" label="噛時間（秒）" :model.sync="s.bitetime" type="number" :min="1"></z-input>
            <div class="form-group form-group-sm">
              <label for="inputVillageRoles" class="col-sm-2 control-label">構成員</label>
              <div class="col-sm-10 form-inline">
                <div class="col-sm-2" v-for="role in roles">
                <label :for="role" class="control-label">[[role]]</label>
                <input :id="role" type="number" class="form-control" style="max-width:50px; margin-right:5px;" v-model="s.rolenum[role]" number min=0>
                </div>
              </div>
            </div>
            <div class="form-group form-group-sm">
              <div class="col-sm-offset-2 col-sm-10">
                <div class="checkbox">
                  <label>
                    <input id="firstnpc" type="checkbox" v-model="s.firstnpc"> 初日NPC &nbsp;
                  </label>
                  <label>
                    <input id="roledeath" type="checkbox" v-model="s.roledeath"> 初日役職死 &nbsp;
                  </label>
                  <label>
                    <input id="zombie" type="checkbox" v-model="s.zombie"> ゾンビ
                  </label>
                </div>
              </div>
            </div>
            <div class="form-group form-group-sm">
              <div class="col-sm-offset-2 col-sm-10">
                <button v-show="errors.length == 0" type="submit" class="btn btn-primary">村を作る！</button>
                <button v-show="errors.length > 0" class="btn btn-primary disabled" @click.prevent="">村を作る！</button>
                <ul style="color:red">
                  <li v-for="error in errors">[[error]]</li>
                </ul>
              </div>
            </div>
          </form>
          <pre>[[s|json]]</pre>
        </div>
      </div>
    `,
    props: {
      zdata: Object
    },
    data: function() {
      return {
        roles: zroles
      }
    },
    computed: {
      s: function():VillageSetting {
        let $$:ClientData = this.zdata;
        return $$.village.setting;
      },
      humannum: function():number {
        let $$:ClientData = this.zdata;
        let roles:Array<Role> = this.roles;
        let rnum = $$.village.setting.rolenum;
        let humannum = 0;
        for (let role of roles) {
          if (zfamilymap[role] == "人") {
            humannum += rnum[role];
          }
        }
        return humannum;
      },
      wolfnum: function():number {
        let $$:ClientData = this.zdata;
        let rnum = $$.village.setting.rolenum;
        return rnum.人狼;
      },
      errors: function():Array<string> {
        let $$:ClientData = this.zdata;
        let s = $$.village.setting;
        let humannum:number = this.humannum;
        let wolfnum:number = this.wolfnum;
        var errors:Array<string> = [];

        if (!s.name) errors.push("村の名前がありません。");
        if (wolfnum < 1) errors.push("人狼がいません。");
        if (humannum <= wolfnum + 1) errors.push("人間が少なすぎます。");
        if (s.daytime < 1) errors.push("昼の時間が短すぎます。");
        if (s.nighttime < 1) errors.push("夜の時間が短すぎます。");
        if (s.hangtime < 1) errors.push("吊る時間が短すぎます。");
        if (s.bitetime < 1) errors.push("噛む時間が短すぎます。");

        return errors;
      }
    },
    methods: {
      buildVillage: function() {
        let setting:VillageSetting = JSON.parse(JSON.stringify(this.s));
        this.$dispatch('buildVillage', setting);
      }
    }
  })

  var RecruitView = Vue.extend({
    components: {
      "z-header": HeaderComponent,
      "z-input": InputComponent
    },
    template: `
      <div>
        <z-header>村民募集中... 後 [[recruitnum]] 人！ （[[timelimit]]秒）</z-header>
        <div class="container">
          <div v-show="myrole">
            [[myname]]さんの役職は…「[[myrole]]」です！
          </div>
          <form v-show="!myrole" class="form-horizontal" @submit.prevent="joinVillage()">
            <z-input id="myname" label="お名前" :model.sync="myname"></z-input>
            <div class="form-group form-group-sm">
              <div class="col-sm-offset-2 col-sm-10">
                <button v-show="errors.length == 0" type="submit" class="btn btn-primary">住居申請</button>
                <button v-show="errors.length > 0" class="btn btn-primary disabled" @click.prevent="">住居申請</button>
                <ul style="color:red">
                  <li v-for="error in errors">[[error]]</li>
                </ul>
              </div>
            </div>
          </form>

          <hr>

          <h4>村民一覧</h4>
          <ul>
            <li v-for="v in villagers">[[v.name]]</li>
          </ul>

          <hr>
          <h4>役職一覧</h4>
          <ul>
            <li v-for="(role, num) in s.rolenum" v-show="num > 0">
              [[role]]: [[num]]人
            </li>
          </ul>
        </div>
      </div>
    `,
    props: {
      zdata: Object,
      zname: String
    },
    data: function() {
      return {
        myname: JSON.parse(JSON.stringify(this.zname))
      };
    },
    computed: {
      s: function():VillageSetting {
        let $$:ClientData = this.zdata;
        return $$.village.setting;
      },
      villagers: function():Array<VillagerStatus> {
        let $$:ClientData = this.zdata;
        return $$.village.villagers;
      },
      myrole: function():Role {
        let $$:ClientData = this.zdata;
        return $$.my.role;
      },
      errors: function():Array<string> {
        var errors:Array<string> = [];
        if (!this.myname) errors.push("お名前が空です");
        return errors;
      },
      recruitnum: function():number {
        return 10;
      },
      timelimit: function():number {
        return 300;
      }
    },
    methods: {
      joinVillage: function() {
        let joinname:string = this.myname;
        this.$dispatch('joinVillage', joinname);
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
      "Recruit": RecruitView,
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
        } else {
          if ($$.village.state == "廃村") {
            return "Build";
          } else if ($$.village.state == "村民募集中") {
            return "Recruit";
          }
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
        zls.village = village.name;
      },
      buildVillage: function(setting:VillageSetting) {
        zclient.buildVillage(setting);
      },
      joinVillage: function(joinname:string) {
        zclient.joinVillage(joinname);
        zls.name = joinname;
      }
    },
    ready: function() {
      // 初期ステータスの取得
      if (zls.village) {
        this.select_village_name = zls.village;
      }
    }
  })
}
