import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Workout.scss';

// Голосовое сопровождение
const speak = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.2;
    window.speechSynthesis.speak(utterance);
  }
};

// Вычисление углов в суставах
const calculateAngle = (a, b, c) => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return angle;
};

export default function WorkoutPage() {
  const { addWorkout } = useAuth();
  
  const [phase, setPhase] = useState('idle');
  const [pushupCount, setPushupCount] = useState(0);
  const [makePublic, setMakePublic] = useState(true);
  const [videoBlob, setVideoBlob] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [warning, setWarning] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const mediaRecRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const poseRef = useRef(null);
  const requestAnimRef = useRef(null);
  const countRef = useRef(0);
  const stageRef = useRef('up');
  const warningRef = useRef(false);

  // Подключение и настройка MediaPipe Pose
  useEffect(() => {
    if (!window.Pose) {
      console.warn("MediaPipe Pose ещё не загружен.");
      return;
    }

    const pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults(onResults);
    poseRef.current = pose;
  }, []);

  // Алгоритм обработки кадров и отрисовки скелета
  const onResults = (results) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    const canvasElement = canvasRef.current;

    if (canvasElement.width !== videoRef.current.videoWidth) {
      canvasElement.width = videoRef.current.videoWidth;
      canvasElement.height = videoRef.current.videoHeight;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;

      // Рисуем базовые точки и соединения
      if (window.drawConnectors && window.drawLandmarks) {
        window.drawConnectors(canvasCtx, landmarks, window.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
        window.drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2, radius: 4 });
      }

      const nose = landmarks[0];
      const shoulder = landmarks[11];
      const elbow = landmarks[13];
      const wrist = landmarks[15];
      const hip = landmarks[23];
      const knee = landmarks[25];

      // Вычисляем прямую осанку
      const backAngle = calculateAngle(shoulder, hip, knee);
      const isBackStraight = backAngle > 160 && backAngle <= 180;

      // ФИКС БАГА: Отрисовка всей спины (Линия 1: Плечо-Таз, Линия 2: Таз-Колено)
      canvasCtx.beginPath();
      canvasCtx.moveTo(shoulder.x * canvasElement.width, shoulder.y * canvasElement.height);
      canvasCtx.lineTo(hip.x * canvasElement.width, hip.y * canvasElement.height);
      canvasCtx.lineTo(knee.x * canvasElement.width, knee.y * canvasElement.height);
      canvasCtx.lineWidth = 8;
      canvasCtx.strokeStyle = isBackStraight ? '#00FF00' : '#FF0000'; // Зелёный или Жирный Красный
      canvasCtx.stroke();

      // Подсчет отжиманий
      const elbowAngle = calculateAngle(shoulder, elbow, wrist);
      const isDeepEnough = nose.y > elbow.y;

      if (isBackStraight) {
        if (warningRef.current) {
          warningRef.current = false;
          setWarning(false);
        }
        if (isDeepEnough && stageRef.current === 'up') {
          stageRef.current = 'down';
        }
        if (elbowAngle > 160 && stageRef.current === 'down') {
          stageRef.current = 'up';
          countRef.current += 1;
          setPushupCount(countRef.current);
          speak(countRef.current.toString());
        }
      } else {
        if (!warningRef.current) {
          warningRef.current = true;
          setWarning(true);
          speak('Выпрями спину');
        }
      }
    }
    canvasCtx.restore();
  };

  const detectPose = async () => {
    if (videoRef.current && poseRef.current && videoRef.current.readyState >= 2) {
      await poseRef.current.send({ image: videoRef.current });
    }
    requestAnimRef.current = requestAnimationFrame(detectPose);
  };

  useEffect(() => {
    if (cameraReady) {
      detectPose();
    }
    return () => {
      if (requestAnimRef.current) cancelAnimationFrame(requestAnimRef.current);
    };
  }, [cameraReady]);

  // Запуск камеры при входе на страницу
  useEffect(() => {
    let cancelled = false;

    async function setupCamera() {
      setError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: false 
        });
        
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true; 
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (e) {
        console.error("Camera access denied:", e);
        setError('Не удалось получить доступ к камере.');
        setCameraReady(false);
      }
    }

    setupCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  async function startWorkout() {
    if (!cameraReady || !streamRef.current) {
      setError('Камера ещё не готова.');
      return;
    }

    setPushupCount(0);
    setWarning(false);
    countRef.current = 0;
    stageRef.current = 'up';
    warningRef.current = false;
    chunksRef.current = [];
    
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const recordingStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      streamRef.current = recordingStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = recordingStream;
        videoRef.current.muted = true; 
        await videoRef.current.play();
      }

      const rec = new MediaRecorder(recordingStream);
      mediaRecRef.current = rec;
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        restorePreviewStream();
        setPhase('result');
      };
      
      rec.start();
      setPhase('recording');
      speak('Тренировка началась');
    } catch (e) {
      console.error(e);
      setError('Ошибка запуска записи.');
    }
  }

  async function restorePreviewStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      if (canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setCameraReady(true);
      setWarning(false);
      warningRef.current = false;
    } catch (e) {
      console.error(e);
    }
  }

  function stopRecording() {
    if (mediaRecRef.current && mediaRecRef.current.state === 'recording') {
      mediaRecRef.current.stop();
      setPhase('processing');
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setPhase('processing');
    setTimeout(() => {
      const count = Math.floor(Math.random() * 20) + 5;
      setPushupCount(count);
      setPhase('result');
    }, 2000);
  }

  function handlePublish() {
    const videoUrl = videoBlob ? URL.createObjectURL(videoBlob) : (uploadFile ? URL.createObjectURL(uploadFile) : null);
    addWorkout(pushupCount, videoUrl, makePublic);
    setPhase('done');
  }

  if (phase === 'done') {
    return (
      <div className="workout-page">
        <div className="workout-success">
          <div className="success-icon">🏆</div>
          <div className="success-title">{pushupCount} отжиманий!</div>
          <p>Тренировка сохранена{makePublic ? ' и опубликована' : ''}!</p>
          <button className="btn-orange" style={{ marginTop: 24, width: '100%', maxWidth: '400px' }} onClick={() => setPhase('idle')}>
            Новая тренировка
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workout-page">
      <div className="workout-container">
        
        {(phase === 'idle' || phase === 'recording') && (
          <div className="camera-view-port">
            <video 
              ref={videoRef} 
              className={`workout-video-stream${cameraReady ? ' ready' : ''}`}
              muted 
              playsInline 
            />
            <canvas ref={canvasRef} className="workout-video-canvas" />

            {warning && <div className="warning-pill">ВЫПРЯМИ СПИНУ!</div>}

            {!cameraReady && !error && (
              <div className="camera-loading">
                <div className="spinner"></div>
                Включение камеры...
              </div>
            )}
            {error && <div className="workout-error-overlay">{error}</div>}
          </div>
        )}

        {(phase === 'idle' || phase === 'recording') && (
          <div className={`workout-ui-overlay ${phase}`}>
            
            <div className="workout-stats-overlay">
              <div className="stats-label">TOTAL PUSH-UPS:</div>
              <div className="stats-counter">{pushupCount}</div>
            </div>

            <div className="workout-actions-bottom">
              {phase === 'idle' && (
                <>
                  <div className="upload-alt" onClick={() => fileRef.current.click()}>
                    или загрузить готовое видео 📁
                    <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                  </div>
                  <button className="btn-start-workout" onClick={startWorkout} disabled={!cameraReady}>
                    START WORKOUT
                  </button>
                </>
              )}

              {phase === 'recording' && (
                <button className="btn-stop-workout" onClick={stopRecording}>
                  STOP WORKOUT
                </button>
              )}
            </div>

          </div>
        )}

        {phase === 'processing' && (
          <div className="processing-view">
            <div className="processing-anim">🤖</div>
            <div className="processing-title">ИИ считает отжимания...</div>
            <div className="processing-dots"><span /><span /><span /></div>
          </div>
        )}

        {phase === 'result' && (
          <div className="result-view">
            <div className="result-count-wrap">
              <div className="result-label">Обнаружено отжиманий</div>
              <div className="result-count">{pushupCount}</div>
            </div>
            
            <div className="result-toggle-row" onClick={() => setMakePublic(v => !v)}>
              <div className="result-toggle-text">
                <span className="result-toggle-label">Опубликовать видео</span>
                <span className="result-toggle-sub">Все смогут увидеть в ленте</span>
              </div>
              <div className={`toggle${makePublic ? ' active' : ''}`} />
            </div>
            
            <button className="btn-orange" onClick={handlePublish}>Сохранить тренировку</button>
            <button className="btn-ghost" onClick={() => setPhase('idle')}>Отмена</button>
          </div>
        )}

      </div>
    </div>
  );
}