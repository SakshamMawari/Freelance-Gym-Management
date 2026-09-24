import { useEffect, useRef, useState } from 'react';

export default function CameraCapture({ onPhotoChange }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [preview, setPreview] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [error, setError] = useState('');

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), []);
  useEffect(() => {
    if (capturing && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [capturing]);
  const stop = () => { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setCapturing(false); };
  const start = async mode => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) return setError('Camera is unavailable here. Choose a photo instead.');
    streamRef.current?.getTracks().forEach(track => track.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setFacingMode(mode);
      setCapturing(true);
    } catch {
      setError('Camera permission was denied or unavailable. Choose a photo instead.');
    }
  };
  const switchCamera = () => start(facingMode === 'user' ? 'environment' : 'user');
  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280; canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); setPreview(url); onPhotoChange(blob, url); stop(); }, 'image/jpeg', .86);
  };
  const chooseFile = event => { const file = event.target.files?.[0]; if (!file) return; const url = URL.createObjectURL(file); setPreview(url); onPhotoChange(file, url); };
  return <div className="camera-capture">{capturing ? <div className="camera-overlay" role="dialog" aria-label="Camera capture"><button type="button" className="camera-close-btn" onClick={stop} aria-label="Close camera">×</button><video ref={videoRef} autoPlay playsInline muted /><div className="camera-overlay-actions"><button type="button" className="camera-switch-btn" onClick={switchCamera} aria-label="Switch camera">↻</button><button type="button" className="camera-capture-btn" onClick={capture}>Capture</button></div></div> : <><div className="photo-avatar-frame">{preview ? <img className="photo-avatar" src={preview} alt="Member preview" /> : <div className="photo-avatar-empty" aria-label="No member photo"><span>+</span></div>}</div><div className="form-actions"><button type="button" className="secondary-btn" onClick={() => start(facingMode)}>Open camera</button>{preview && <button type="button" className="outline-btn" onClick={() => start(facingMode)}>Retake</button>}<label className="outline-btn file-button">Choose photo<input type="file" accept="image/*" onChange={chooseFile} /></label></div></>}{error && <div className="error-text">{error}</div>}</div>;
}
