const EN_ADJECTIVES = [
  "Happy", "Brave", "Clever", "Swift", "Gentle",
  "Mighty", "Calm", "Bright", "Bold", "Lucky",
  "Tiny", "Grand", "Fierce", "Noble", "Jolly",
  "Witty", "Keen", "Proud", "Quick", "Warm",
  "Cool", "Shy", "Wild", "Free", "Wise",
  "Kind", "Strong", "Sleepy", "Silly", "Fuzzy",
  "Lively", "Eager", "Mellow", "Daring", "Playful",
  "Sneaky", "Rapid", "Quiet", "Cheerful", "Humble",
  "Peppy", "Zesty", "Cozy", "Giddy", "Fancy",
  "Nimble", "Plucky", "Spry", "Sturdy", "Vivid",
  "Rosy", "Feisty", "Perky", "Breezy", "Zippy",
  "Snappy", "Cuddly", "Sparkly", "Fluffy", "Bouncy",
  "Golden", "Silver", "Cosmic", "Starry", "Sunny",
  "Frosty", "Misty", "Dusty", "Sandy", "Stormy",
  "Fiery", "Crystal", "Shadow", "Thunder", "Velvet",
  "Rustic", "Dapper", "Groovy", "Funky", "Jazzy",
  "Savvy", "Crafty", "Nifty", "Dandy", "Sassy",
  "Swanky", "Snazzy", "Spunky", "Stellar", "Epic",
  "Mega", "Super", "Turbo", "Ultra", "Royal",
  "Magic", "Fearless", "Valiant", "Radiant", "Glowing",
];

const EN_ANIMALS = [
  "Tiger", "Panda", "Eagle", "Dolphin", "Fox",
  "Wolf", "Bear", "Hawk", "Owl", "Deer",
  "Rabbit", "Otter", "Whale", "Falcon", "Lion",
  "Koala", "Parrot", "Turtle", "Penguin", "Lynx",
  "Jaguar", "Raven", "Swan", "Crane", "Gecko",
  "Puma", "Bison", "Moose", "Elk", "Heron",
  "Cobra", "Viper", "Shark", "Squid", "Coral",
  "Finch", "Robin", "Wren", "Dove", "Jay",
  "Frog", "Toad", "Newt", "Crab", "Clam",
  "Seal", "Mink", "Stoat", "Badger", "Ferret",
  "Lemur", "Tapir", "Sloth", "Ibis", "Stork",
  "Quail", "Goose", "Lark", "Mole", "Shrew",
  "Chipmunk", "Hedgehog", "Panther", "Cheetah", "Leopard",
  "Zebra", "Giraffe", "Hippo", "Rhino", "Gorilla",
  "Monkey", "Toucan", "Pelican", "Flamingo", "Peacock",
  "Salmon", "Trout", "Marlin", "Beetle", "Cricket",
  "Mantis", "Firefly", "Chameleon", "Iguana", "Starfish",
  "Lobster", "Oyster", "Octopus", "Narwhal", "Walrus",
  "Coyote", "Jackal", "Hyena", "Gazelle", "Impala",
  "Osprey", "Condor", "Bobcat", "Cougar", "Mustang",
];

const TH_ADJECTIVES = [
  "สุข", "กล้า", "ฉลาด", "ว่องไว", "อ่อนโยน",
  "แกร่ง", "สงบ", "สดใส", "กล้าหาญ", "โชคดี",
  "จิ๋ว", "ยิ่งใหญ่", "ดุ", "สูงศักดิ์", "ร่าเริง",
  "เฉียบ", "ไว", "ภูมิใจ", "รวดเร็ว", "อบอุ่น",
  "เท่", "ขี้อาย", "ป่า", "อิสระ", "ปราชญ์",
  "ใจดี", "แข็งแรง", "ง่วง", "ขี้เล่น", "ปุย",
  "คึกคัก", "กระตือรือร้น", "นุ่มนวล", "บ้าบิ่น", "สนุก",
  "แอบ", "เร็ว", "เงียบ", "สดชื่น", "ถ่อมตน",
  "คล่อง", "จี๊ด", "อุ่น", "เริงร่า", "หรู",
  "ปราด", "มุ่งมั่น", "กระฉับกระเฉง", "ทน", "เจิดจ้า",
  "ชมพู", "เปรี้ยว", "สดสวย", "โปร่ง", "ซิ่ง",
  "ฉับไว", "น่ารัก", "ระยิบ", "นุ่ม", "สะท้อน",
  "ทอง", "เงิน", "จักรวาล", "ดาว", "แดด",
  "หนาว", "หมอก", "ฝุ่น", "ทราย", "พายุ",
  "ไฟ", "แก้ว", "เงา", "ฟ้าร้อง", "กำมะหยี่",
  "ชนบท", "เนี้ยบ", "เก๋", "เฟี้ยว", "แจ๊ส",
  "เชี่ยว", "แสบ", "เก่ง", "เริด", "ซ่า",
  "หล่อ", "เลิศ", "เด็ด", "เฉิดฉาย", "มหากาฬ",
  "จ้าว", "สุดยอด", "เทอร์โบ", "อัลตร้า", "ราช",
  "พลัง", "หาญ", "เกรียงไกร", "เรือง", "เปล่งปลั่ง",
];

const TH_ANIMALS = [
  "เสือ", "แพนด้า", "อินทรี", "โลมา", "จิ้งจอก",
  "หมาป่า", "หมี", "เหยี่ยว", "นกฮูก", "กวาง",
  "กระต่าย", "นาก", "วาฬ", "เหยี่ยวเพเรกริน", "สิงโต",
  "โคอาล่า", "นกแก้ว", "เต่า", "เพนกวิน", "แมวป่า",
  "จากัวร์", "อีกา", "หงส์", "นกกระเรียน", "ตุ๊กแก",
  "พูม่า", "กระทิง", "มูส", "กวางเอลก์", "นกกระสา",
  "งูเห่า", "งูพิษ", "ฉลาม", "หมึก", "ปะการัง",
  "นกจาบคา", "นกโรบิน", "นกจับแมลง", "นกเขา", "นกเจย์",
  "กบ", "คางคก", "ซาลาแมนเดอร์", "ปู", "หอย",
  "แมวน้ำ", "มิงค์", "เพียงพอน", "แบดเจอร์", "เฟอร์เรต",
  "ลีเมอร์", "สมเสร็จ", "สลอท", "นกช้อนหอย", "นกกระสาขาว",
  "นกคุ่ม", "ห่าน", "นกจ้อ", "ตุ่น", "หนูผี",
  "กระรอก", "เม่น", "เสือดำ", "ชีตาห์", "เสือดาว",
  "ม้าลาย", "ยีราฟ", "ฮิปโป", "แรด", "กอริลลา",
  "ลิง", "นกทูแคน", "นกกระทุง", "ฟลามิงโก", "นกยูง",
  "ปลาแซลมอน", "ปลาเทราต์", "ปลามาร์ลิน", "ด้วง", "จิ้งหรีด",
  "ตั๊กแตน", "หิ่งห้อย", "กิ้งก่า", "อีกัวนา", "ปลาดาว",
  "กุ้งมังกร", "หอยนางรม", "ปลาหมึกยักษ์", "นาร์วาล", "วอลรัส",
  "หมาจิ้งจอก", "หมาใน", "ไฮยีนา", "ละมั่ง", "อิมพาลา",
  "ออสเปร", "คอนดอร์", "แมวป่าบ็อบ", "คูการ์", "มัสแตง",
];

const JA_ADJECTIVES = [
  "幸せな", "勇敢な", "賢い", "素早い", "優しい",
  "強い", "穏やかな", "明るい", "大胆な", "幸運な",
  "小さな", "壮大な", "激しい", "高貴な", "陽気な",
  "機知に富む", "鋭い", "誇り高い", "俊敏な", "温かい",
  "涼しい", "恥ずかしがり", "野生の", "自由な", "賢明な",
  "親切な", "たくましい", "眠い", "おどけた", "ふわふわの",
  "活発な", "熱心な", "まろやかな", "大胆不敵な", "遊び好きな",
  "こっそりの", "迅速な", "静かな", "快活な", "謙虚な",
  "元気な", "ピリッとした", "居心地良い", "浮かれた", "おしゃれな",
  "身軽な", "気概ある", "はつらつの", "頑丈な", "鮮やかな",
  "バラ色の", "威勢良い", "はきはきの", "爽やかな", "びゅんの",
  "きびきびの", "もふもふの", "きらきらの", "ふかふかの", "弾むような",
  "金色の", "銀色の", "宇宙の", "星の", "晴れの",
  "冷たい", "霧の", "砂の", "嵐の", "炎の",
  "水晶の", "影の", "雷の", "ビロードの", "素朴な",
  "粋な", "のりのりの", "ファンキーな", "ジャジーな", "知恵ある",
  "巧みな", "見事な", "立派な", "派手な", "いなせな",
  "おしゃれ好き", "かっこいい", "張り切る", "輝く", "すごい",
  "メガの", "スーパーの", "ターボの", "ウルトラの", "ロイヤルな",
  "力強い", "恐れ知らず", "勇ましい", "光輝く", "煌めく",
];

const JA_ANIMALS = [
  "トラ", "パンダ", "ワシ", "イルカ", "キツネ",
  "オオカミ", "クマ", "タカ", "フクロウ", "シカ",
  "ウサギ", "カワウソ", "クジラ", "ハヤブサ", "ライオン",
  "コアラ", "オウム", "カメ", "ペンギン", "ヤマネコ",
  "ジャガー", "カラス", "ハクチョウ", "ツル", "ヤモリ",
  "ピューマ", "バイソン", "ヘラジカ", "エルク", "サギ",
  "コブラ", "マムシ", "サメ", "イカ", "サンゴ",
  "カワセミ", "コマドリ", "ミソサザイ", "ハト", "カケス",
  "カエル", "ヒキガエル", "イモリ", "カニ", "アサリ",
  "アザラシ", "ミンク", "オコジョ", "アナグマ", "フェレット",
  "キツネザル", "バク", "ナマケモノ", "トキ", "コウノトリ",
  "ウズラ", "ガチョウ", "ヒバリ", "モグラ", "トガリネズミ",
  "リス", "ハリネズミ", "クロヒョウ", "チーター", "ヒョウ",
  "シマウマ", "キリン", "カバ", "サイ", "ゴリラ",
  "サル", "オオハシ", "ペリカン", "フラミンゴ", "クジャク",
  "シャケ", "マス", "カジキ", "カブトムシ", "コオロギ",
  "カマキリ", "ホタル", "カメレオン", "イグアナ", "ヒトデ",
  "ロブスター", "カキ", "タコ", "イッカク", "セイウチ",
  "コヨーテ", "ジャッカル", "ハイエナ", "ガゼル", "インパラ",
  "ミサゴ", "コンドル", "ボブキャット", "クーガー", "ムスタング",
];

export const NAME_POOLS: Record<string, { adjectives: string[]; animals: string[] }> = {
  en: { adjectives: EN_ADJECTIVES, animals: EN_ANIMALS },
  th: { adjectives: TH_ADJECTIVES, animals: TH_ANIMALS },
  ja: { adjectives: JA_ADJECTIVES, animals: JA_ANIMALS },
};

export function generateRandomName(lang: string): string {
  const pool = NAME_POOLS[lang] ?? NAME_POOLS.en;
  const isEn = !NAME_POOLS[lang] || lang === "en";
  const adj = pool.adjectives[Math.floor(Math.random() * pool.adjectives.length)];
  const animal = pool.animals[Math.floor(Math.random() * pool.animals.length)];
  if (isEn) return `${adj} ${animal}`;
  if (lang === "th") return `${animal}${adj}`;
  return `${adj}${animal}`;
}
