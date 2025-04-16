import React from 'react';

interface Word {
  Word: string;
  PronunciationAssessment?: {
    AccuracyScore: number;
    ErrorType?: string;
  };
  Duration?: number;
  Offset?: number;
}

interface HighlightedTextProps {
  words: Word[];
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ words }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getErrorTypeLabel = (errorType?: string) => {
    switch (errorType) {
      case 'Mispronunciation':
        return {
          icon: '🔊',
          label: 'Mispronunciation (発音の誤り)',
          advice: '正しい発音を確認し、ゆっくり丁寧に発音してみましょう'
        };
      case 'Omission':
        return {
          icon: '➖',
          label: 'Omission (音の省略)',
          advice: 'すべての音をはっきりと発音するように意識してみましょう'
        };
      case 'Insertion':
        return {
          icon: '➕',
          label: 'Insertion (余分な音の挿入)',
          advice: '余分な音を入れずに、シンプルに発音してみましょう'
        };
      default:
        return {
          icon: '✓',
          label: 'Good pronunciation (良好な発音)',
          advice: '引き続きこの発音を維持しましょう'
        };
    }
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '発音が非常に良好です';
    if (score >= 60) return '発音は概ね良好ですが、改善の余地があります';
    return '発音に課題があります';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 text-lg">
        {words.map((word, index) => {
          const score = word.PronunciationAssessment?.AccuracyScore ?? 100;
          const errorType = word.PronunciationAssessment?.ErrorType;
          const colorClass = getScoreColor(score);
          const { icon, label, advice } = getErrorTypeLabel(errorType);

          return (
            <div
              key={`${word.Word}-${index}`}
              className={`relative group px-2 py-1 rounded ${colorClass} transition-colors duration-200 hover:z-10`}
            >
              <span>{word.Word}</span>
              {icon && (
                <span className="absolute -top-4 left-0 text-sm">{icon}</span>
              )}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-normal min-w-[200px] max-w-[300px] z-20 shadow-lg">
                <div className="font-bold mb-1">
                  Accuracy Score <span className="text-xs text-gray-400">発音精度</span>
                  <span className="block">{score.toFixed(1)}</span>
                </div>
                <div className="mb-1">
                  {label.split(' (')[0]}
                  <span className="block text-xs text-gray-400">
                    {label.split(' (')[1]?.replace(')', '') || ''}
                  </span>
                </div>
                <div className="text-xs text-gray-300 mt-2 border-t border-gray-600 pt-2">
                  <span className="text-white">💡 Advice</span>
                  <span className="text-xs text-gray-400 ml-1">アドバイス</span>
                  <div className="mt-1">{advice}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 全体的な発音アドバイス */}
      <div className="bg-blue-50 p-4 rounded-lg text-sm">
        <div className="font-bold text-blue-800 mb-2">💡 全体的なアドバイス</div>
        <ul className="list-disc list-inside text-blue-700 space-y-1">
          <li>単語と単語の間に適切な間を開けることで、より明確な発音になります</li>
          <li>文末に向かって自然に声が下がるイントネーションを意識してみましょう</li>
          <li>赤色でハイライトされた単語は特に注意して練習してください</li>
        </ul>
      </div>
    </div>
  );
};

export default HighlightedText; 