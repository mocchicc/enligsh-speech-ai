import React from 'react';
import HighlightedText from './HighlightedText';

interface AssessmentResultProps {
  result: any;  // 後でちゃんと型定義します
}

const AssessmentResult: React.FC<AssessmentResultProps> = ({ result }) => {
  if (!result) return null;
  console.log('AssessmentResult received:', result);  // デバッグ用

  const nBest = result.NBest?.[0];
  if (!nBest) {
    console.log('No NBest results found');  // デバッグ用
    return null;
  }

  const text = nBest.Display || nBest.Lexical || result.DisplayText || result.Text;
  const assessment = nBest.PronunciationAssessment || {
    AccuracyScore: 0,
    FluencyScore: 0,
    CompletenessScore: 0
  };

  // 単語ごとの評価情報を取得
  const words = nBest.Words || [];

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">
        Assessment Result
        <span className="text-sm text-gray-500 ml-2">評価結果</span>
      </h2>
      
      {/* 認識テキスト */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          Recognition Text
          <span className="text-sm text-gray-500 ml-2">認識テキスト</span>
        </h3>
        <div className="p-4 bg-gray-50 rounded">
          <HighlightedText words={words} />
        </div>
      </div>

      {/* スコア表示 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-4 bg-green-50 rounded">
          <h3 className="font-semibold mb-2">
            Pronunciation Score
            <span className="text-sm text-gray-500 block">発音スコア</span>
          </h3>
          <div className="text-4xl font-bold text-green-600">
            {Math.round(assessment.AccuracyScore || 0)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            発音の正確さを示すスコアです
          </div>
        </div>
        
        <div className="p-4 bg-yellow-50 rounded">
          <h3 className="font-semibold mb-2">
            Content Score
            <span className="text-sm text-gray-500 block">内容スコア</span>
          </h3>
          <div className="text-4xl font-bold text-yellow-600">
            {Math.round(((assessment.FluencyScore || 0) + (assessment.CompletenessScore || 0)) / 2)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            流暢さと完全性の平均スコアです
          </div>
        </div>
      </div>

      {/* スコア詳細 */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">
            Recognition Details
            <span className="text-sm text-gray-500 block">認識詳細</span>
          </h4>
          <ul className="space-y-2 bg-gray-50 p-4 rounded">
            <li>
              Confidence <span className="text-xs text-gray-500">信頼度</span>: 
              {((nBest.Confidence || 0) * 100).toFixed(1)}%
            </li>
            <li>
              Accuracy <span className="text-xs text-gray-500">発音精度</span>: 
              {(assessment.AccuracyScore || 0).toFixed(1)}
            </li>
            <li>
              Fluency <span className="text-xs text-gray-500">流暢さ</span>: 
              {(assessment.FluencyScore || 0).toFixed(1)}
            </li>
            <li>
              Completeness <span className="text-xs text-gray-500">完全性</span>: 
              {(assessment.CompletenessScore || 0).toFixed(1)}
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">
            Raw Text
            <span className="text-sm text-gray-500 block">生テキスト</span>
          </h4>
          <ul className="space-y-2 bg-gray-50 p-4 rounded">
            <li>
              Display <span className="text-xs text-gray-500">表示用</span>: 
              {nBest.Display || result.DisplayText || '-'}
            </li>
            <li>
              Lexical <span className="text-xs text-gray-500">認識結果</span>: 
              {nBest.Lexical || result.Text || '-'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResult; 