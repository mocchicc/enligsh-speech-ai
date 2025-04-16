import React, { useState } from 'react';
import { Script, scripts } from '../data/scripts';
import SpeechRecognition from './SpeechRecognition';

interface ScriptReadingProps {
  onModeChange: () => void;
}

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
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {script.estimatedDuration}秒
                </span>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                  {script.level}
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
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <div className="font-medium mb-1">English</div>
                {/* 原稿ハイライト表示 */}
                <ScriptHighlight scriptText={selectedScript.text} recognizedWords={recognizedWords} />
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="font-medium mb-1">日本語</div>
                <div className="text-gray-600">{selectedScript.translation}</div>
              </div>
              {selectedScript.targetPoints && (
                <div className="bg-yellow-50 p-4 rounded">
                  <div className="font-medium mb-1">
                    発音のポイント
                  </div>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {selectedScript.targetPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <SpeechRecognition
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            setFeedback={setFeedback}
            feedback={feedback}
            referenceText={selectedScript.text}
            onRecognizedWords={setRecognizedWords}
          />
        </div>
      )}
    </div>
  );
};

export default ScriptReading; 