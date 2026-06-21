import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { RTCView, type MediaStream } from 'react-native-webrtc';

import { Card, Pill } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import type { AgreementAgentStatus, AgreementCertificate } from '@/types/Agreement';

export function AgreementVideoPane({
  title,
  subtitle,
  verified,
  stream,
  cameraRef,
  cameraEnabled,
}: {
  title: string;
  subtitle: string;
  verified: boolean;
  stream?: MediaStream | null;
  cameraRef?: React.RefObject<CameraView | null>;
  cameraEnabled?: boolean;
}) {
  return (
    <Card style={styles.videoPane}>
      <View style={styles.videoHeader}>
        <View>
          <Text style={styles.videoTitle}>{title}</Text>
          <Text style={styles.videoSubtitle}>{subtitle}</Text>
        </View>
        <Pill label={verified ? 'Verified' : 'Pending'} tone={verified ? 'rgba(46,125,50,0.24)' : 'rgba(200,162,74,0.18)'} />
      </View>
      <View style={styles.videoSurface}>
        {stream ? (
          <RTCView objectFit="cover" streamURL={stream.toURL()} style={styles.rtcView} />
        ) : cameraRef && cameraEnabled ? (
          <CameraView ref={cameraRef} facing="front" mode="video" style={styles.rtcView} />
        ) : (
          <Text style={styles.videoInitial}>{title.slice(0, 1)}</Text>
        )}
      </View>
    </Card>
  );
}

export function PromptFundWitnessCard({
  status,
  message,
  children,
}: {
  status: AgreementAgentStatus;
  message: string;
  children?: ReactNode;
}) {
  return (
    <Card style={styles.agentCard}>
      <View style={styles.agentAvatar}>
        <View style={[styles.agentPulse, status === 'speaking' ? styles.agentPulseActive : null]} />
        <Text style={styles.agentAvatarText}>AI</Text>
      </View>
      <Text style={styles.agentName}>PromptFund Witness</Text>
      <Text style={styles.agentRole}>Neutral platform representative</Text>
      <Pill label={status} tone="rgba(64, 156, 255, 0.2)" />
      <View style={styles.waveform}>
        {Array.from({ length: 16 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.waveBar,
              {
                height: status === 'speaking' ? 12 + ((index * 7) % 28) : 10,
                opacity: status === 'processing' ? 0.45 : 1,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.agentMessage}>{message}</Text>
      {children}
    </Card>
  );
}

export function AgreementCertificatePanel({ certificate }: { certificate: AgreementCertificate | null }) {
  const rows = [
    ['Identity Verified', certificate?.identityVerified],
    ['Meeting Recorded', certificate?.meetingRecorded],
    ['Transcript Generated', certificate?.transcriptGenerated],
    ['AI Summary Generated', certificate?.aiSummaryGenerated],
    ['Agreement Signed', certificate?.agreementSigned],
    ['PromptFund Witness Verification', certificate?.promptFundWitnessVerified],
  ] as const;

  return (
    <Card>
      <Text style={styles.certificateTitle}>Agreement Certificate</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.certificateRow}>
          <Text style={styles.certificateLabel}>{label}</Text>
          <Text style={[styles.certificateValue, value ? styles.ok : styles.pending]}>
            {value ? 'Complete' : 'Pending'}
          </Text>
        </View>
      ))}
      <Text style={styles.hashLabel}>Agreement Hash</Text>
      <Text style={styles.hashValue}>{certificate?.agreementHash ?? 'Generated after archive'}</Text>
      <Text style={styles.hashLabel}>Meeting Recording ID</Text>
      <Text style={styles.hashValue}>{certificate?.meetingRecordingId ?? 'Stored after recording archive'}</Text>
      <Text style={styles.hashLabel}>Transcript ID</Text>
      <Text style={styles.hashValue}>{certificate?.transcriptId ?? 'Generated after transcript archive'}</Text>
      <Text style={styles.hashLabel}>Agreement Version</Text>
      <Text style={styles.hashValue}>{certificate?.agreementVersion ? `v${certificate.agreementVersion}` : 'Pending'}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  videoPane: {
    flex: 1,
    minHeight: 260,
  },
  videoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  videoTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  videoSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  videoSurface: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 180,
    borderRadius: radii.lg,
    backgroundColor: colors.black,
  },
  rtcView: {
    width: '100%',
    height: 220,
  },
  videoInitial: {
    color: colors.luxuryGold,
    fontSize: 58,
    fontWeight: '900',
  },
  agentCard: {
    alignItems: 'center',
    flex: 1,
    minHeight: 260,
  },
  agentAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(64, 156, 255, 0.18)',
  },
  agentPulse: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderWidth: 1,
    borderColor: 'rgba(64, 156, 255, 0.42)',
    borderRadius: 55,
  },
  agentPulseActive: {
    borderColor: 'rgba(64, 156, 255, 0.9)',
  },
  agentAvatarText: {
    color: '#9DCAFF',
    fontSize: 22,
    fontWeight: '900',
  },
  agentName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  agentRole: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  waveform: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    height: 42,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#409CFF',
  },
  agentMessage: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  certificateTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  certificateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  certificateLabel: {
    color: colors.muted,
    fontWeight: '700',
  },
  certificateValue: {
    fontWeight: '900',
  },
  ok: {
    color: colors.success,
  },
  pending: {
    color: colors.warning,
  },
  hashLabel: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  hashValue: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
});
