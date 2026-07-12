import { printToFileAsync } from 'expo-print';

import type { AgreementCertificate, AgreementRoom, AgreementSummary, AgreementTranscript } from '@/types/Agreement';

function escapeHtml(value: string | number | boolean | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function generateAgreementPdf({
  room,
  transcript,
  summary,
  certificate,
}: {
  room: AgreementRoom;
  transcript: AgreementTranscript[];
  summary: AgreementSummary;
  certificate: AgreementCertificate;
}) {
  const transcriptRows = transcript
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.timestamp)}</td>
          <td>${escapeHtml(item.speaker)}</td>
          <td>${escapeHtml(item.text)}</td>
        </tr>
      `,
    )
    .join('');

  const html = `
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111; padding: 32px; }
          h1 { color: #0B0B0C; font-size: 32px; }
          h2 { color: #B11226; margin-top: 28px; }
          .cert { border: 2px solid #C8A24A; border-radius: 18px; padding: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .item { background: #FFF8E8; padding: 12px; border-radius: 12px; }
          table { width: 100%; border-collapse: collapse; }
          td, th { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
        </style>
      </head>
      <body>
        <h1>Ai PromptFund Agreement Certificate</h1>
        <div class="cert">
          <p><strong>Agreement ID:</strong> ${escapeHtml(room.agreementId)}</p>
          <p><strong>Agreement Hash:</strong> ${escapeHtml(certificate.agreementHash)}</p>
          <p><strong>Timestamp:</strong> ${escapeHtml(certificate.timestamp)}</p>
        </div>

        <h2>Agreement</h2>
        <p>${escapeHtml(room.agreementText)}</p>

        <div class="grid">
          <div class="item"><strong>Investment Amount</strong><br />$${escapeHtml(room.investmentAmount)}</div>
          <div class="item"><strong>Equity Percentage</strong><br />${escapeHtml(room.equityPercentage)}%</div>
          <div class="item"><strong>Founder Signed</strong><br />${escapeHtml(room.founderSigned)}</div>
          <div class="item"><strong>Investor Signed</strong><br />${escapeHtml(room.investorSigned)}</div>
        </div>

        <h2>AI Summary</h2>
        <p>${escapeHtml(summary.executiveSummary)}</p>
        <p><strong>Risk Acknowledgement:</strong> ${escapeHtml(summary.riskAcknowledgement)}</p>
        <p><strong>Meeting Outcome:</strong> ${escapeHtml(summary.meetingOutcome)}</p>

        <h2>Transcript</h2>
        <table>
          <thead><tr><th>Time</th><th>Speaker</th><th>Text</th></tr></thead>
          <tbody>${transcriptRows}</tbody>
        </table>
      </body>
    </html>
  `;

  return printToFileAsync({
    html,
    base64: false,
  });
}
