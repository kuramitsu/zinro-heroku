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

  var zls = new LS();
  var zinrokey = zls.key;

  // var io_game:Socket = <Socket>io.connect("/game");

  // グローバル変数　（村の状態とか会話履歴とか）
  var g_msgtbl:MessageTable = {
    villager: [],
    werewolf: [],
    sharer: []
  }
  var g_c_status:CountryStatus = {
    name: "",
    villages: []
  }
  var io_country = <Socket>io.connect("/countries/人狼国");
  io_country.on("status", function(data:CountryStatus) {
    console.log(data);
    g_c_status.name = data.name;
    g_c_status.villages = data.villages;
  })
  var csrequest:CountryStatusRequest = {
    key: zinrokey
  }
  io_country.json.emit("status", csrequest)

  /*
  var io_game:Socket = <Socket>io.connect("/villages/なかよし村");
  io_game.on("message", function(data:ReceivedMessageData) {
    // 履歴も含めて丸ごと受信 （実装が簡単だから）
    console.log(data);
    g_msgtbl[data.room] = data.messages;
  })
  */

  var g_v_status:VillageStatus = {
    name: "",
    state: "廃村",
    phase: "吊",
    timelimit: 0,
    admin: null
  }
  function updateVillageStatus(status:VillageStatus) {
    g_v_status.name = status.name;
    g_v_status.state = status.state;
    g_v_status.phase = status.phase;
    g_v_status.timelimit = status.timelimit;
    g_v_status.admin = status.admin;
  }
  var io_village:Socket = null;


  // ビュー
  var IndexVue = Vue.extend({
    template: `
      <div>
        <table class="table">
          <thead>
            <tr>
              <th>村名</th><th>状態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="village in villages" track-by="name" @click="selectVillage(village)">
              <td>[[village.name]]</td>
              <td>[[village.state]]</td>
            </tr>
          </tbody>
        </table>
      </div>
    `,
    data: function() {
      return {
          c_status: g_c_status
      }
    },
    computed: {
      country_name: function() {
        let c_status:CountryStatus = this.c_status;
        return c_status.name;
      },
      villages: function() {
        let c_status:CountryStatus = this.c_status;
        return c_status.villages;
      }
    },
    methods: {
      selectVillage: function(village:VillageStatus) {
        this.$dispatch('selectVillage', village.name);
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
      village: String,
      room: String,
      msgs: Array
    },
    data: function() {
      return {
        text: "",
        key: zinrokey
      }
    },
    methods: {
      sendMessage: function() {
        var msg:SendMessageData = {
          room: this.room,
          key: this.key,
          text: this.text
        };
        this.$dispatch('sendMessage', msg);
        this.text =  "";
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
    components: { "chat": ChatComponent },
    template: '<chat :village="village" room="villager" :msgs="msgs"></chat>',
    props: { village: String },
    data: function(){ return {msgtbl: g_msgtbl}; },
    computed: {
      msgs: function() { return this.msgtbl.villager; }
    }
  })

  var vm_zinro = new Vue({
    el: "#zinro",
    components: {
      "index": IndexVue,
      "chat": ChatComponent,
      "Abandoned": AbandonedView,       // 廃村
      "VillagerChat": VillagerChatView  // 村会チャット
    },
    data: {
      country_status: g_c_status,
      village_status: g_v_status,
      userkey: zls.key,
      username: zls.name,
      select_village: zls.village
    },
    computed: {
      current_view: function():string {
        let village:string = this.select_village;
        if (!village) {
          return "index";
        }
        //let v:string = zls.village;
        return "VillagerChat";
      }
    },
    methods: {
      connectVillage: function(name:string) {
        io_village = <Socket>io.connect(`/villages/${name}`);
        io_village.on("message", function(data:ReceivedMessageData) {
          console.log(data);
          g_msgtbl[data.room] = data.messages;
        })
        io_village.on("status", function(data:VillageStatus) {
          console.log(data);
          updateVillageStatus(data);
        })
      }
    },
    watch: {
      select_village: function(vname:string) { // 村の選択が変わったら接続し直し
        console.log(vname)
        if (vname) {
          this.connectVillage(vname);
          io_village.json.emit("status", {key: this.userkey});
        }
      }
    },
    events: {
      sendMessage: function(msg:SendMessageData) {
        io_village.json.emit("message", msg);
        console.log(msg)
      },
      selectVillage: function(vname:string) {
        this.select_village = vname;
      }
    }
  })
}
