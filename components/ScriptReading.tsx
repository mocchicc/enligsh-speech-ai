import React, { useState, useRef, useEffect } from 'react';
import { Script, scripts } from '../data/scripts';
import SpeechRecognition from './SpeechRecognition';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

interface ScriptReadingProps {
  onModeChange: () => void;
}

// TTSの料金計算用定数
const TTS_YEN_PER_CHAR = 0.0002; // 1文字あたりの料金（円）
const TTS_USD_PER_CHAR = 0.0000013; // 1文字あたりの料金（ドル）

// 原稿ハイライト用コンポーネント
const ScriptHighlight: React.FC<{
  scriptText: string;
  recognizedWords: any[];
}> = ({ scriptText, recognizedWords }) => {
  // 原稿を単語ごとに分割
  const scriptWords = scriptText.split(/\s+/);

  // 認識済み単語のインデックスを管理
  let recognizedIdx = 0;

  return (
    <div className="flex flex-wrap gap-1 text-lg mb-4">
      {scriptWords.map((word, idx) => {
        // 認識済み単語があれば照合
        const recognized = recognizedWords[recognizedIdx];
        let colorClass = 'bg-gray-200 text-gray-400'; // 未発話
        let borderClass = '';
        let showScore = false;
        let score = 0;
        let errorType = '';

        if (recognized && recognized.Word && word.replace(/[^a-zA-Z0-9']/g, '').toLowerCase() === recognized.Word.replace(/[^a-zA-Z0-9']/g, '').toLowerCase()) {
          // 発話済み
          score = recognized.PronunciationAssessment?.AccuracyScore ?? 100;
          errorType = recognized.PronunciationAssessment?.ErrorType ?? '';
          showScore = true;
          if (score >= 80) colorClass = 'bg-green-100 text-green-800';
          else if (score >= 60) colorClass = 'bg-yellow-100 text-yellow-800';
          else colorClass = 'bg-red-100 text-red-800';
          if (errorType) borderClass = 'border-b-2 border-red-400';
          recognizedIdx++;
        } else if (recognizedIdx === idx) {
          // 現在認識中の単語
          colorClass = 'bg-blue-100 text-blue-800 underline underline-offset-4';
        }
        return (
          <span key={idx} className={`px-2 py-1 rounded ${colorClass} ${borderClass} transition-colors duration-200`}>
            {word}
            {showScore && (
              <span className="ml-1 text-xs text-gray-500">{score.toFixed(0)}</span>
            )}
          </span>
        );
      })}
    </div>
  );
};

const ScriptReading: React.FC<ScriptReadingProps> = ({ onModeChange }) => {
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [recognizedWords, setRecognizedWords] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsCost, setTtsCost] = useState<{
    yen: number;
    usd: number;
    chars: number;
  } | null>(null);
  const speechConfig = useRef<sdk.SpeechConfig | null>(null);
  const [pauseAnalysis, setPauseAnalysis] = useState<{
    totalPauses: number;
    averagePauseDuration: number;
    longestPause: number;
    pauseLocations: { word: string; duration: number }[];
  } | null>(null);

  useEffect(() => {
    // SpeechConfigの初期化
    const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
    const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

    if (subscriptionKey && region) {
      speechConfig.current = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
      speechConfig.current.speechRecognitionLanguage = 'en-US';
      // TTSの設定を追加
      speechConfig.current.speechSynthesisLanguage = 'en-US';
      speechConfig.current.speechSynthesisVoiceName = 'en-US-JennyNeural';
      // 音声の速度と音量を調整
      speechConfig.current.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    }
  }, []);

  const analyzePauses = (words: any[]) => {
    if (words.length < 2) return null;

    const pauses: { word: string; duration: number }[] = [];
    let totalPauseDuration = 0;
    let longestPause = 0;

    for (let i = 1; i < words.length; i++) {
      const prevWord = words[i - 1];
      const currentWord = words[i];
      
      // 前の単語の終了時刻と次の単語の開始時刻の差を計算
      const pauseDuration = (currentWord.Offset - (prevWord.Offset + prevWord.Duration)) / 10000000; // 100ナノ秒単位から秒に変換
      
      if (pauseDuration > 0.3) { // 0.3秒以上の間合いを検出
        pauses.push({
          word: prevWord.Word,
          duration: pauseDuration
        });
        totalPauseDuration += pauseDuration;
        longestPause = Math.max(longestPause, pauseDuration);
      }
    }

    return {
      totalPauses: pauses.length,
      averagePauseDuration: pauses.length > 0 ? totalPauseDuration / pauses.length : 0,
      longestPause,
      pauseLocations: pauses
    };
  };

  const handleRecognizedWords = (words: any[]) => {
    setRecognizedWords(words);
    const analysis = analyzePauses(words);
    setPauseAnalysis(analysis);
  };

  const playScript = async () => {
    if (!selectedScript || !speechConfig.current) {
      console.error('SpeechConfig or script is not available');
      return;
    }

    try {
      setIsPlaying(true);
      console.log('Starting TTS synthesis...');
      
      // 音声合成の設定
      const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig.current, audioConfig);

      // 料金計算
      const charCount = selectedScript.text.length;
      setTtsCost({
        yen: charCount * TTS_YEN_PER_CHAR,
        usd: charCount * TTS_USD_PER_CHAR,
        chars: charCount
      });

      return new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(
          selectedScript.text,
          result => {
            console.log('Synthesis result:', result);
            synthesizer.close();
            resolve(null);
          },
          error => {
            console.error('Synthesis error:', error);
            synthesizer.close();
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('TTS Error:', error);
      setFeedback('音声合成に失敗しました。もう一度お試しください。');
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Script Reading Practice
          <span className="block text-sm text-gray-500">原稿読み上げ練習</span>
        </h2>
        <button
          onClick={onModeChange}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Switch to Free Talk
          <span className="block text-xs">フリートークモードへ</span>
        </button>
      </div>

      {!selectedScript ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scripts.map((script) => (
            <div
              key={script.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedScript(script)}
            >
              <h3 className="font-bold text-lg mb-2">{script.title}</h3>
              <p className="text-gray-600 mb-2">{script.text}</p>
              <p className="text-sm text-gray-500">{script.translation}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${script.levelColor}`}>
                  {script.level === 'beginner' ? '初級' : 
                   script.level === 'pre-intermediate' ? '準中級' : 
                   script.level === 'intermediate' ? '中級' : '上級'}
                </span>
                <span className="text-sm text-gray-500">
                  {script.estimatedDuration}秒
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <button
              onClick={() => setSelectedScript(null)}
              className="text-blue-500 hover:text-blue-600 mb-4"
            >
              ← Back to script list
            </button>
            <h3 className="text-xl font-bold mb-2">{selectedScript.title}</h3>
            
            {/* TTS再生ボタン */}
            <div className="mb-4">
              <button
                onClick={playScript}
                disabled={isPlaying}
                className={`px-4 py-2 rounded ${
                  isPlaying
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isPlaying ? '再生中...' : '原稿を読み上げる'}
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <div className="font-medium mb-1">English</div>
                <ScriptHighlight scriptText={selectedScript.text} recognizedWords={recognizedWords} />
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="font-medium mb-1">日本語</div>
                <div className="text-gray-600">{selectedScript.translation}</div>
              </div>
              {selectedScript.targetPoints && (
                <div className="bg-yellow-50 p-4 rounded">
                  <div className="font-medium mb-1">発音のポイント</div>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {selectedScript.targetPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* TTS料金表示（右上モーダル） */}
          {ttsCost && (
            <div className="fixed top-4 right-4 bg-white border border-green-300 shadow-lg px-6 py-4 rounded-lg z-50 text-left text-sm animate-fadeIn">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-green-700">TTS料金情報</div>
                <button
                  onClick={() => setTtsCost(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1">
                <p>文字数: {ttsCost.chars}文字</p>
                <p>料金: ¥{ttsCost.yen.toFixed(3)} / ${ttsCost.usd.toFixed(4)}</p>
              </div>
            </div>
          )}

          <SpeechRecognition
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            setFeedback={setFeedback}
            feedback={feedback}
            referenceText={selectedScript.text}
            onRecognizedWords={handleRecognizedWords}
          />

          {pauseAnalysis && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-700 mb-2">間合い分析</h4>
              <div className="space-y-2">
                <p>検出された間合い: {pauseAnalysis.totalPauses}箇所</p>
                <p>平均間合い時間: {pauseAnalysis.averagePauseDuration.toFixed(2)}秒</p>
                <p>最長間合い: {pauseAnalysis.longestPause.toFixed(2)}秒</p>
                {pauseAnalysis.pauseLocations.length > 0 && (
                  <div>
                    <p className="font-semibold">間合いの位置:</p>
                    <ul className="list-disc pl-5">
                      {pauseAnalysis.pauseLocations.map((pause, index) => (
                        <li key={index}>
                          「{pause.word}」の後: {pause.duration.toFixed(2)}秒
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScriptReading;
