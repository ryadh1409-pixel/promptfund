import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

export function useAgreementRecording() {
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioState = useAudioRecorderState(audioRecorder);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);

  useEffect(() => {
    async function preparePermissions() {
      const audioPermission = await AudioModule.requestRecordingPermissionsAsync();
      if (!audioPermission.granted) {
        Alert.alert('Microphone permission denied', 'Ai PromptFund needs microphone access to record agreement audio.');
      }

      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    }

    preparePermissions();
  }, [cameraPermission?.granted, requestCameraPermission]);

  const startRecording = useCallback(async () => {
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setAudioUri(null);
    setVideoUri(null);

    if (cameraRef.current) {
      setIsVideoRecording(true);
      cameraRef.current
        .recordAsync({
          maxDuration: 7200,
        })
        .then((recording) => {
          if (recording?.uri) {
            setVideoUri(recording.uri);
          }
        })
        .finally(() => setIsVideoRecording(false));
    }
  }, [audioRecorder]);

  const stopRecording = useCallback(async () => {
    if (audioState.isRecording) {
      await audioRecorder.stop();
      setAudioUri(audioRecorder.uri ?? null);
    }

    if (isVideoRecording) {
      cameraRef.current?.stopRecording();
    }
  }, [audioRecorder, audioState.isRecording, isVideoRecording]);

  return {
    cameraRef,
    cameraPermission,
    audioState,
    audioUri,
    videoUri,
    isRecording: audioState.isRecording || isVideoRecording,
    isCameraEnabled,
    isMicEnabled,
    isScreenSharing,
    setIsCameraEnabled,
    setIsMicEnabled,
    setIsScreenSharing,
    startRecording,
    stopRecording,
  };
}
