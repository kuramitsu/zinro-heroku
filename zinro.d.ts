interface Socket extends SocketIOClient.Socket {
  json: SocketIOClient.Socket;    // なんか定義されてないので追加しとく
}
type RoomName = "villager" | "werewolf" | "sharer";
type SendMessageData = {
  room: RoomName;
  key: string;
  text: string;
}
type ReceivedMessage = {
  msgid: number;
  timestamp: number;
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
  sharer: Array<ReceivedMessage>;
};


// 村の状態
type VillageState = "廃村" | "村民募集中" | "戦闘中" | "終戦";
type CombatPhase = "昼" | "吊" | "夜" | "噛";
type VillageStatus = {    // VueとClassを併用するためにデータの階層を1つ作る
  name: string;
  state: VillageState;
  phase: CombatPhase;
  timelimit: number;
  admin: boolean;         // 村の管理者の場合はTrue
}
type Role = "村人" | "人狼" | "占い師" | "狂人"  | "狩人" | "霊能者" | "共有者" | "妖狐"
type VillagerStatus = {
  name: string;
  alive: boolean;
  role?: Role;      // キーが一致する場合のみ取得可能
}

type CountryStatusRequest = {
  key: string;
}
type CountryStatus = {   // クライアントに返すデータ
  name: string;
  villages: Array<VillageStatus>;  // villageがnullのとき
}
