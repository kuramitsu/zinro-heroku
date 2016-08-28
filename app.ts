/// <reference path="typings/main.d.ts" />
/// <reference path="zinro.d.ts" />

//declare function require(name:string);
var ECT = require('ect');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var ios:SocketIO.Server = require('socket.io')(server);
var bodyParser = require('body-parser');

var static_url:string = (process.env.STATIC_URL || __dirname);
var port:number = (process.env.PORT || 5000);


// http://qiita.com/sukobuto/items/b0be22bfebd721854e0b
app.engine('ect', ECT({ watch: true, root: `${__dirname}/views`, ext: '.ect' }).render);
app.set('view engine', 'ect');

// app.use(static_url, express.static('/public'));
app.use(express.static(`${__dirname}/public`));
app.use(express.static(`${__dirname}/bower_components`));

// app.use(static_url, express.static('static'));

// http://qiita.com/K_ichi/items/c70bf4b08467717460d5
// https://github.com/expressjs/body-parser
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


module Zinro {
  var zroles = [
    '村人', '占い師', '狂人', '狩人', '霊能者', '共有者',
    '人狼',
    '妖狐'
  ];
  var zroletbl:{[key:string]:RoleDetail} = {
    '村人': {
      family: '人',
      camp: '人',
      divination: '村人'
    },
    '占い師': {
      family: '人',
      camp: '人',
      divination: '村人'
    },
    '狂人': {
      family: '人',
      camp: '人',
      divination: '村人'
    },
    '狩人': {
      family: '人',
      camp: '人',
      divination: '村人'
    },
    '霊能者': {
      family: '人',
      camp: '人',
      divination: '村人'
    },
    '共有者': {
      family: '人',
      camp: '人',
      divination: '村人'
    },
    '人狼': {
      family: '人',
      camp: '人',
      divination: '村人'
    },
    '妖狐': {
      family: '人',
      camp: '人',
      divination: '村人'
    }
  }
  function isInteger(o:any):boolean {
    if (typeof o == "number" && parseInt(<any>o) === o) return true;
    return false;
  }
  function isString(o:any, minlen=0):boolean {
    if (typeof o == "string" && o.length >= minlen) return true;
    return false;
  }
  function isBoolean(o:any):boolean {
    if (typeof o == "boolean") return true;
    return false;
  }

  function validVillageSetting(s:VillageSetting):boolean {
    let wolfnum:number = s.rolenum.人狼;
    let humannum:number = 0;
    for (let i = 0, len = zroles.length; i < len; i++) {
      let role = zroles[i];
      if (zroletbl[role].family == "人") humannum += 1;
    }
    var errors:Array<string> = [];
    // 型チェック
    if (!isString(s.name)) errors.push("nameの型が不正");
    if (!isInteger(s.daytime)) errors.push("daytimeの型が不正");
    if (!isInteger(s.nighttime)) errors.push("nighttimeの型が不正");
    if (!isInteger(s.hangtime)) errors.push("hangtimeの型が不正");
    if (!isInteger(s.bitetime)) errors.push("bitetimeの型が不正");
    if (!isInteger(s.endtime)) errors.push("endtimeの型が不正");
    if (s.rolenum) {
      for (let i = 0, len = zroles.length; i < len; i++) {
        let role = zroles[i];
        if (!isInteger(s.rolenum[role])) errors.push("rolenumの型が不正");
      }
    } else {
      errors.push("rolenumの型が不正");
    }
    if (!isBoolean(s.firstnpc)) errors.push("firstnpcの型が不正");
    if (!isBoolean(s.roledeath)) errors.push("roledeathの型が不正");
    if (!isBoolean(s.zombie)) errors.push("zombieの型が不正");

    if (errors.length > 0) {
      console.log(errors);
      return false;
    }

    // 値チェック
    if (!s.name) errors.push("村の名前がありません。");
    if (wolfnum < 1) errors.push("人狼がいません。");
    if (humannum <= wolfnum + 1) errors.push("人間が少なすぎます。");
    if (s.daytime < 1) errors.push("昼の時間が短すぎます。");
    if (s.nighttime < 1) errors.push("夜の時間が短すぎます。");
    if (s.hangtime < 1) errors.push("吊る時間が短すぎます。");
    if (s.bitetime < 1) errors.push("噛む時間が短すぎます。");

    if (errors.length > 0) {
      console.log(errors);
      return false;
    }
    return true;
  }

  class Villager {
    public key:string;
    public name:string;
    public role:Role;
    public alive: boolean;
    // public votetargets
    constructor(key:string, name:string, role:Role) {
      this.key = key;
      this.name = name;
      this.role = role;
      this.alive = true;
    };
    public getStatus(zinrokey:string):VillagerStatus {
      return {
        name: this.name,
        alive: this.alive,
        role: (zinrokey == this.key) ? this.role : null
      }
    }
  }
  class Village {
    private state: VillageState;
    private phase: CombatPhase;
    private timelimit: number;
    private villagers: Array<Villager>;
    private keymap: {[key:string]:Villager};
    private namemap: {[key:string]:Villager};

    //private villagers
    public msgtbl:MessageTable = {
      villager: [],
      werewolf: [],
      sharer: []
    };
    private io:SocketIO.Namespace;

    constructor(public id, public country:Country, public setting:VillageSetting, public adminkey:string) {
      this.initialize();
    };
    get name():string {
      return this.setting.name;
    }
    public initialize() {
      this.state = "廃村";
      this.phase = "吊";
      this.timelimit = 0;
      this.villagers = [];
      this.keymap = {};
      this.namemap = {};
      this.clearMessageTable();
      this.initSocket();
    };
    private initSocket() {
      var $$:Village = this;
      $$.io = ios.of(`/villages/${this.id}`);
      $$.io.on("connection", function(socket) {
        function send_messages(room:RoomName) {
          socket.join(room);
          let messages:Array<ReceivedMessage> = $$.msgtbl[room];
          let data:ReceivedMessageData = {
            room: room,
            messages: messages
          }
          $$.io.to(room).emit("message", data);
        }
        socket.on("message", function(data:SendMessageData) {
          console.log(data);
          let room = data.room;   //
          let key = data.key;     // ブラウザごとに保存されたユニークな値
          let text = data.text;
          if ($$.sayInRoom(room, key, text)) {
            send_messages(room);
          }
        });
        socket.on("status", function(data:VillageStatusRequest) {
          console.log(data);
          var village_status = $$.getStatus(data.key);
          console.log(village_status);
          socket.json.emit("status", village_status);

          let villager:Villager = $$.keymap[data.key];
          if (villager) {   // すでに参加してるとき
            // villagerStatusを本人に返す
            let villager_status:VillagerStatus = villager.getStatus(data.key);
            socket.json.emit("villager_status", villager_status);
          }
        });
        socket.on("buildVillage", function(data:BuildVillageRequest) {
          console.log(data);
          if ($$.state == "廃村" && validVillageSetting(data.setting)) {
            // socketを一旦破棄？

            $$.adminkey = data.key;
            $$.setting = data.setting;
            $$.state = "村民募集中";
            $$.timelimit = 300;
            // 村の情報更新を周知
            var status = $$.getStatus(data.key);
            $$.io.json.emit("status", status);
            // 国の情報更新を周知
            var country_status = $$.country.getCountryStatus("");
            console.log(country_status);
            $$.country.io.json.emit("status", country_status);
          }
        });
        socket.on("joinVillage", function(data:JoinVillageRequest) {
          let villager:Villager = $$.addVillager(data.key, data.name);
          if (villager) {   // 追加できたとき
            // villagerStatusを本人に返す
            let villager_status:VillagerStatus = villager.getStatus(data.key);
            socket.json.emit("villager_status", villager_status);
            // villageStatusを全員に返す
            let village_status:VillageStatus = $$.getStatus("");
            $$.io.json.emit("status", village_status);
          }
        });
      })
    };
    private clearMessageTable() {
      this.msgtbl.villager = [];
      this.msgtbl.werewolf = [];
      this.msgtbl.sharer = [];
    }

    public getVillagerStatuses():Array<VillagerStatus> {
      var statuses:Array<VillagerStatus> = [];
      for (let i=0, len=this.villagers.length; i < len; i++) {
        let villager = this.villagers[i];
        let status = villager.getStatus("");
        statuses.push(status);
      }
      return statuses;
    }
    public getAdminName():string {
      var admin = this.getVillager(this.adminkey);
      if (admin) {
        return admin.name;
      }
      return "";
    };
    public getStatus(zinrokey:string):VillageStatus {
      return {
        id: this.id,
        name: this.name,
        state: this.state,
        phase: this.phase,
        villagers: this.villagers,
        timelimit: this.timelimit,
        admin: this.getAdminName(),
        setting: this.setting
      }
    };
    public getVillager(key):Villager {
      // todo
      var v:Villager = new Villager("", "takuma", "村人");
      return v;
    };
    public addVillager(key:string, name:string):Villager {
      if (!key || !name) {
        return null;
      }
      if (this.keymap.hasOwnProperty(key) || this.namemap.hasOwnProperty(name)) {
        return null;
      }
      let role:Role = this.getRole();
      if (!role) {
        return null;
      }
      let v:Villager = new Villager(key, name, role);
      this.villagers.push(v);
      this.keymap[key] = v;
      this.namemap[name] = v;
      return v;
    };
    public getRole():Role {
      return "村人";
    };
    public checkChatUser(room:RoomName, villager:Villager):boolean {
      // ユーザーに発言権があるか確認する
      if (room == "villager") {
          return true;
      }
      return false;
    };
    private getTimestamp():number {
      let dd = new Date();
      return dd.getTime();
    };
    public sayInRoom(room:RoomName, zinrokey:string, text:string):Boolean {
      let v = this.getVillager(zinrokey);
      if (this.checkChatUser(room, v) && text) {
        let messages:Array<ReceivedMessage> = this.msgtbl[room];
        let new_msg:ReceivedMessage = {
          msgid: messages.length,
          timestamp: this.getTimestamp(),
          name: v.name,
          text: text
        };
        messages.push(new_msg);
        return true;
      }
      return false;
    }
  }


  type CountryStatusRequest = {
    key: string;
  }
  type CountryStatus = {   // クライアントに返すデータ
    name: string;
    villages: Array<VillageStatus>;  // villageがnullのとき
  }

  class Country {
    private villages:Array<Village>;
    private namemap:{[key:string]:Village};    // name => village
    public io:SocketIO.Namespace;

    constructor(public name:string) {
      this.initialize();
    };
    public initialize() {
      this.villages = [];
      this.namemap = {};
      this.initSocket();
    };
    private initSocket() {
      var $$:Country = this;
      $$.io = ios.of(`/countries/${this.name}`);
      $$.io.on("connection", function(socket) {
        socket.on("status", function(data:SendMessageData) {
          console.log(data);
          var status = $$.getCountryStatus(data.key);
          console.log(status);
          socket.json.emit("status", status);
        })
      })
    };
    public addVillage(adminkey:string, setting:VillageSetting):Village {
      if (this.namemap.hasOwnProperty(setting.name)) { return null; }
      var country:Country = this;
      var id:string = this.villages.length.toString();
      var village:Village = new Village(id, country, setting, adminkey);
      this.villages.push(village);
      this.namemap[setting.name] = village;
      return village;
    }
    public deleteVillage(name:string) {
      var village:Village = this.namemap[name];
      delete this.namemap[name];
      let idx = this.villages.indexOf(village);
      if (idx >= 0) {
        this.villages.splice(idx, 1);
      }
    }
    public getVillageStatuses(key:string):Array<VillageStatus> {
      var statuses:Array<VillageStatus> = [];
      for (let i=0, len=this.villages.length; i < len; i++) {
        var v:Village = this.villages[i];
        statuses.push(v.getStatus(key));
      }
      return statuses
    }
    public getCountryStatus(key:string):CountryStatus {
      return {
        name: this.name,
        villages: this.getVillageStatuses(key)
      };
    }
  }
  var country = new Country("人狼国");

  country.addVillage("", {
    name: "素人村",
    daytime: 180, nighttime: 60, hangtime: 10, bitetime: 10, endtime: 600,
    rolenum: {
      村人: 1, 人狼: 1, 占い師: 1, 狂人: 1, 狩人: 0, 霊能者: 0, 共有者: 0, 妖狐: 0
    },
    firstnpc: true, roledeath: true, zombie: true
  });
  country.addVillage("", {
    name: "一般村",
    daytime: 180, nighttime: 60, hangtime: 10, bitetime: 10, endtime: 600,
    rolenum: {
      村人: 1, 人狼: 1, 占い師: 1, 狂人: 1, 狩人: 0, 霊能者: 0, 共有者: 0, 妖狐: 0
    },
    firstnpc: true, roledeath: true, zombie: true
  });
  country.addVillage("", {
    name: "玄人村",
    daytime: 180, nighttime: 60, hangtime: 10, bitetime: 10, endtime: 600,
    rolenum: {
      村人: 1, 人狼: 1, 占い師: 1, 狂人: 1, 狩人: 0, 霊能者: 0, 共有者: 0, 妖狐: 0
    },
    firstnpc: true, roledeath: true, zombie: true
  });

}

app.get('/', function(request, response) {
  response.render('pages/zinro');
});
//app.get('/chat', function(request, response) {
//  response.render('pages/chat');
//});



server.listen(port, function () {
    var port = server.address().port;
    console.log('Example app listening port %s', port);
});
