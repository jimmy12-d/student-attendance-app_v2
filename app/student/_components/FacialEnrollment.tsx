"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import Button from '@/app/_components/Button';
import { storage } from '@/firebase-config';
import { ref, uploadString, listAll, deleteObject } from 'firebase/storage';
import { useAppSelector } from '@/app/_stores/hooks';
import { RootState } from '@/app/_stores/store';
import { usePromptManager } from '@/app/_hooks/usePromptManager';
import LoadingSpinner from '@/app/_components/LoadingSpinner'; // Import the spinner

// --- TensorFlow.js and Face Detection Imports ---
import * as tf from '@tensorflow/tfjs';
import * as faceDetection from '@tensorflow-models/face-detection';
import { toast } from 'sonner';
import { getFunctions, httpsCallable } from "firebase/functions";


type EnrollmentStatus = 'LOADING_MODEL' | 'INITIALIZING_CAMERA' | 'DETECTING' | 'ERROR' | 'UPLOADING' | 'COMPLETE';
const DWELL_TIME_FOR_CAPTURE = 1500; // 1.5 seconds

const captureInstructions = [
    { text: "Center your face in the oval and look directly at the camera.", pose: 'straight' },
    { text: "Great! Now, slowly turn your head slightly to the left.", pose: 'left' },
    { text: "Excellent. Now, please turn your head slightly to the right.", pose: 'right' },
    { text: "Perfect! One last shot looking directly at the camera.", pose: 'straight' },
];

const FaceShapeSVG = ({ guideColor }: { guideColor: string }) => (
    <svg viewBox="0 0 300 400" className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <path 
            d="M 150,50 Q 50,150 50,250 C 50,350 100,400 150,390 C 200,400 250,350 250,250 Q 250,150 150,50 Z" 
            strokeWidth="6"
            strokeDasharray="15 10"
            fill="none"
            className={`transition-all duration-300 ${guideColor}`}
        />
    </svg>
);


const ProgressIndicator = ({ currentStep }: { currentStep: number }) => (
    <div className="flex justify-center items-center space-x-3 my-4">
        {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center">
                <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all duration-300 ${
                        index < currentStep ? 'bg-green-500' : 
                        index === currentStep ? 'bg-company-purple scale-110' : 'bg-slate-600'
                    }`}
                >
                    {index < currentStep ? '✔' : index + 1}
                </div>
                {index < 3 && <div className={`h-1 w-8 transition-all duration-300 ${index < currentStep ? 'bg-green-500' : 'bg-slate-600'}`}></div>}
            </div>
        ))}
    </div>
);

// --- The Main Enrollment Modal Component ---
const EnrollmentView = ({ userUid, onCancel, onComplete }: { userUid: string, onCancel: () => void, onComplete: () => void }) => {
    const webcamRef = useRef<Webcam>(null);
    const modelRef = useRef<faceDetection.FaceDetector | null>(null);
    const animationFrameId = useRef<number | null>(null);

    const [status, setStatus] = useState<EnrollmentStatus>('LOADING_MODEL');
    const [captureStep, setCaptureStep] = useState(0);
    const [feedback, setFeedback] = useState({ text: "Loading AI Model...", type: "info" });
    const [isReadyForCapture, setIsReadyForCapture] = useState(false);
    const [guideColor, setGuideColor] = useState('stroke-slate-500');
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [dwellStart, setDwellStart] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // --- Sound ---
    useEffect(() => {
        audioRef.current = new Audio('/success_sound_2.mp3');
    }, []);

    const playSuccessSound = () => {
        audioRef.current?.play().catch(e => console.error("Error playing sound:", e));
    };


    // Load AI model
    useEffect(() => {
        const loadModel = async () => {
            try {
                setStatus('LOADING_MODEL');
                console.log('Starting model loading...');
                await tf.setBackend('webgl');
                await tf.ready();
                console.log(`Backend webgl ready`);

                console.log('Loading face detector model...');
                const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
                // Lower the detection score threshold to make it more lenient
                const detectorConfig = { 
                    runtime: 'tfjs' as const,
                    modelType: 'short' as const,
                    maxFaces: 1,
                    scoreThreshold: 0.5, // Lowered from default of 0.8
                 };
                modelRef.current = await faceDetection.createDetector(model, detectorConfig);
                
                console.log('Model loaded successfully');
                setStatus('INITIALIZING_CAMERA');
                setFeedback({ text: "Initializing Camera...", type: "info" });
                
            } catch (error) {
                console.error("Error loading model:", error);
                setFeedback({ text: "Failed to load AI model. Please refresh and try again.", type: "error" });
                setStatus('ERROR');
            }
        };
        loadModel();
    }, []);

    // This effect polls the webcam to see when it's ready, then starts detection.
    useEffect(() => {
        if (status === 'INITIALIZING_CAMERA') {
            const intervalId = setInterval(() => {
                if (webcamRef.current?.video && webcamRef.current.video.readyState === 4) {
                    clearInterval(intervalId);
                    setStatus('DETECTING');
                }
            }, 500); // Check every half-second

            return () => clearInterval(intervalId);
        }
    }, [status]);

    const detectFace = useCallback(async () => {
        if (status !== 'DETECTING' || !webcamRef.current?.video || !modelRef.current) return;

        const video = webcamRef.current.video;
        if (video.readyState === 4) {
            try {
                const faces = await modelRef.current.estimateFaces(video, { flipHorizontal: false });

                if (faces.length > 0) {
                    const face = faces[0];
                    const validation = validateFaceQuality(face);
                    
                    if (validation.isValid) {
                        if (dwellStart === null) {
                            setDwellStart(Date.now());
                            setFeedback({ text: "Perfect! Hold steady...", type: "success" });
                            setGuideColor('stroke-green-500');
                        } else if (Date.now() - dwellStart >= DWELL_TIME_FOR_CAPTURE) {
                            // Dwell time met, trigger capture
                            handleCapture();
                            setDwellStart(null); // Reset for next capture
                        }
                    } else {
                        setDwellStart(null); // Reset dwell time if face is invalid
                        setFeedback({ text: validation.message, type: "error" });
                        setGuideColor('stroke-red-500');
                    }
                } else {
                    setDwellStart(null);
                    setGuideColor('stroke-red-500');
                    setFeedback({ text: "No face detected", type: "error" });
                }
            } catch (error) {
                console.error('Face detection error:', error);
                setFeedback({ text: "Face detection error. Please try refreshing.", type: "error" });
                setStatus('ERROR');
            }
        }
        animationFrameId.current = requestAnimationFrame(detectFace);
    }, [captureStep, status]);

    // Simplified face quality validation
    const validateFaceQuality = (face: faceDetection.Face) => {
        const { box } = face;

        // The box coordinates from this model might still be inconsistent.
        // The most important thing is that a face was detected at all.
        // We'll perform a very basic size check if the coordinates are valid.
        if (box.width > 0 && box.height > 0) {
            if (box.width < 50 || box.height < 50) {
                return { isValid: false, message: "Move closer to the camera" };
            }
             if (box.width > 400 || box.height > 400) {
                return { isValid: false, message: "Move back a little" };
            }
        }
        
        // If a face is detected, we'll accept it, as this is our main challenge.
        return { isValid: true, message: "Perfect!" };
    };

    // This effect starts the detection loop once all prerequisites are met.
    useEffect(() => {
        if (status === 'DETECTING') {
            animationFrameId.current = requestAnimationFrame(detectFace);
        } else {
            // Cleanup in case status changes unexpectedly
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        }

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [status, detectFace]);
    

    const handleWebcamReady = () => {
        // This is now handled by the polling useEffect, so this function is intentionally empty.
    };

    const handleCapture = useCallback(() => {
        if (!webcamRef.current?.video || captureStep >= 4) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
            const base64Image = imageSrc.split(',')[1];
            const newImages = [...capturedImages, base64Image];
            setCapturedImages(newImages);

            const nextStep = captureStep + 1;
            setCaptureStep(nextStep);
            
            if (nextStep < 4) {
                 setFeedback({ text: "Great shot! Get ready for the next one...", type: "success" });
            } else {
                setFeedback({ text: "All photos captured! Uploading...", type: "info" });
                uploadAllImages(newImages);
            }
        }
    }, [webcamRef, captureStep, capturedImages]);


    const uploadAllImages = useCallback(async (imagesToUpload: string[]) => {
        if (!userUid || imagesToUpload.length < 4) return;

        setStatus('UPLOADING');
        setFeedback({ text: "Processing your facial data...", type: "info" });
        
        const functions = getFunctions();
        const processImages = httpsCallable(functions, 'processFaceEnrollmentImages');

        toast.promise(
            processImages({ images: imagesToUpload }),
            {
                loading: 'Analyzing and storing your facial profile...',
                success: () => {
                    playSuccessSound();
                    setStatus('COMPLETE');
                    setFeedback({ text: "Enrollment complete! You're all set.", type: "success" });
                    setTimeout(() => onComplete(), 2000); // Call onComplete passed from parent
                    return 'Face recognition setup complete!';
                },
                error: (err) => {
                    setStatus('ERROR');
                    setFeedback({ text: "Processing failed. Please try again.", type: "error" });
                    // Reset for another attempt
                    setCaptureStep(0);
                    setCapturedImages([]);
                    return `Enrollment failed: ${err.message}`;
                },
            }
        );
    }, [userUid, onComplete]);

    // Cleanup effect on unmount
    useEffect(() => {
        return () => {
            if (webcamRef.current?.stream) {
                webcamRef.current.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const showSpinner = status === 'LOADING_MODEL';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg mx-4 text-white shadow-xl">
                <h2 className="text-2xl font-bold text-center mb-2">Face Recognition Setup</h2>
                
                <ProgressIndicator currentStep={captureStep} />

                <p className="text-center text-lg h-12 my-2 transition-colors duration-300"
                   style={{ color: feedback.type === 'error' ? '#ef4444' : '#10b981' }}
                >
                    {captureStep < 4 ? captureInstructions[captureStep].text : feedback.text}
                </p>

                <div className="relative w-full aspect-square mx-auto my-4 rounded-lg overflow-hidden">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover"
                        videoConstraints={{ width: 480, height: 480, facingMode: 'user' }}
                        style={{ transform: "scaleX(-1)" }}
                        onUserMedia={handleWebcamReady}
                    />
                    <FaceShapeSVG guideColor={guideColor} />
                    
                    {status === 'LOADING_MODEL' || status === 'INITIALIZING_CAMERA' ? (
                         <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                            <LoadingSpinner />
                            <p className="mt-4 text-lg">{feedback.text}</p>
                         </div>
                    ) : null}
                </div>

                <div className="flex justify-center mt-4">
                     {/* The capture button is now removed in favor of automatic capture */}
                     <Button 
                        color="danger" 
                        label="Cancel" 
                        onClick={onCancel} 
                        outline 
                     />
                </div>
            </div>
        </div>
    );
};

const FacialEnrollment = () => {
    const userUid = useAppSelector((state: RootState) => state.main.userUid);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasEnrollment, setHasEnrollment] = useState<boolean | null>(null);
    const { setActivePrompt } = usePromptManager();

    // The logic to check for existing files in storage is no longer the source of truth,
    // as embeddings are now stored in Firestore. We should check for the presence of
    // the 'facialEmbeddings' field in the student's document instead.
    // For now, we will simplify and assume no enrollment to show the button.
    // A more robust solution would fetch this from the user's profile state.
    
    // This hook is now simplified. We no longer need to check storage.
    useEffect(() => {
        // In a real app, you'd fetch the user's profile from Firestore
        // and check if `doc.data().facialEmbeddings` exists and has items.
        // For this implementation, we'll just show the button.
        setHasEnrollment(false); // Default to show the setup button
    }, [userUid]);


    // Re-check when modal closes (possible new photos uploaded)
    const handleEnrollmentComplete = () => {
        setIsModalOpen(false);
        setHasEnrollment(true); // Assume success
    };

    // Manage focus trapping prompt identifier
    useEffect(() => {
        if (isModalOpen) setActivePrompt('facial-enrollment');
        else setActivePrompt(null);
        return () => setActivePrompt(null);
    }, [isModalOpen, setActivePrompt]);

    if (!userUid) return null; // Don't render if no user

    const headerText = hasEnrollment ? 'Update your face data for better accuracy.' : 'Set up face recognition for quick attendance.';
    const subText = 'Ensure you are in a well-lit area and remove any masks or sunglasses.';
    const buttonLabel = hasEnrollment ? 'Edit Face Recognition' : 'Set Up Face Recognition';

    return (
        <div>
            {isModalOpen && <EnrollmentView userUid={userUid} onCancel={() => setIsModalOpen(false)} onComplete={handleEnrollmentComplete} />}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/40 p-4 rounded-lg">
                <div className="text-white">
                    <p className="font-semibold">{headerText}</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-md">{subText}</p>
                </div>
                <Button
                    color="info"
                    label={buttonLabel}
                    onClick={() => setIsModalOpen(true)}
                    outline
                />
            </div>
        </div>
    );
};

export default FacialEnrollment; 