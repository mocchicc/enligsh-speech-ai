export interface Script {
  id: string;
  title: string;
  text: string;
  translation: string;
  level: 'beginner' | 'pre-intermediate' | 'intermediate' | 'advanced';
  levelColor: string; // 難易度ラベルの色を追加
  estimatedDuration: number; // 秒単位
  targetPoints?: string[]; // 特に注意すべき発音ポイント
}

export const scripts: Script[] = [
  {
    id: 'school-life',
    title: '学校での一日',
    text: 'I go to school at eight every morning. I enjoy studying English and playing sports with my friends.',
    translation: '私は毎朝8時に学校に行きます。英語を勉強したり、友達とスポーツをしたりするのが楽しいです。',
    level: 'beginner',
    levelColor: 'bg-green-100 text-green-800', // ビギナーは緑色
    estimatedDuration: 12,
    targetPoints: ['every の発音', 'with の発音', 'ing の発音']
  },
  {
    id: 'family-dinner',
    title: '家族との夕食',
    text: 'Yesterday evening, I helped my mother prepare a delicious dinner. We made curry and rice together, and I learned how to chop vegetables properly. The meal turned out to be very tasty, and we enjoyed our family time.',
    translation: '昨日の夕方、私は母の手伝いをして美味しい夕食を作りました。一緒にカレーライスを作り、野菜の切り方を学びました。料理はとても美味しくできて、家族との時間を楽しみました。',
    level: 'pre-intermediate',
    levelColor: 'bg-blue-100 text-blue-800',
    estimatedDuration: 18,
    targetPoints: ['prepare の発音', 'properly の発音', 'delicious の発音']
  },
  {
    id: 'summer-vacation',
    title: '夏休みの思い出',
    text: 'Last summer, my family and I visited a beautiful beach. We swam in the clear ocean water and built an impressive sandcastle. The weather was perfect, and we had a wonderful time together.',
    translation: '去年の夏、家族と美しいビーチを訪れました。澄んだ海で泳ぎ、印象的な砂の城を作りました。天気は完璧で、素晴らしい時間を過ごしました。',
    level: 'pre-intermediate',
    levelColor: 'bg-blue-100 text-blue-800',
    estimatedDuration: 17,
    targetPoints: ['visited の発音', 'impressive の発音', 'wonderful の発音']
  },
  {
    id: 'pet-cat',
    title: '私の猫',
    text: 'I have a black cat named Mimi. She likes to sleep on my bed and play with small toys.',
    translation: '私はミミという名前の黒猫を飼っています。彼女は私のベッドで寝たり、小さなおもちゃで遊んだりするのが好きです。',
    level: 'beginner',
    levelColor: 'bg-green-100 text-green-800',
    estimatedDuration: 11,
    targetPoints: ['named の発音', 'sleep の発音', 'small の発音']
  },
  {
    id: 'environmental-issues',
    title: '環境問題について',
    text: 'Climate change is one of the most pressing issues facing our planet today. Rising global temperatures, melting ice caps, and extreme weather events are clear indicators of this phenomenon. We must take immediate action to reduce our carbon footprint and transition to renewable energy sources.',
    translation: '気候変動は、現在私たちの地球が直面している最も差し迫った問題の一つです。上昇する地球の気温、溶けていく氷冠、そして極端な気象現象は、この現象の明確な指標です。私たちは二酸化炭素排出量を削減し、再生可能エネルギー源への移行を即座に始める必要があります。',
    level: 'intermediate',
    levelColor: 'bg-yellow-100 text-yellow-800', // 中級は黄色
    estimatedDuration: 25,
    targetPoints: ['climate の発音', 'phenomenon の発音', 'renewable の発音']
  },
  {
    id: 'cultural-differences',
    title: '文化の違いについて',
    text: 'Understanding cultural differences is essential in our globalized world. Each culture has its unique traditions, values, and communication styles. By learning about these differences, we can build stronger relationships and avoid misunderstandings in international settings.',
    translation: '文化の違いを理解することは、グローバル化した世界において不可欠です。それぞれの文化には独自の伝統、価値観、コミュニケーションスタイルがあります。これらの違いについて学ぶことで、より強い関係を築き、国際的な場面での誤解を避けることができます。',
    level: 'intermediate',
    levelColor: 'bg-yellow-100 text-yellow-800',
    estimatedDuration: 23,
    targetPoints: ['cultural の発音', 'essential の発音', 'misunderstandings の発音']
  },
  {
    id: 'technology-evolution',
    title: 'テクノロジーの進化',
    text: 'The rapid advancement of artificial intelligence and machine learning is revolutionizing various industries. These technologies are not only automating routine tasks but also enabling new forms of creativity and problem-solving. However, we must carefully consider the ethical implications and ensure responsible development.',
    translation: '人工知能と機械学習の急速な進歩は、様々な産業に革命をもたらしています。これらの技術は単に日常的な作業を自動化するだけでなく、新しい形の創造性と問題解決を可能にしています。しかし、倫理的な影響を慎重に考慮し、責任ある開発を確保する必要があります。',
    level: 'advanced',
    levelColor: 'bg-red-100 text-red-800', // 上級は赤色
    estimatedDuration: 28,
    targetPoints: ['revolutionizing の発音', 'automating の発音', 'implications の発音']
  },
  {
    id: 'globalization-impact',
    title: 'グローバル化の影響',
    text: 'Globalization has created an interconnected world where economic, political, and cultural boundaries are increasingly blurred. While this has led to unprecedented opportunities for collaboration and growth, it has also presented challenges in maintaining cultural identity and addressing economic disparities.',
    translation: 'グローバル化は、経済的、政治的、文化的な境界がますます曖昧になっている相互接続された世界を作り出しました。これは協力と成長の前例のない機会をもたらしましたが、同時に文化的アイデンティティの維持や経済格差への対応という課題も提示しています。',
    level: 'advanced',
    levelColor: 'bg-red-100 text-red-800',
    estimatedDuration: 26,
    targetPoints: ['interconnected の発音', 'unprecedented の発音', 'disparities の発音']
  }
]; 