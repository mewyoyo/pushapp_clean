import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Workout.scss';

export default function WorkoutPage() {
  const { addWorkout } = useAuth();
  const [phase, setPhase] = useState('idle'); // idle | recording | uploading | processing | result
  const [pushupCount, setPushupCount] = useState(0);
  const [makePublic, setMakePublic] = useState(true);
  const [videoBlob, setVideoBlob] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState('');
  const [previewReady, setPreviewReady] = useState(false);
  const videoRef = useRef();
  const previewRef = useRef();
  const mediaRecRef = useRef();
  const streamRef = useRef();
  const chunksRef = useRef([]);
  const fileRef = useRef();

  // Request camera stream on mount — previewRef is always in DOM now so attach directly
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (previewRef.current) {
          previewRef.current.srcObject = stream;
          previewRef.current.play().catch(() => {});
          setPreviewReady(true);
        }
      })
      .catch(err => { console.error('CAMERA ERROR:', err.name, err.message); });
    return () => { cancelled = true; stopStream(); };
  }, []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function startRecording() {
    setError('');
    try {
      // Get a new stream with audio for recording (stop silent preview stream first)
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      mediaRecRef.current = rec;
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        stopStream();
        simulateAI();
      };
      rec.start();
      setPhase('recording');
    } catch (e) {
      setError('Не удалось получить доступ к камере. Разрешите доступ в браузере.');
    }
  }

  function stopRecording() {
    if (mediaRecRef.current && mediaRecRef.current.state === 'recording') {
      mediaRecRef.current.stop();
      setPhase('processing');
    }
  }

  function simulateAI() {
    setPhase('processing');
    setTimeout(() => {
      const count = Math.floor(Math.random() * 25) + 5;
      setPushupCount(count);
      setPhase('result');
    }, 2000);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setPhase('processing');
    setTimeout(() => {
      const count = Math.floor(Math.random() * 25) + 5;
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
          <button className="btn-orange full" style={{ marginTop: 24 }} onClick={() => setPhase('idle')}>
            Новая тренировка
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workout-page">
      <div className="workout-header">
        <div className="workout-title">ТРЕНИРОВКА</div>
        <div className="workout-subtitle">Запиши или загрузи видео с отжиманиями</div>
      </div>

      {/* Preview video always mounted so ref is available before getUserMedia resolves */}
      <div className="workout-camera-container" style={{ display: phase === 'idle' ? 'flex' : 'none' }}>
        <video
          ref={previewRef}
          className={`workout-bg-camera${previewReady ? ' ready' : ''}`}
          muted
          playsInline
        />
        {!previewReady && <div className="workout-camera-placeholder" />}

        <div className="workout-actions">
          <div className="workout-card camera-card" onClick={startRecording}>
            <div className="wcard-icon">🎥</div>
            <div className="wcard-title">Начать запись</div>
            <div className="wcard-desc">Запроси доступ к камере и запиши тренировку</div>
          </div>
          <div className="workout-card upload-card" onClick={() => fileRef.current.click()}>
            <div className="wcard-icon">📁</div>
            <div className="wcard-title">Загрузить видео</div>
            <div className="wcard-desc">Выбери готовое видео с устройства</div>
            <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>
          {error && <div className="workout-error">{error}</div>}
        </div>
      </div>

      {phase === 'recording' && (
        <div className="recording-view">
          <div className="video-preview-wrap">
            <video ref={videoRef} className="video-preview" muted playsInline />
            <div className="rec-badge">⏺ REC</div>
          </div>
          <div className="rec-hint">Отжимайся перед камерой</div>
          <button className="btn-stop" onClick={stopRecording}>⏹ Завершить запись</button>
        </div>
      )}

      {phase === 'processing' && (
        <div className="processing-view">
          <div className="processing-anim">🤖</div>
          <div className="processing-title">ИИ считает отжимания...</div>
          <div className="processing-dots">
            <span /><span /><span />
          </div>
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
          <button className="btn-orange full" onClick={handlePublish}>Сохранить тренировку</button>
          <button className="btn-ghost full" style={{ marginTop: 10 }} onClick={() => setPhase('idle')}>Отмена</button>
        </div>
      )}

      {/* hidden video element for camera phase */}
      {phase !== 'recording' && <video ref={videoRef} style={{ display: 'none' }} />}
    </div>
  );
}
