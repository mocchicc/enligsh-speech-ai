import React, { useEffect, useRef, useState } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import AssessmentResult from './AssessmentResult';

interface SpeechRecognitionProps {
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  setFeedback: (feedback: string) => void;
  feedback: string;
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  isRecording,
  setIsRecording,
  setFeedback,
  feedback,
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
        const referenceText = "";  // フリートークモード用に空文字列
        const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
          referenceText,
          sdk.PronunciationAssessmentGradingSystem.HundredMark,
          sdk.PronunciationAssessmentGranularity.Phoneme,
          true  // 詳細な評価を有効化
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
  }, []);

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
      // セッションをリセット
      setCurrentSession({
        text: '',
        words: [],
        assessment: null
      });
      await recognizer.current?.startContinuousRecognitionAsync();
      setIsRecording(true);
      setError(null);
      setRecognizingText('');  // 録音開始時にクリア
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
    </div>
  );
};

export default SpeechRecognition; 