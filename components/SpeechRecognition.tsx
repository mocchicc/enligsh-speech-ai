import React, { useEffect, useRef, useState } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import AssessmentResult from './AssessmentResult';

// コスト計算用定数
const STT_YEN_PER_SEC = 0.0417; // 音声認識（円/秒）
const ADDON_YEN_PER_SEC = 0.0125; // 発音評価（円/秒）
const STT_USD_PER_SEC = 0.000277; // 音声認識（ドル/秒）
const ADDON_USD_PER_SEC = 0.0000833; // 発音評価（ドル/秒）

interface SpeechRecognitionProps {
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  setFeedback: (feedback: string) => void;
  feedback: string;
  referenceText?: string; // 原稿読み上げモード用の参照テキスト
  onRecognizedWords?: (words: any[]) => void; // ScriptReading用
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  isRecording,
  setIsRecording,
  setFeedback,
  feedback,
  referenceText,
  onRecognizedWords
}) => {
  const speechConfig = useRef<sdk.SpeechConfig | null>(null);
  const recognizer = useRef<sdk.SpeechRecognizer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [recognizingText, setRecognizingText] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<{
    text: string;
    words: any[];
    assessment: any;
  }>({
    text: '',
    words: [],
    assessment: null
  });
  const [recordStart, setRecordStart] = useState<number | null>(null);
  const [lastDuration, setLastDuration] = useState<number>(0); // 直近の録音秒数
  const [totalDuration, setTotalDuration] = useState<number>(0); // 累計録音秒数
  const [showCost, setShowCost] = useState(false);
  const [costInfo, setCostInfo] = useState<{
    stt: number;
    addon: number;
    sttUsd: number;
    addonUsd: number;
    total: number;
    totalUsd: number;
    last: number;
    lastUsd: number;
  } | null>(null);

  useEffect(() => {
    const initializeSpeech = async () => {
      try {
        const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
        const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

        if (!subscriptionKey || !region) {
          throw new Error('Azure Speech APIの設定が不足しています');
        }

        speechConfig.current = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
        speechConfig.current.speechRecognitionLanguage = 'en-US';
        
        // 音声認識の詳細設定
        speechConfig.current.setProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult, 'true');
        speechConfig.current.outputFormat = sdk.OutputFormat.Detailed;

        // 発音評価の設定
        const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
<<<<<<< HEAD
          referenceText || "",
=======
          referenceText || "",  // 原稿読み上げモードの場合は参照テキストを使用
>>>>>>> feat/script-reading
          sdk.PronunciationAssessmentGradingSystem.HundredMark,
          sdk.PronunciationAssessmentGranularity.Phoneme,
          true
        );

        // 音声認識オブジェクトの作成
        recognizer.current = new sdk.SpeechRecognizer(speechConfig.current);
        
        // 発音評価を音声認識に適用
        pronunciationAssessmentConfig.applyTo(recognizer.current);

        recognizer.current.recognized = (s, e) => {
          if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
            const result = JSON.parse(e.result.json);
            console.log('Recognition result:', result);  // デバッグ用
            const nBest = result.NBest?.[0];
            
            if (nBest) {
              // 現在のセッションに新しい認識結果を追加
              setCurrentSession(prev => {
                const newText = prev.text + ' ' + (nBest.Display || '');
                const newWords = [...prev.words, ...(nBest.Words || [])];
                
                // ScriptReading用: 単語配列を親に渡す
                if (onRecognizedWords) {
                  onRecognizedWords(newWords);
                }

                // 新しい評価結果を生成
                const combinedResult = {
                  ...result,
                  NBest: [{
                    ...nBest,
                    Display: newText.trim(),
                    Words: newWords,
                    PronunciationAssessment: nBest.PronunciationAssessment
                  }]
                };

                setAssessmentResult(combinedResult);

                return {
                  text: newText.trim(),
                  words: newWords,
                  assessment: nBest.PronunciationAssessment
                };
              });

              // フィードバックの更新
              const confidence = nBest.Confidence || 0;
              let feedback = `認識されたテキスト: ${currentSession.text}\n`;
              feedback += `信頼度: ${(confidence * 100).toFixed(2)}%\n`;
              
              if (nBest.PronunciationAssessment) {
                const assessment = nBest.PronunciationAssessment;
                console.log('Pronunciation assessment:', assessment);  // デバッグ用
                feedback += `発音スコア: ${assessment.AccuracyScore}\n`;
                feedback += `流暢さ: ${assessment.FluencyScore}\n`;
                feedback += `完全性: ${assessment.CompletenessScore}`;
              }
              
              setFeedback(feedback);
            }
          }
        };

        // 認識開始イベントを追加
        recognizer.current.recognizing = (s, e) => {
          console.log('Recognizing:', e.result.text);  // デバッグ用
          // 現在のセッションのテキストに一時的な認識テキストを追加
          setRecognizingText(currentSession.text + ' ' + e.result.text);
        };

        recognizer.current.canceled = (s, e) => {
          console.log('Recognition canceled:', e);  // デバッグ用
          if (e.reason === sdk.CancellationReason.Error) {
            setError(`エラーが発生しました: ${e.errorDetails}`);
          }
        };

        setIsInitialized(true);
      } catch (error) {
        setError(`初期化エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    };

    initializeSpeech();

    return () => {
      if (recognizer.current) {
        recognizer.current.close();
      }
    };
  }, [referenceText]); // referenceTextが変更されたら再初期化

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const startRecording = async () => {
    if (!isInitialized) {
      setError('音声認識が初期化されていません');
      showToast('音声認識が初期化されていません');
      return;
    }

    try {
      setCurrentSession({
        text: '',
        words: [],
        assessment: null
      });
      setRecordStart(Date.now()); // 録音開始時刻を記録
      setShowCost(false); // コスト表示を一旦非表示
      await recognizer.current?.startContinuousRecognitionAsync();
      setIsRecording(true);
      setError(null);
      setRecognizingText('');
      showToast('録音を開始しました');
    } catch (error) {
      setError(`録音開始エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      showToast('録音開始に失敗しました');
    }
  };

  const stopRecording = async () => {
    try {
      await recognizer.current?.stopContinuousRecognitionAsync();
      setIsRecording(false);
      showToast('録音を停止しました');
      // 録音時間を計算
      if (recordStart) {
        const durationSec = (Date.now() - recordStart) / 1000;
        setLastDuration(durationSec);
        setTotalDuration(prev => prev + durationSec);
        setRecordStart(null);

        // コスト計算
        const stt = durationSec * STT_YEN_PER_SEC;
        const addon = durationSec * ADDON_YEN_PER_SEC;
        const sttUsd = durationSec * STT_USD_PER_SEC;
        const addonUsd = durationSec * ADDON_USD_PER_SEC;
        const total = (totalDuration + durationSec) * (STT_YEN_PER_SEC + ADDON_YEN_PER_SEC);
        const totalUsd = (totalDuration + durationSec) * (STT_USD_PER_SEC + ADDON_USD_PER_SEC);
        setCostInfo({
          stt,
          addon,
          sttUsd,
          addonUsd,
          total,
          totalUsd,
          last: stt + addon,
          lastUsd: sttUsd + addonUsd
        });
        setShowCost(true);
        // 5秒後に自動で非表示
        setTimeout(() => setShowCost(false), 5000);
      }
    } catch (error) {
      setError(`録音停止エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      showToast('録音停止に失敗しました');
    }
  };

  return (
    <div className="text-center">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-6 py-3 rounded-full text-white font-semibold ${
          isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
        }`}
        disabled={!isInitialized}
      >
        <div>
          {isRecording ? 'Stop Recording' : 'Start Speaking'}
          <div className="text-xs opacity-75">
            {isRecording ? '評価を確定する' : '話しかけてください'}
          </div>
        </div>
      </button>
      
      {isRecording && (
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">
            <span className="text-blue-600 font-semibold">Recording...</span>
            <span className="text-xs text-gray-500 block">音声を認識しています</span>
          </div>
          {/* リアルタイム認識テキストの表示 */}
          {recognizingText && (
            <div className="my-4 p-4 bg-blue-50 rounded-lg text-lg animate-fade-in">
              {recognizingText}
            </div>
          )}
          <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto">
            <div className="h-full bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-6 py-2 rounded shadow-lg z-50 animate-fadeIn">
          {toast}
        </div>
      )}

      {(!isRecording && !feedback && !error) && (
        <div className="mt-4 text-gray-500 text-sm">録音ボタンを押して話しかけてください</div>
      )}

      {assessmentResult && (
        <AssessmentResult result={assessmentResult} />
      )}

      {/* 開発者向けコスト表示 */}
      {showCost && costInfo && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-blue-300 shadow-lg px-6 py-4 rounded-lg z-50 text-left text-sm animate-fadeIn">
          <div className="font-bold text-blue-700 mb-1">開発者向けAPIコスト明細</div>
          <div className="mb-1">今回の録音: <span className="font-mono">{lastDuration.toFixed(2)}秒</span></div>
          <ul className="mb-2">
            <li>音声認識: <span className="font-mono">¥{costInfo.stt.toFixed(3)}</span> / <span className="font-mono">${costInfo.sttUsd.toFixed(4)}</span></li>
            <li>発音評価: <span className="font-mono">¥{costInfo.addon.toFixed(3)}</span> / <span className="font-mono">${costInfo.addonUsd.toFixed(4)}</span></li>
            <li className="font-bold">合計: <span className="font-mono">¥{costInfo.last.toFixed(3)}</span> / <span className="font-mono">${costInfo.lastUsd.toFixed(4)}</span></li>
          </ul>
          <div className="text-xs text-gray-500 mb-1">累計（このセッション）</div>
          <ul>
            <li>音声認識: <span className="font-mono">{(totalDuration * STT_YEN_PER_SEC).toFixed(3)}</span>円</li>
            <li>発音評価: <span className="font-mono">{(totalDuration * ADDON_YEN_PER_SEC).toFixed(3)}</span>円</li>
            <li className="font-bold">合計: <span className="font-mono">{costInfo.total.toFixed(3)}</span>円 / <span className="font-mono">${costInfo.totalUsd.toFixed(4)}</span></li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SpeechRecognition; 