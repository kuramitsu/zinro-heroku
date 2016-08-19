/// <reference path="../../typings/main.d.ts" />

// Zinro Logic
module ZinroClient {
  // declare var homeurl:string;
  interface Socket extends SocketIOClient.Socket {
    json: SocketIOClient.Socket;    // なんか定義されてないので追加しとく
  }
  type RoomName = "villager" | "werewolf" | "sharer";
  type SendMessageData = {
    village: string;
    room: RoomName;
    key: string;
    text: string;
  }
  type ReceivedMessage = {
    msgid: number;
    name: string;
    text: string;
  };
  type ReceivedMessageData = {
    room: RoomName,
    messages: Array<ReceivedMessage>
  };
  type MessageTable = {
    villager: Array<ReceivedMessage>;
    werewolf: Array<ReceivedMessage>;
  }
  function randomString(len:number):string {
      // http://qiita.com/ryounagaoka/items/4736c225bdd86a74d59c
      var c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      var cl = c.length;
      var r = "";
      for (var i = 0; i < len; i++) {
          r += c[Math.floor(Math.random()*cl)];
      }
      return r;
  };
  function getZinrokey():string {
      var zinrokey:string = localStorage.getItem("zinrokey");
      if (!zinrokey) {
          let timekey = new Date().getTime().toString(16);
          let randomkey = randomString(16);
          zinrokey = timekey + randomkey;
          localStorage.setItem("zinrokey", zinrokey);
      }
      return zinrokey
  }
  var zinrokey = getZinrokey();

  // var io_game:Socket = <Socket>io.connect("/game");
  var ChatComponent = Vue.extend({
    template: `
      <div>
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
        [[msg.name]]
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
        text: ""
      }
    },
    methods: {
      sendMessage: function() {
        var msg:SendMessageData = {
          village: this.village,
          room: this.room,
          key: zinrokey,
          text: this.text
        };
        this.$dispatch('sendMessage', msg);
        this.text =  "";
      }
    }
  })

  // グローバル変数　（村の状態とか会話履歴とか）
  var msgtbl:MessageTable = {
    villager: [],
    werewolf: []
  }
  var io_game:Socket = <Socket>io.connect("/villages/なかよし村");
  io_game.on("message", function(data:ReceivedMessageData) {
    // 履歴も含めて丸ごと受信 （実装が簡単だから）
    console.log(data);
    msgtbl[data.room] = data.messages;
  })

  // ビュー
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
    data: function(){ return {msgtbl: msgtbl}; },
    computed: {
      msgs: function() { return this.msgtbl.villager; }
    }
  })

  /*
  var ZinroComponent = Vue.extend({
    components: {
      "chat": ChatComponent
    },
    events: {
      sendMessage: function(msg:SendMessageData) {
        io_game.json.emit("message", msg);
        console.log(msg)
      }
    }
  });
  */

  var vm_zinro = new Vue({
    el: "#zinrochat",
    components: {
      "chat": ChatComponent,
      "Abandoned": AbandonedView,       // 廃村
      "VillagerChat": VillagerChatView  // 村会チャット
    },
    data: {
      village: "なかよし村",
      currentView: 'VillagerChat'
    },
    events: {
      sendMessage: function(msg:SendMessageData) {
        io_game.json.emit("message", msg);
        console.log(msg)
      }
    }
  })



  type GameState = "廃村" | "村民募集中" | "戦闘中" | "終戦";
  type CombatPhase = "昼" | "吊" | "夜" | "噛";
  export type VillageData = {    // VueとClassを併用するためにデータの階層を1つ作る
    state: GameState;
    phase: CombatPhase;
    timelimit: number;
  }
  export class Village {
    public data: VillageData = {
      state: undefined,
      phase: undefined,
      timelimit: undefined
    };
    constructor() {
      this.initialize();
    };
    public initialize() {
      this.data.state = "廃村";
      this.data.phase = "吊";
      this.data.timelimit = 0;
    }
  }
}

// Zinro View with vue.js
module ZinroView {
  //　外部から参照したいデータとか定義しとく
  interface ZinroVue extends vuejs.Vue {
    data: ZinroClient.VillageData;
  }
  var village = new ZinroClient.Village();
  console.log(village);
  var vm_header = <ZinroVue>(new Vue({
    el: "#navheader",
    data: {
      data: village.data,    // ZinroClient.VillageData
      compiled: false
    },
    computed: {           // ショートカット
      state: function() {
        return this.data.state;
      },
      phase: function() {
        return this.data.pahse;
      },
      timelimit: function() {
        return this.data.timelimit;
      }
    },
    compiled: function() {
      this.compiled = true;
    }
  }));
  vm_header.$log("data");
  console.log(vm_header.data.state);

}


/*
var vm_chat = new Vue({
  el: "#chattest",
  data: {
    state: gState,
    alltext: ""
  },
  computed: {
    msgs: {
      get: function() {return this.state.msgs;},
      set: function(val) {this.state.msgs = val;}
    }
  },
  methods: {
    sendAll: function() {
      io_game.json.emit("villager", {msg: this.alltext});
      console.log(this.alltext);
    }
  }
})
*/
