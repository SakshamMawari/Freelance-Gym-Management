import { useEffect, useRef, useState } from 'react';

export default function CameraCapture({ onPhotoChange }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [preview, setPreview] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), []);
  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) return setError('Camera is unavailable here. Choose a photo instead.');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' } }, audio: false });
      videoRef.current.srcObject = streamRef.current;
      setCapturing(true);
    } catch {
      setError('Camera permission was denied or unavailable. Choose a photo instead.');
    }
  };
  const stop = () => { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setCapturing(false); };
  const capture = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); setPreview(url); onPhotoChange(blob, url); stop(); }, 'image/jpeg', .86);
  };
  const chooseFile = event => { const file = event.target.files?.[0]; if (!file) return; const url = URL.createObjectURL(file); setPreview(url); onPhotoChange(file, url); };
  return <div className="camera-capture"><div className="camera-preview">{capturing ? <video ref={videoRef} autoPlay playsInline muted /> : preview ? <img src={preview} alt="Member preview" /> : <span>No photo captured</span>}</div><div className="form-actions">{capturing ? <><button type="button" className="primary-btn" onClick={capture}>Capture</button><button type="button" className="outline-btn" onClick={stop}>Cancel</button></> : <><button type="button" className="secondary-btn" onClick={start}>Open camera</button>{preview && <button type="button" className="outline-btn" onClick={start}>Retake</button>}<label className="outline-btn file-button">Choose photo<input type="file" accept="image/*" onChange={chooseFile} /></label></>}</div>{error && <div className="error-text">{error}</div>}<small className="camera-note">Camera access can be limited in installed iOS Safari PWAs; manual photo upload remains available.</small></div>;
}
