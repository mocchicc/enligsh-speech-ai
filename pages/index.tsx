import { useState } from 'react';
import Head from 'next/head';
import SpeechRecognition from '../components/SpeechRecognition';
import ScriptReading from '../components/ScriptReading';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [mode, setMode] = useState<'free-talk' | 'script-reading'>('free-talk');

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>英語発音評価システム</title>
        <meta name="description" content="Azure Speech APIを使用した英語発音評価システム" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">英語発音評価システム</h1>
        
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          {mode === 'free-talk' ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  Free Talk Mode
                  <span className="block text-sm text-gray-500">フリートークモード</span>
                </h2>
                <button
                  onClick={() => setMode('script-reading')}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Switch to Script Reading
                  <span className="block text-xs">原稿読み上げモードへ</span>
                </button>
              </div>

              <SpeechRecognition
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                setFeedback={setFeedback}
                feedback={feedback}
              />
            </>
          ) : (
            <ScriptReading onModeChange={() => setMode('free-talk')} />
          )}

          {feedback && (
            <div className="mt-6 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold mb-2">フィードバック</h3>
              <p>{feedback}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 