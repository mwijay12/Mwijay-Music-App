
import React, { useRef, useEffect, useState } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface CameraCaptureModalProps {
    onCapture: (dataUrl: string) => void;
    onClose: () => void;
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);

    useEffect(() => {
        const getDevices = async () => {
            try {
                const deviceInfos = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
                setDevices(videoDevices);
                if (videoDevices.length > 0) {
                    setCurrentDeviceId(videoDevices[0].deviceId);
                }
            } catch (err) {
                console.error("Error enumerating devices:", String(err));
            }
        };
        getDevices();
    }, []);
    
    useEffect(() => {
        let stream: MediaStream | null = null;
        
        const startCamera = async () => {
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { 
                            deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined,
                            facingMode: !currentDeviceId ? 'user' : undefined 
                        }
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } else {
                    setError("Camera not supported on this browser.");
                }
            } catch (err) {
                console.error("Error accessing camera:", String(err));
                setError("Could not access camera. Please check permissions.");
            }
        };

        if (devices.length > 0) {
            startCamera();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [currentDeviceId, devices]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg');
            onCapture(dataUrl);
        }
    };
    
    const switchCamera = () => {
        if (devices.length > 1) {
            const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
            const nextIndex = (currentIndex + 1) % devices.length;
            setCurrentDeviceId(devices[nextIndex].deviceId);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center" onClick={onClose}>
            <div className="relative w-full h-full" onClick={e => e.stopPropagation()}>
                {error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-4">
                        <AlertTriangle size={48} className="mb-4" />
                        <p>{error}</p>
                    </div>
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-around items-center bg-gradient-to-t from-black/80 to-transparent">
                <button onClick={onClose} className="text-white text-2xl w-16 h-16 rounded-full flex items-center justify-center" aria-label="Cancel">
                    <X size={32} />
                </button>
                <button onClick={handleCapture} className="w-20 h-20 bg-white rounded-full border-4 border-black/50" aria-label="Take Photo"></button>
                 <button onClick={switchCamera} disabled={devices.length <= 1} className="text-white text-2xl w-16 h-16 rounded-full flex items-center justify-center disabled:opacity-50" aria-label="Switch camera">
                    <RefreshCw size={32} />
                </button>
            </div>
        </div>
    );
};

export default CameraCaptureModal;
