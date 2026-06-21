import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mediaDevices,
  MediaStream,
  RTCPeerConnection,
  type RTCIceCandidate,
  type RTCSessionDescription,
} from 'react-native-webrtc';

const peerConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useAgreementWebRTC() {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState('new');

  const createPeerConnection = useCallback(() => {
    const connection = new RTCPeerConnection(peerConfig);

    const eventTarget = connection as RTCPeerConnection & {
      addEventListener: (eventName: 'connectionstatechange' | 'track', listener: (event: any) => void) => void;
    };

    eventTarget.addEventListener('connectionstatechange', () => {
      setConnectionState(connection.connectionState);
    });

    eventTarget.addEventListener('track', (event) => {
      const [stream] = event.streams;
      if (stream) {
        setRemoteStream(stream);
      }
    });

    peerConnection.current = connection;
    return connection;
  }, []);

  const joinMeeting = useCallback(async () => {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: 'user',
      },
    });
    const connection = peerConnection.current ?? createPeerConnection();

    stream.getTracks().forEach((track) => {
      connection.addTrack(track, stream);
    });

    setLocalStream(stream);
    return stream;
  }, [createPeerConnection]);

  const createOffer = useCallback(async () => {
    const connection = peerConnection.current ?? createPeerConnection();
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    return offer;
  }, [createPeerConnection]);

  const acceptOffer = useCallback(
    async (offer: RTCSessionDescription) => {
      const connection = peerConnection.current ?? createPeerConnection();
      await connection.setRemoteDescription(offer);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      return answer;
    },
    [createPeerConnection],
  );

  const acceptAnswer = useCallback(async (answer: RTCSessionDescription) => {
    await peerConnection.current?.setRemoteDescription(answer);
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidate) => {
    await peerConnection.current?.addIceCandidate(candidate);
  }, []);

  const leaveMeeting = useCallback(() => {
    localStream?.getTracks().forEach((track) => track.stop());
    remoteStream?.getTracks().forEach((track) => track.stop());
    peerConnection.current?.close();
    peerConnection.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('closed');
  }, [localStream, remoteStream]);

  useEffect(() => leaveMeeting, [leaveMeeting]);

  return {
    localStream,
    remoteStream,
    connectionState,
    joinMeeting,
    leaveMeeting,
    createOffer,
    acceptOffer,
    acceptAnswer,
    addIceCandidate,
  };
}
