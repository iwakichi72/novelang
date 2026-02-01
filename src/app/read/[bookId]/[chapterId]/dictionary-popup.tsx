"use client";

import { useState } from "react";

// MVP: 簡易ローカル辞書（後でSupabaseのword_entriesに移行）
const LOCAL_DICT: Record<string, { meaning: string; pos: string; pronunciation: string }> = {
  gilded: { meaning: "金メッキした、金箔を貼った", pos: "形容詞/動詞", pronunciation: "/ˈɡɪl.dɪd/" },
  sapphires: { meaning: "サファイア（青い宝石）", pos: "名詞", pronunciation: "/ˈsæf.aɪərz/" },
  ruby: { meaning: "ルビー（赤い宝石）", pos: "名詞", pronunciation: "/ˈruː.bi/" },
  admired: { meaning: "称賛された、感心された", pos: "動詞", pronunciation: "/ədˈmaɪərd/" },
  weathercock: { meaning: "風見鶏", pos: "名詞", pronunciation: "/ˈweð.ər.kɒk/" },
  councillors: { meaning: "議員、評議員", pos: "名詞", pronunciation: "/ˈkaʊn.sə.lərz/" },
  reputation: { meaning: "評判、名声", pos: "名詞", pronunciation: "/ˌrep.jəˈteɪ.ʃən/" },
  cathedral: { meaning: "大聖堂", pos: "名詞", pronunciation: "/kəˈθiː.drəl/" },
  scarlet: { meaning: "緋色の、深紅の", pos: "形容詞", pronunciation: "/ˈskɑːr.lɪt/" },
  pinafores: { meaning: "エプロンドレス", pos: "名詞", pronunciation: "/ˈpɪn.ə.fɔːrz/" },
  statue: { meaning: "像、彫像", pos: "名詞", pronunciation: "/ˈstætʃ.uː/" },
  column: { meaning: "柱、円柱", pos: "名詞", pronunciation: "/ˈkɒl.əm/" },
  muttered: { meaning: "つぶやいた", pos: "動詞", pronunciation: "/ˈmʌt.ərd/" },
  disappointed: { meaning: "がっかりした", pos: "形容詞", pronunciation: "/ˌdɪs.əˈpɔɪn.tɪd/" },
  sensible: { meaning: "分別のある、賢明な", pos: "形容詞", pronunciation: "/ˈsen.sə.bəl/" },
  nuzzled: { meaning: "鼻を押し付けた、すり寄った", pos: "動詞", pronunciation: "/ˈnʌz.əld/" },
  gazed: { meaning: "じっと見つめた", pos: "動詞", pronunciation: "/ɡeɪzd/" },
  beautiful: { meaning: "美しい", pos: "形容詞", pronunciation: "/ˈbjuː.tɪ.fəl/" },
  angel: { meaning: "天使", pos: "名詞", pronunciation: "/ˈeɪn.dʒəl/" },
  prince: { meaning: "王子", pos: "名詞", pronunciation: "/prɪns/" },
  happy: { meaning: "幸福な、幸せな", pos: "形容詞", pronunciation: "/ˈhæp.i/" },
};

export default function DictionaryPopup({
  word,
  sentenceId,
  onClose,
}: {
  word: string;
  sentenceId: string;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const entry = LOCAL_DICT[word];

  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      {/* ポップアップ */}
      <div className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-bold">{word}</h3>
            {entry && (
              <p className="text-xs text-gray-400">{entry.pronunciation}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ✕
          </button>
        </div>

        {entry ? (
          <div>
            <p className="text-xs text-gray-400 mb-1">{entry.pos}</p>
            <p className="text-sm text-gray-800">{entry.meaning}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            辞書データがありません（MVP版は限定的な単語のみ対応）
          </p>
        )}

        {/* アクション */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setSaved(true)}
            disabled={saved}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
              saved
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {saved ? "✓ 保存済み" : "＋ 単語帳に保存"}
          </button>
        </div>
      </div>
    </>
  );
}
