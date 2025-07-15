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

type EnrollmentStatus = 'LOADING_MODEL' | 'INITIALIZING_CAMERA' | 'DETECTING' | 'ERROR';

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
const EnrollmentView = ({ userUid, onCancel }: { userUid: string, onCancel: () => void }) => {
    const webcamRef = useRef<Webcam>(null);
    const modelRef = useRef<faceDetection.FaceDetector | null>(null);
    const animationFrameId = useRef<number | null>(null);

    const [status, setStatus] = useState<EnrollmentStatus>('LOADING_MODEL');
    const [captureStep, setCaptureStep] = useState(0);
    const [feedback, setFeedback] = useState({ text: "Loading AI Model...", type: "info" });
    const [isReadyForCapture, setIsReadyForCapture] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [guideColor, setGuideColor] = useState('border-slate-500');

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
                        setFeedback({ text: "Perfect! Hold steady...", type: "success" });
                        setIsReadyForCapture(true);
                        setGuideColor('stroke-green-500');
                    } else {
                        setFeedback({ text: validation.message, type: "error" });
                        setIsReadyForCapture(false);
                        setGuideColor('stroke-red-500');
                    }
                } else {
                    setIsReadyForCapture(false);
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

    const captureAndUpload = useCallback(async () => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        if (!webcamRef.current?.video || !userUid) return;

        setIsCapturing(true);
        setFeedback({ text: `Uploading photo ${captureStep + 1}...`, type: "info" });
        const imageSrc = webcamRef.current.getScreenshot();
        
        try {
            const storageRef = ref(storage, `face_enrollment/${userUid}/${captureStep}.jpg`);
            await uploadString(storageRef, imageSrc as string, 'data_url');
            
            setFeedback({ text: "Upload successful!", type: "success" });
            const nextStep = captureStep + 1;

            if (nextStep < 4) {
                setCaptureStep(nextStep);
                setIsReadyForCapture(false);
                setGuideColor('border-slate-500');
                setStatus('DETECTING'); // Restart detection for the next step
            } else {
                setFeedback({ text: "Enrollment complete! You're all set.", type: "success" });
                toast.success('Face recognition setup complete!');
                setTimeout(() => onCancel(), 2000);
            }
        } catch (error) {
            setFeedback({ text: "Upload failed. Please try again.", type: "error" });
            toast.error('Upload failed. Please try again.');
            setStatus('ERROR');
        } finally {
            setIsCapturing(false);
        }
    }, [webcamRef, captureStep, userUid, onCancel]);
    
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
        <div className="fixed inset-0 bg-slate-900 bg-opacity-95 z-50 flex flex-col items-center justify-between p-4">
            <div className="w-full max-w-2xl text-center">
                <ProgressIndicator currentStep={captureStep} />
                <p className="text-white font-semibold text-xl mt-2">
                    {captureInstructions[captureStep].text}
                </p>
            </div>

            <div className="relative w-[90vw] h-[55vh] max-w-md max-h-96">
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    mirrored={true}
                    className="w-full h-full object-cover rounded-2xl"
                    videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
                    onUserMedia={handleWebcamReady}
                    onUserMediaError={(err) => {
                        console.error("Camera Error:", err);
                        setFeedback({ text: "Camera permission denied. Please enable camera access in browser settings.", type: "error" });
                        setStatus('ERROR');
                    }}
                />
                <FaceShapeSVG guideColor={guideColor} />
            </div>

            <div className="w-full max-w-md text-center p-4 min-h-[120px]">
                {showSpinner || status === 'ERROR' ? (
                    <div className="flex flex-col items-center justify-center text-white">
                        {showSpinner && <LoadingSpinner />}
                        <p className={`mt-4 ${status === 'ERROR' ? 'text-red-400' : ''}`}>
                            {feedback.text}
                        </p>
                    </div>
                ) : (
                    <>
                        <p className={`mb-4 font-semibold ${feedback.type === 'success' ? 'text-green-400' : feedback.type === 'error' ? 'text-red-400' : 'text-white'}`}>
                            {feedback.text}
                        </p>
                        <Button
                            color="info"
                            label={isCapturing ? "Uploading..." : `Capture Photo`}
                            onClick={captureAndUpload}
                            disabled={!isReadyForCapture || isCapturing}
                        />
                        <Button
                            color="white"
                            label="Cancel"
                            onClick={onCancel}
                            outline
                            className="ml-4"
                            disabled={isCapturing}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

const FacialEnrollment = () => {
    const userUid = useAppSelector((state: RootState) => state.main.userUid);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasEnrollment, setHasEnrollment] = useState<boolean | null>(null);
    const { setActivePrompt } = usePromptManager();

    // Remove previous enrollment images if user chooses to edit
    const deleteExistingPhotos = useCallback(async () => {
        if (!userUid) return;
        const folderRef = ref(storage, `face_enrollment/${userUid}`);
        const listResult = await listAll(folderRef);
        const deletionPromises = listResult.items.map((item) => deleteObject(item));
        await Promise.allSettled(deletionPromises);
    }, [userUid]);

    // Determine if the user already has 4 enrollment photos uploaded
    const checkEnrollment = useCallback(async () => {
        if (!userUid) return;
        try {
            const folderRef = ref(storage, `face_enrollment/${userUid}`);
            const listResult = await listAll(folderRef);
            setHasEnrollment(listResult.items.length >= 4);
        } catch (error: any) {
            // If path doesn't exist treat as not enrolled
            if (error?.code === 'storage/object-not-found') {
                setHasEnrollment(false);
            } else {
                console.error('Error checking face enrollment', error);
                setHasEnrollment(false);
            }
        }
    }, [userUid]);

    // Run once on mount
    useEffect(() => {
        checkEnrollment();
    }, [checkEnrollment]);

    // Re-check when modal closes (possible new photos uploaded)
    useEffect(() => {
        if (!isModalOpen) {
            checkEnrollment();
        }
    }, [isModalOpen, checkEnrollment]);

    // Manage focus trapping prompt identifier
    useEffect(() => {
        if (isModalOpen) setActivePrompt('facial-enrollment');
        else setActivePrompt(null);
        return () => setActivePrompt(null);
    }, [isModalOpen, setActivePrompt]);

    if (!userUid || hasEnrollment === null) return null; // waiting for check

    const headerText = hasEnrollment ? 'Update your face data for better accuracy.' : 'Set up face recognition for quick attendance.';
    const subText = 'Ensure you are in a well-lit area and remove any masks or sunglasses.';
    const buttonLabel = hasEnrollment ? 'Edit Face Recognition' : 'Set Up Face Recognition';

    return (
        <div>
            {isModalOpen && <EnrollmentView userUid={userUid} onCancel={() => setIsModalOpen(false)} />}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/40 p-4 rounded-lg">
                <div className="text-white">
                    <p className="font-semibold">{headerText}</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-md">{subText}</p>
                    {hasEnrollment && (
                        <p className="text-xs text-amber-300 mt-2">Re-capturing will overwrite your previous photos.</p>
                    )}
                </div>
                <Button
                    color="info"
                    label={buttonLabel}
                    onClick={async () => {
                        if (hasEnrollment) {
                            await toast.promise(deleteExistingPhotos(), {
                                loading: 'Removing previous photos...',
                                success: 'Old photos removed. Proceed with capture.',
                                error: 'Failed to remove old photos. You can still recapture.'
                            });
                            // reset state to indicate no enrollment so progress indicators start fresh
                            setHasEnrollment(false);
                        }
                        setIsModalOpen(true);
                    }}
                    outline
                />
            </div>
        </div>
    );
};

export default FacialEnrollment; 