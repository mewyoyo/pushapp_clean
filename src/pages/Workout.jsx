import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Workout.scss';

export default function WorkoutPage() {
  const { addWorkout, currentUser } = useAuth();
  const [phase, setPhase] = useState('idle');
  const [pushupCount, setPushupCount] = useState(0);
  const [makePublic, setMakePublic] = useState(true);
  const [videoBlob, setVideoBlob] = useState(null);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [saving, setSaving] = useState(false);

  const videoRef = useRef();
  const mediaRecRef = useRef();
  const streamRef = useRef();
  const chunksRef = useRef([]);

  const streak = currentUser?.current_streak || 0;

  useEffect(() => {
    let cancelled = false;
    async function setupCamera() {
      setError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().then(() => setCameraReady(true)).catch(console.error);
        }
      } catch (e) {
        setError('Camera access denied.');
        setCameraReady(false);
      }
    }
    setupCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  async function startWorkout() {
    if (!cameraReady || !streamRef.current) { setError('Camera not ready.'); return; }
    setPushupCount(0);
    chunksRef.current = [];
    setStartTime(Date.now());
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const recordingStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = recordingStream;
      if (videoRef.current) { videoRef.current.srcObject = recordingStream; videoRef.current.muted = true; videoRef.current.play(); }
      const rec = new MediaRecorder(recordingStream);
      mediaRecRef.current = rec;
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        restorePreviewStream();
        simulateAI();
      };
      rec.start();
      setPhase('recording');
    } catch (e) { setError('Failed to start recording.'); }
  }

  async function restorePreviewStream() {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch (e) { console.error(e); }
  }

  function stopRecording() {
    if (mediaRecRef.current && mediaRecRef.current.state === 'recording') {
      mediaRecRef.current.stop();
      setPhase('processing');
    }
  }

  function simulateAI() {
    setTimeout(() => {
      setPushupCount(Math.floor(Math.random() * 25) + 5);
      setPhase('result');
    }, 2000);
  }

  async function handlePublish() {
    setSaving(true);
    const videoUrl = videoBlob ? URL.createObjectURL(videoBlob) : null;
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 60;
    const result = await addWorkout(pushupCount, videoUrl, makePublic, duration);
    setSaving(false);
    if (result?.error) { setError(result.error); return; }
    setPhase('done');
  }

  if (phase === 'done') {
    return (
      <div className="workout-page">
        <div className="workout-success">
          <div className="success-icon">🏆</div>
          <div className="success-title">{pushupCount} push-ups!</div>
          <p>Workout saved{makePublic ? ' and published' : ''}!</p>
          <button className="btn-orange full" style={{ marginTop: 24 }} onClick={() => { setPhase('idle'); setVideoBlob(null); }}>
            New Workout
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
            <video ref={videoRef} className={`workout-video-stream${cameraReady ? ' ready' : ''}`} muted playsInline />
            {!cameraReady && !error && (
              <div className="camera-loading"><div className="spinner"></div>Starting camera...</div>
            )}
            {error && <div className="workout-error-overlay">{error}</div>}
          </div>
        )}

        {(phase === 'idle' || phase === 'recording') && (
          <div className={`workout-ui-overlay ${phase}`}>
            <div className="workout-stats-overlay">
              <div className="stats-label">TOTAL PUSH-UPS:</div>
              <div className="stats-counter">{pushupCount}</div>
              {streak > 0 && <div className="stats-streak">🔥 Streak: {streak} days</div>}
            </div>
            <div className="workout-actions-bottom">
              {phase === 'idle' && (
                <button className="btn-start-workout" onClick={startWorkout} disabled={!cameraReady}>
                  START WORKOUT
                </button>
              )}
              {phase === 'recording' && (
                <button className="btn-stop-workout" onClick={stopRecording}>STOP WORKOUT</button>
              )}
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div className="processing-view">
            <div className="processing-anim">🤖</div>
            <div className="processing-title">AI is counting your reps...</div>
            <div className="processing-dots"><span /><span /><span /></div>
          </div>
        )}

        {phase === 'result' && (
          <div className="result-view">
            <div className="result-count-wrap">
              <div className="result-label">Push-ups detected</div>
              <div className="result-count">{pushupCount}</div>
            </div>
            <div className="result-toggle-row" onClick={() => setMakePublic(v => !v)}>
              <div className="result-toggle-text">
                <span className="result-toggle-label">Publish video</span>
                <span className="result-toggle-sub">Everyone can see it in the feed</span>
              </div>
              <div className={`toggle${makePublic ? ' active' : ''}`} />
            </div>
            {error && <div style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <button className="btn-orange full" onClick={handlePublish} disabled={saving}>
              {saving ? 'Saving...' : 'Save Workout'}
            </button>
            <button className="btn-ghost full" onClick={() => setPhase('idle')}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
