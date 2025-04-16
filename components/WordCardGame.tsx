import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition from './SpeechRecognition';

interface WordCard {
  word: string;
  pronunciation: string;
  hint: string;
}

interface WordScore {
  word: string;
  attempts: {
    score: number;
    success: boolean;
  }[];
  finalScore: number;
}

const sampleWords: WordCard[] = [
  { word: "apple", pronunciation: "ˈæpəl", hint: "りんご" },
  { word: "banana", pronunciation: "bəˈnɑːnə", hint: "バナナ" },
  { word: "computer", pronunciation: "kəmˈpjuːtər", hint: "コンピュータ" }
//  { word: "elephant", pronunciation: "ˈelɪfənt", hint: "象" },
//  { word: "giraffe", pronunciation: "dʒɪˈræf", hint: "キリン" },
//  { word: "hospital", pronunciation: "ˈhɒspɪtl", hint: "病院" },
//  { word: "internet", pronunciation: "ˈɪntərnet", hint: "インターネット" },
//  { word: "jump", pronunciation: "dʒʌmp", hint: "跳ぶ" },
//  { word: "kangaroo", pronunciation: "ˌkæŋɡəˈruː", hint: "カンガルー" },
//  { word: "lemon", pronunciation: "ˈlemən", hint: "レモン" }
];

// スコア閾値の設定（0〜1の範囲）
const ACCURACY_THRESHOLD = 0.85;

// アニメーション状態
const CARD_ANIMATION = {
  NONE: 'none',          // アニメーションなし
  SUCCESS: 'fade-zoom',  // 成功アニメーション（バウンスからフェードズームに変更）
  FADE_OUT: 'fade-out',  // フェードアウト
  FADE_IN: 'fade-in',    // フェードイン
  FINAL_FADE_OUT: 'final-fade-out',  // 最後のフェードアウト
  PERFECT: 'perfect'     // 100点満点時の演出
};

// アニメーション時間の定数化（ミリ秒）
const ANIMATION_TIMING = {
  SUCCESS: 100,      // 成功アニメーション時間（150ms→100msに短縮）
  FADE_OUT: 180,     // フェードアウト時間（300ms→180msに短縮）
  FADE_IN: 120,      // フェードイン時間（200ms→120msに短縮）
  NEXT_CARD: 120,    // 次のカードへの移行時間（200ms→120msに短縮）
  WAIT_BEFORE_ANIMATION: 0,  // 成功から成功アニメーション開始までの待機時間
  SOUND_COMPLETE: 50,   // 効果音の完了を待つ時間（100ms→50msに短縮）
  FINAL_FADE: 800      // 最後のフェードアウト時間（800ms→750msに短縮）
};

// 効果音パス
const SOUND_PATHS = {
  SUCCESS: '/success_se.mp3', 
  FAILURE: '/failure_se.mp3',
  COUNTDOWN: '/GameStart_123countdownmp3.mp3'
};

// 効果音参照用ID定義
const SOUND_IDS = {
  SUCCESS: 'success-sound',
  FAILURE: 'failure-sound',
  COUNTDOWN: 'countdown-sound'
};

// イベント種類
const GAME_EVENT = {
  SUCCESS: 'success',    // 成功時
  FAILURE: 'failure',    // 失敗時
  PAUSE: 'pause',        // 一時停止時
  RESUME: 'resume',      // 再開時
  SKIP: 'skip',          // スキップ時
  END: 'end'             // 終了時
};

// 花びらの設定
const PETALS_CONFIG = {
  COUNT: 30,            // 花びらの数
  COLORS: ['#ffcccc', '#ffe6cc', '#fff2cc', '#ccffcc', '#cce6ff', '#e6ccff'], // 花びらの色
  MIN_SIZE: 10,         // 最小サイズ（px）
  MAX_SIZE: 20,         // 最大サイズ（px）
  ANIMATION_DURATION: 4 // アニメーション時間（秒）
};

const WordCardGame: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showSuccessEffect, setShowSuccessEffect] = useState(false);
  const [recognitionText, setRecognitionText] = useState('');
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentScore, setAssessmentScore] = useState(0);
  const [lastEvaluationTime, setLastEvaluationTime] = useState(0);
  const [cardAnimation, setCardAnimation] = useState(CARD_ANIMATION.NONE);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  // 各単語のスコアと試行履歴を保存する配列
  const [wordScores, setWordScores] = useState<WordScore[]>([]);
  const [showFinalLoading, setShowFinalLoading] = useState(false);
  const [showPerfectEffect, setShowPerfectEffect] = useState(false);
  
  // カード内容の参照
  const currentWordRef = useRef(sampleWords[currentIndex]);
  
  // 効果音プリロードの状態
  const [soundsPreloaded, setSoundsPreloaded] = useState(false);
  const [successSound, setSuccessSound] = useState<HTMLAudioElement | null>(null);
  const [failureSound, setFailureSound] = useState<HTMLAudioElement | null>(null);
  const [countdownSound, setCountdownSound] = useState<HTMLAudioElement | null>(null);
  
  // 音声再生のロック（多重再生防止）
  const soundLockRef = useRef(false);
  
  // 現在のゲームイベント
  const gameEventRef = useRef('');
  
  // 評価処理のロック（カード移動中や成功後の誤評価を防止）
  const evaluationLockRef = useRef(false);
  
  // 保留中の評価結果
  const pendingEvaluationRef = useRef<number | null>(null);
  
  // 見た目に表示するカード（アニメーション用）
  useEffect(() => {
    // フェードアウト中は現在のカードを維持
    // フェードアウト以外の時は現在のインデックスに基づいてカードを更新
    if (cardAnimation !== CARD_ANIMATION.FADE_OUT && currentIndex < sampleWords.length) {
      currentWordRef.current = sampleWords[currentIndex];
    }
  }, [currentIndex, cardAnimation]);
  
  // タイマー参照
  const timerRef = useRef<NodeJS.Timeout | NodeJS.Timeout[] | null>(null);
  
  // 効果音をプリロード
  useEffect(() => {
    try {
      console.log('効果音をプリロードします...');
      const success = new Audio(SOUND_PATHS.SUCCESS);
      const failure = new Audio(SOUND_PATHS.FAILURE);
      const countdown = new Audio(SOUND_PATHS.COUNTDOWN);
      
      // プリロード
      success.load();
      failure.load();
      countdown.load();
      
      setSuccessSound(success);
      setFailureSound(failure);
      setCountdownSound(countdown);
      setSoundsPreloaded(true);
      
      console.log('効果音のプリロード完了');
    } catch (error) {
      console.error('効果音のプリロード中にエラーが発生しました:', error);
    }
  }, []);
  
  // 効果音再生関数
  const playSound = (soundType: 'SUCCESS' | 'FAILURE' | 'COUNTDOWN') => {
    if (!isSoundEnabled) {
      console.log('効果音は無効になっています');
      return;
    }

    // 音声の多重再生を防止（特にカウントダウン時）
    if (soundLockRef.current && soundType !== 'COUNTDOWN') {
      console.log(`音声再生をスキップ: ${soundType} (ロック中)`);
      return;
    }
    
    // イベントに基づく音声再生の制御
    if (soundType === 'FAILURE' && 
        (gameEventRef.current === GAME_EVENT.PAUSE || 
         gameEventRef.current === GAME_EVENT.SKIP || 
         gameEventRef.current === GAME_EVENT.END)) {
      console.log(`失敗音をスキップ: 現在のイベントは ${gameEventRef.current}`);
      return;
    }

    try {
      let soundId = '';
      switch (soundType) {
        case 'SUCCESS':
          soundId = SOUND_IDS.SUCCESS;
          // 成功音再生時は他の音を一時的にブロック
          soundLockRef.current = true;
          setTimeout(() => { soundLockRef.current = false; }, 1500);
          break;
        case 'FAILURE':
          soundId = SOUND_IDS.FAILURE;
          break;
        case 'COUNTDOWN':
          soundId = SOUND_IDS.COUNTDOWN;
          break;
      }

      const audioElement = document.getElementById(soundId) as HTMLAudioElement;
      
      if (audioElement) {
        console.log(`[Sound] 効果音再生: ${soundId}`);
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.volume = 0.7;
        
        // 直接再生
        audioElement.play().then(() => {
          console.log(`効果音再生成功: ${soundId}`);
        }).catch(err => {
          console.error(`効果音再生エラー: ${soundId}`, err);
          soundLockRef.current = false; // エラー時はロック解除
        });
      } else {
        console.error(`効果音要素が見つかりません: ${soundId}`);
      }
    } catch (error) {
      console.error('効果音再生時にエラーが発生しました:', error);
      soundLockRef.current = false; // エラー時はロック解除
    }
  };
  
  // ゲーム状態のリセット（デバッグ用）
  const resetGame = () => {
    console.log("ゲームをリセットします");
    setCurrentIndex(0);
    setScore(0);
    setShowHint(false);
    setGameCompleted(false);
    setIsRecording(false);
    setGameStarted(false);
    setCountdown(null);
    setShowSuccessEffect(false);
    setRecognitionText('');
    setShowAssessment(false);
    setAssessmentScore(0);
    setCardAnimation(CARD_ANIMATION.NONE);
    currentWordRef.current = sampleWords[0];
    setLogs([]);
    if (timerRef.current) {
      if (Array.isArray(timerRef.current)) {
        timerRef.current.forEach(timer => clearTimeout(timer));
      } else if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }
  };

  // ログ出力
  const addLog = (message: string) => {
    console.log(`[Game] ${message}`);
    setLogs(prev => [...prev.slice(-5), message]);
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      // 複数のタイマーをクリアするため、配列の場合は各タイマーを個別にクリア
      if (Array.isArray(timerRef.current)) {
        timerRef.current.forEach(timer => clearTimeout(timer));
      } else if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // アニメーション処理
  useEffect(() => {
    if (cardAnimation === CARD_ANIMATION.FADE_OUT) {
      // フェードアウト完了直前に次のカードをセット（フェードイン準備）
      if (currentIndex < sampleWords.length - 1) {
        // フェードアウトがほぼ完了した時点で次のカード内容を準備
        timerRef.current = setTimeout(() => {
          currentWordRef.current = sampleWords[currentIndex + 1];
        }, ANIMATION_TIMING.FADE_OUT - 20);
        
        // フェードアウト完了後、インデックス変更、フェードイン開始
        const mainTimer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setCardAnimation(CARD_ANIMATION.FADE_IN);
          setAssessmentScore(0);
          setShowAssessment(false);
        }, ANIMATION_TIMING.FADE_OUT);
        
        timerRef.current = [timerRef.current, mainTimer];
      }
    } else if (cardAnimation === CARD_ANIMATION.FADE_IN) {
      timerRef.current = setTimeout(() => {
        setCardAnimation(CARD_ANIMATION.NONE);
        if (gameStarted && !isPaused) {
          setIsRecording(true);
        }
      }, ANIMATION_TIMING.FADE_IN);
    } else if (cardAnimation === CARD_ANIMATION.SUCCESS) {
      evaluationLockRef.current = true;
      
      // 最後のカードかどうかで異なるアニメーション遷移を設定
      if (currentIndex === sampleWords.length - 1) {
        // 最後のカードの場合は成功アニメーションをスキップして直接フェードアウト
        setCardAnimation(CARD_ANIMATION.FINAL_FADE_OUT);
        addLog("最終カード成功、直接フェードアウト開始");
      } else {
        // 通常のカードの場合は成功アニメーション後にフェードアウト
        timerRef.current = setTimeout(() => {
          setCardAnimation(CARD_ANIMATION.FADE_OUT);
        }, ANIMATION_TIMING.SUCCESS);
      }
    } else if (cardAnimation === CARD_ANIMATION.FINAL_FADE_OUT) {
      timerRef.current = setTimeout(() => {
        setGameCompleted(true);
        addLog("ゲーム完了");
      }, ANIMATION_TIMING.FINAL_FADE);
    }
    
    // アニメーションが完了して「NONE」状態になった時、保留中の評価を処理
    if (cardAnimation === CARD_ANIMATION.NONE && pendingEvaluationRef.current !== null) {
      const pendingResult = pendingEvaluationRef.current;
      pendingEvaluationRef.current = null;
      
      setTimeout(() => {
        addLog(`保留中だった評価を処理: ${pendingResult.toFixed(2)}`);
        handlePronunciationResult(pendingResult);
      }, 30); // 50ms→30msに短縮
    }
    
    return () => {
      // 複数のタイマーをクリアするため、配列の場合は各タイマーを個別にクリア
      if (Array.isArray(timerRef.current)) {
        timerRef.current.forEach(timer => clearTimeout(timer));
      } else if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [cardAnimation, gameStarted, isPaused, currentIndex]);

  // ゲーム開始時
  useEffect(() => {
    if (gameStarted && !gameCompleted && !isPaused && !isRecording && cardAnimation === CARD_ANIMATION.NONE) {
      // ゲーム開始時の録音開始
      addLog(`カード開始: ${currentWordRef.current.word}`);
      timerRef.current = setTimeout(() => {
        setIsRecording(true);
        setShowAssessment(false);
      }, 200); // 500ms→200msに短縮
    }
  }, [gameStarted, gameCompleted, isPaused, isRecording, cardAnimation]);

  // ゲーム開始
  const startGame = () => {
    // カウントダウン音を事前に読み込んでおく
    const preloadCountdownSound = () => {
      try {
        const audio = new Audio(SOUND_PATHS.COUNTDOWN);
        audio.load();
        audio.volume = 1.0;
        
        // ユーザーのアクションに応じて再生
        setTimeout(() => {
          audio.play()
            .then(() => {
              console.log('カウントダウン音の再生を開始しました');
              addLog('カウントダウン音再生: 成功');
            })
            .catch(err => {
              console.error('カウントダウン音の再生に失敗:', err);
              addLog('カウントダウン音再生: 失敗');
              
              // 失敗した場合はDOM APIを使った方法を試す
              const fallbackAudio = document.getElementById(SOUND_IDS.COUNTDOWN) as HTMLAudioElement;
              if (fallbackAudio) {
                fallbackAudio.volume = 1.0;
                fallbackAudio.currentTime = 0;
                fallbackAudio.play()
                  .then(() => addLog('カウントダウン音再生: フォールバック成功'))
                  .catch(e => addLog('カウントダウン音再生: フォールバック失敗'));
              }
            });
        }, 50); // 100ms→50msに短縮
      } catch (error) {
        console.error('カウントダウン音の初期化エラー:', error);
      }
    };
    
    // カウントダウンを開始
    setCountdown(3);
    preloadCountdownSound();
  };

  // カウントダウン
  useEffect(() => {
    // カウントダウンのログ出力のみ
    if (countdown !== null && countdown > 0) {
      addLog(`カウントダウン: ${countdown}`);
      
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setGameStarted(true);
    }
  }, [countdown]);

  // カード移動（アニメーション版）
  const moveToNextCard = () => {
    addLog("カード移動アニメーション開始");
    
    // 評価ロックを有効化（カード移動中の誤評価を防止）
    evaluationLockRef.current = true;
    
    // 成功アニメーション開始
    setCardAnimation(CARD_ANIMATION.SUCCESS);
    
    if (currentIndex < sampleWords.length - 1) {
      // 次のカードに進む
      setShowHint(false);
      setShowSuccessEffect(true);
      setShowAssessment(false);
      setRecognitionText('');
      setIsRecording(false);
    } else {
      // 最後のカードの場合
      addLog("最後のカード完了、フェードアウト開始");
      setShowHint(false);
      setShowSuccessEffect(true);
      setShowAssessment(false);
      setRecognitionText('');
      setIsRecording(false);
      
      // 最後のカードの場合は、アニメーションを短くして直接終了画面へ
      setTimeout(() => {
        setCardAnimation(CARD_ANIMATION.FINAL_FADE_OUT);
        addLog("最終フェードアウト開始");
        
        // 最終フェードアウト後にゲーム完了
        setTimeout(() => {
          setGameCompleted(true);
          addLog("ゲーム完了");
        }, ANIMATION_TIMING.FINAL_FADE);
      }, ANIMATION_TIMING.SOUND_COMPLETE);
    }
    
    // カード移動完了後にロック解除
    setTimeout(() => {
      evaluationLockRef.current = false;
      addLog("評価ロック解除");
    }, 800);
  };

  // 評価結果ハンドラ
  const handlePronunciationResult = (result: number) => {
    // 評価ロック中はすべての評価をスキップ
    if (evaluationLockRef.current) {
      addLog(`評価をスキップ (評価ロック中)`);
      return;
    }
    
    // 異常な評価値をスキップ（0に近すぎる値は無視）
    if (result < 0.01) {
      addLog(`異常な評価値をスキップ: ${result.toFixed(2)}`);
      return;
    }
    
    // 多重評価防止（前回の評価から500ms以内の場合はスキップ）
    const now = Date.now();
    if (now - lastEvaluationTime < 500) { // 750ms→500msに短縮
      addLog(`評価をスキップ（前回から${(now - lastEvaluationTime) / 500}秒）`);
      return;
    }
    setLastEvaluationTime(now);
    
    // アニメーション中の場合は評価を保留して後で処理
    if (cardAnimation !== CARD_ANIMATION.NONE) {
      addLog(`アニメーション中の評価を保留: ${result.toFixed(2)}`);
      pendingEvaluationRef.current = result;
      
      setTimeout(() => {
        if (pendingEvaluationRef.current !== null) {
          const pendingResult = pendingEvaluationRef.current;
          
          if (cardAnimation !== CARD_ANIMATION.NONE) {
            addLog(`アニメーションまだ進行中、評価処理を延期: ${pendingResult.toFixed(2)}`);
            
            setTimeout(() => {
              if (pendingEvaluationRef.current !== null) {
                const finalPendingResult = pendingEvaluationRef.current;
                pendingEvaluationRef.current = null;
                
                addLog(`保留中だった評価を強制処理: ${finalPendingResult.toFixed(2)}`);
                processPronunciationResult(finalPendingResult);
              }
            }, 400); // 1000ms→500msに短縮
            
            return;
          }
          
          pendingEvaluationRef.current = null;
          addLog(`保留中だった評価を処理: ${pendingResult.toFixed(2)}`);
          processPronunciationResult(pendingResult);
        }
      }, 150); // 300ms→150msに短縮
    }
    
    // 通常の評価処理
    processPronunciationResult(result);
  };

  // 実際の評価処理を行う関数（共通処理）
  const processPronunciationResult = (result: number) => {
    // ゲーム状態が不適切な場合はスキップ（一時停止中など）
    if (isPaused || gameCompleted || !gameStarted) {
      addLog('ゲーム状態が不適切なため評価をスキップ');
      return;
    }
    
    // 録音を停止して評価
    setIsRecording(false);
    
    // スコア表示
    setAssessmentScore(result * 100);
    setShowAssessment(true);
    addLog(`評価結果: ${result.toFixed(2)} (閾値: ${ACCURACY_THRESHOLD})`);
    
    // 前の音声を停止（念のため）
    const stopAllAudio = () => {
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
    stopAllAudio();
    
    // 成功/失敗の判定と処理
    if (result >= ACCURACY_THRESHOLD) {
      // 成功時は評価ロックを有効化（多重評価を防止）
      evaluationLockRef.current = true;
      
      gameEventRef.current = GAME_EVENT.SUCCESS;
      addLog("成功判定: スコア十分");
      setScore(prev => prev + 1);
      
      // スコアを記録（成功時）
      setWordScores(prev => {
        const existingWordScore = prev.find(score => score.word === currentWordRef.current.word);
        if (existingWordScore) {
          return prev.map(score => 
            score.word === currentWordRef.current.word
              ? {
                  ...score,
                  attempts: [...score.attempts, { score: Math.round(result * 100), success: true }],
                  finalScore: Math.round(result * 100)
                }
              : score
          );
        } else {
          return [...prev, {
            word: currentWordRef.current.word,
            attempts: [{ score: Math.round(result * 100), success: true }],
            finalScore: Math.round(result * 100)
          }];
        }
      });
      
      // 成功時の処理と音の再生
      playSound('SUCCESS');
      moveToNextCard();

      // 100点満点の場合、花びら演出を表示
      if (Math.round(result * 100) === 100) {
        setShowPerfectEffect(true);
        setTimeout(() => setShowPerfectEffect(false), PETALS_CONFIG.ANIMATION_DURATION * 1000);
      }
    } else {
      gameEventRef.current = GAME_EVENT.FAILURE;
      addLog("失敗判定: スコア不十分");
      setShowHint(true);
      
      // 失敗時の音の再生（重複を防ぐため、gameEventRefをチェック）
      if (gameEventRef.current === GAME_EVENT.FAILURE) {
        playSound('FAILURE');
      }
      
      // 失敗時は少し待ってから再度録音
      timerRef.current = setTimeout(() => {
        if (gameStarted && !isPaused) {
          setIsRecording(true);
        }
      }, 300);
      
      // スコアを記録（失敗時）
      setWordScores(prev => {
        const existingWordScore = prev.find(score => score.word === currentWordRef.current.word);
        if (existingWordScore) {
          return prev.map(score => 
            score.word === currentWordRef.current.word
              ? {
                  ...score,
                  attempts: [...score.attempts, { score: Math.round(result * 100), success: false }]
                }
              : score
          );
        } else {
          return [...prev, {
            word: currentWordRef.current.word,
            attempts: [{ score: Math.round(result * 100), success: false }],
            finalScore: 0
          }];
        }
      });
    }
  };

  // 一時停止/再開
  const handlePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    if (newPausedState) {
      // 一時停止
      gameEventRef.current = GAME_EVENT.PAUSE;
      addLog("ゲーム一時停止");
      setIsRecording(false);
      if (timerRef.current) {
        if (Array.isArray(timerRef.current)) {
          timerRef.current.forEach(timer => clearTimeout(timer));
        } else if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      }
    } else {
      // 再開
      gameEventRef.current = GAME_EVENT.RESUME;
      addLog("ゲーム再開");
      if (cardAnimation === CARD_ANIMATION.NONE) {
        timerRef.current = setTimeout(() => {
          setIsRecording(true);
          // 再開時もスコア表示を維持（表示されている場合）
          // setShowAssessment(false); // この行をコメントアウト
        }, 500);
      }
    }
  };

  // 終了
  const handleEndGame = () => {
    gameEventRef.current = GAME_EVENT.END;
    addLog("ゲーム強制終了");
    setGameCompleted(true);
    setIsRecording(false);
    if (timerRef.current) {
      if (Array.isArray(timerRef.current)) {
        timerRef.current.forEach(timer => clearTimeout(timer));
      } else if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }
  };

  // 手動スキップ（開発用）
  const handleSkipCard = () => {
    gameEventRef.current = GAME_EVENT.SKIP;
    addLog("手動スキップ実行");
    setIsRecording(false);
    if (timerRef.current) {
      if (Array.isArray(timerRef.current)) {
        timerRef.current.forEach(timer => clearTimeout(timer));
      } else if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }
    moveToNextCard();
  };

  // 効果音の切り替え
  const toggleSound = () => {
    setIsSoundEnabled(!isSoundEnabled);
    addLog(`効果音: ${!isSoundEnabled ? 'ON' : 'OFF'}`);
  };

  // 花びらのスタイルを生成する関数
  const generatePetalStyle = (index: number) => {
    const size = Math.random() * (PETALS_CONFIG.MAX_SIZE - PETALS_CONFIG.MIN_SIZE) + PETALS_CONFIG.MIN_SIZE;
    const color = PETALS_CONFIG.COLORS[Math.floor(Math.random() * PETALS_CONFIG.COLORS.length)];
    const left = Math.random() * 100;
    const animationDelay = Math.random() * 2;
    const animationDuration = Math.random() * 2 + PETALS_CONFIG.ANIMATION_DURATION;

    return {
      position: 'absolute' as const,
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      borderRadius: '50%',
      left: `${left}%`,
      top: '-20px',
      opacity: 0.8,
      animation: `fall ${animationDuration}s linear ${animationDelay}s infinite`,
      transform: `rotate(${Math.random() * 360}deg)`,
      zIndex: 50
    };
  };

  // アニメーションクラスの決定
  const getAnimationClass = () => {
    switch (cardAnimation) {
      case CARD_ANIMATION.SUCCESS:
        // 最後のカードの場合は成功アニメーションを適用しない
        return currentIndex === sampleWords.length - 1 ? '' : 'animate-fade-zoom';
      case CARD_ANIMATION.FADE_OUT:
        return 'animate-fade-out';
      case CARD_ANIMATION.FADE_IN:
        return 'animate-fade-in';
      case CARD_ANIMATION.FINAL_FADE_OUT:
        return 'animate-final-fade-out';
      default:
        return '';
    }
  };

  // ゲーム開始前の画面
  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">単語カードゲーム</h2>
          <p className="mb-6">英単語を正しく発音して、カードを倒そう！</p>
          {countdown !== null ? (
            <div className="text-6xl font-bold text-blue-500 animate-bounce">
              {countdown}
            </div>
          ) : (
            <button
              onClick={startGame}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              ゲームスタート
            </button>
          )}
          <div className="mt-4">
            <button
              onClick={toggleSound}
              className={`text-sm px-3 py-1 rounded border ${isSoundEnabled 
                ? 'bg-blue-100 text-blue-700 border-blue-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'}`}
            >
              効果音: {isSoundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ゲーム終了画面
  if (gameCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">ゲーム終了！</h2>
          <div className="mb-6">
            <p className="text-xl mb-2">スコア: {score} / {sampleWords.length}</p>
            <p className="text-gray-600 mb-4">正答率: {((score / sampleWords.length) * 100).toFixed(1)}%</p>
            
            {/* 平均点の表示を追加 */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-blue-800 mb-2">総合評価</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">全試行の平均点</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(wordScores.reduce((sum, word) => 
                      sum + word.attempts.reduce((attemptSum, attempt) => 
                        attemptSum + attempt.score, 0
                      ) / word.attempts.length, 0
                    ) / wordScores.length).toFixed(1)}点
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">最終スコアの平均</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(wordScores.reduce((sum, word) => 
                      sum + word.finalScore, 0
                    ) / wordScores.length).toFixed(1)}点
                  </p>
                </div>
              </div>
            </div>
            
            {/* 各単語のスコア表示 */}
            <div className="mt-3 border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-3 py-2 border-b">
                <h3 className="font-bold">単語別スコア履歴</h3>
              </div>
              <div className="p-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {wordScores.map((item, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg overflow-hidden ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      {/* 単語ヘッダー */}
                      <div className="bg-blue-50 px-3 py-2 border-b">
                        <div className="font-bold text-blue-800">{item.word}</div>
                        <div className="text-xs text-blue-600">
                          {item.attempts.length}回の試行 / 
                          {item.attempts[item.attempts.length - 1].success ? '成功' : '未達成'}
                        </div>
                      </div>
                      
                      {/* 試行履歴 */}
                      <div className="p-2">
                        {item.attempts.map((attempt, attemptIndex) => (
                          <div
                            key={attemptIndex}
                            className={`flex items-center justify-between p-2 ${
                              attemptIndex < item.attempts.length - 1 ? 'border-b' : ''
                            }`}
                          >
                            <div className="text-gray-600">
                              {attemptIndex + 1}回目
                            </div>
                            <div className={`flex items-center gap-2 ${
                              attempt.success ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              <span className="font-semibold">{attempt.score}点</span>
                              <span className="text-lg">
                                {attempt.success ? '✓' : '×'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* 最終結果 */}
                      {item.attempts[item.attempts.length - 1].success && (
                        <div className="bg-green-50 px-3 py-2 border-t">
                          <div className="text-xs text-green-600">
                            最終スコア: {item.finalScore}点
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={resetGame}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            もう一度プレイ
          </button>
          <div className="mt-4">
            <button
              onClick={toggleSound}
              className={`text-sm px-3 py-1 rounded border ${isSoundEnabled 
                ? 'bg-blue-100 text-blue-700 border-blue-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'}`}
            >
              効果音: {isSoundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ゲームプレイ画面
  return (
    <div className="relative min-h-screen bg-gray-100 py-8">
      {/* 花びら演出 */}
      {showPerfectEffect && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: PETALS_CONFIG.COUNT }).map((_, index) => (
            <div
              key={index}
              style={generatePetalStyle(index)}
              className="petal"
            />
          ))}
        </div>
      )}

      {/* 効果音要素 - 表示はされないがHTMLに存在する必要がある */}
      <audio id={SOUND_IDS.SUCCESS} src={SOUND_PATHS.SUCCESS} preload="auto" />
      <audio id={SOUND_IDS.FAILURE} src={SOUND_PATHS.FAILURE} preload="auto" />
      <audio id={SOUND_IDS.COUNTDOWN} src={SOUND_PATHS.COUNTDOWN} preload="auto" />
      
      {/* コントロールボタンを画面上部に配置 */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md p-2 z-10 flex justify-between items-center">
        <div className="text-gray-700 font-semibold">
          <span className="mr-2">単語カードゲーム</span>
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {currentIndex + 1} / {sampleWords.length}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleSound}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            title={isSoundEnabled ? "効果音をオフにする" : "効果音をオンにする"}
          >
            {isSoundEnabled ? '🔊 ON' : '🔇 OFF'}
          </button>
          <button
            onClick={handlePause}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            {isPaused ? '▶️ 再開' : '⏸️ 一時停止'}
          </button>
          <button
            onClick={handleEndGame}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            🛑 終了
          </button>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeZoom {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes finalFadeOut {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; }
        }
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fade-out {
          animation: fadeOut 0.2s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-fade-zoom {
          animation: fadeZoom 0.5s ease-in-out;
        }
        .animate-final-fade-out {
          animation: finalFadeOut 0.8s ease-in-out forwards;
        }
        .petal {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* カードの上部にスペースを追加 */}
      <div className="pt-16 relative">
        <div className={`bg-white p-8 rounded-lg shadow-lg transition-all duration-300 ${getAnimationClass()}`} style={{ minHeight: '400px', minWidth: '320px' }}>
          {/* カードコンテンツ部分 - 常に固定サイズを維持 */}
          <div className="flex flex-col justify-between" style={{ minHeight: '320px' }}>
            <div>
              <h2 className="text-4xl font-bold mb-4 text-center">{currentWordRef.current.word}</h2>
              <p className="text-gray-600 mb-4 text-center">発音: {currentWordRef.current.pronunciation}</p>
              
              {showHint && (
                <div className="bg-yellow-100 p-3 rounded-lg mb-3 animate-fade-in">
                  <p className="text-yellow-800">ヒント: {currentWordRef.current.hint}</p>
                </div>
              )}

              <div className="text-center text-gray-700 mb-4">
                <p>"{currentWordRef.current.word}"を発音してください</p>
              </div>
            </div>

            <div className="mt-auto">
              {/* 録音状態表示 */}
              <div className={`mb-3 p-3 rounded-lg text-center ${
                isRecording ? 'bg-blue-50 animate-pulse' : 'bg-gray-50'
              }`}>
                <p>
                  {isRecording ? (
                    <span className="text-blue-600">..発音してください</span>
                  ) : isPaused ? (
                    <span className="text-gray-600">一時停止中</span>
                  ) : showFinalLoading ? (
                    <span className="text-green-600">結果を保存中... <span className="animate-pulse">●●●</span></span>
                  ) : cardAnimation !== CARD_ANIMATION.NONE ? (
                    <span className="text-green-600">次のカードへ移動中...</span>
                  ) : showAssessment && assessmentScore >= ACCURACY_THRESHOLD * 100 ? (
                    <span className="text-green-600">成功！次へ進みます</span>
                  ) : showAssessment ? (
                    <span className="text-orange-600">スコア不足。もう一度試してください</span>
                  ) : (
                    <span className="text-gray-600">準備中...</span>
                  )}
                </p>
              </div>

              {/* 認識テキスト表示 - より簡潔に */}
              {recognitionText && !showAssessment && (
                <div className="mb-3 p-2 bg-gray-50 rounded text-center text-sm">
                  <p>認識: <span className="font-semibold">{recognitionText}</span></p>
                </div>
              )}

              {/* 評価結果表示 - コンパクトに */}
              {showAssessment && (
                <div className="mb-3 border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1 border-b">
                    <h3 className="font-semibold text-sm">評価結果</h3>
                  </div>
                  <div className="p-3">
                    <div className="flex justify-center gap-6 mb-2">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">スコア</p>
                        <p className={`text-2xl font-bold ${
                          assessmentScore >= ACCURACY_THRESHOLD * 100 ? 'text-green-600' : 'text-orange-600'
                        }`}>{Math.round(assessmentScore)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">合格</p>
                        <p className="text-2xl font-bold text-gray-500">{ACCURACY_THRESHOLD * 100}%</p>
                      </div>
                    </div>
                    <p className="text-center text-sm">
                      {assessmentScore >= ACCURACY_THRESHOLD * 100 ? (
                        <span className="text-green-600 font-semibold">発音成功！</span>
                      ) : (
                        <span className="text-orange-600 font-semibold">もう一度挑戦</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 開発情報 - 折りたたみ状態にしておく */}
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 font-mono">
            <details>
              <summary className="font-bold cursor-pointer text-xs">開発情報</summary>
              <div className="mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <p>録音: {isRecording ? 'ON' : 'OFF'}</p>
                  <p>カード: {currentIndex + 1}</p>
                  <p>アニメ: {cardAnimation}</p>
                  <p>スコア: {assessmentScore.toFixed(1)}</p>
                  <p>効果音: {isSoundEnabled ? 'ON' : 'OFF'}</p>
                  <p>合格: {assessmentScore >= ACCURACY_THRESHOLD * 100 ? 'YES' : 'NO'}</p>
                  <p>評価ロック: {evaluationLockRef.current ? 'ON' : 'OFF'}</p>
                  <p>最終: {showFinalLoading ? 'YES' : 'NO'}</p>
                </div>
                <h4 className="font-bold mt-2 mb-1">ログ:</h4>
                <ul className="text-xs">
                  {logs.map((log, i) => (
                    <li key={i} className="truncate">{log}</li>
                  ))}
                </ul>

                {/* 開発用スキップボタン - コンパクト化 */}
                <div className="mt-1">
                  <button 
                    onClick={handleSkipCard}
                    className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs"
                  >
                    スキップ (開発用)
                  </button>
                </div>
              </div>
            </details>
          </div>

          {/* SpeechRecognition */}
          <div className="hidden">
            <SpeechRecognition 
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              setFeedback={setFeedback}
              feedback={feedback}
              referenceText={currentWordRef.current.word}
              onResult={handlePronunciationResult}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordCardGame;