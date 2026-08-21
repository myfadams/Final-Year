export interface SosSmsMessageParams {
  senderName: string;
  latitude: number;
  longitude: number;
}

/**
 * Builds the SMS body sent when the user taps "Send SOS via SMS" on the broadcast overlay.
 * The timestamp reflects when the message is being composed (i.e. how fresh this location fix
 * is) rather than when the SOS session originally started, since the user can tap this at any
 * point while broadcasting and currentCoords keeps updating live.
 */
export function buildSosSmsMessage({
  senderName,
  latitude,
  longitude,
}: SosSmsMessageParams): string {
  const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    `${senderName} has activated an SOS and may need immediate assistance.\n\n` +
    `Last known location:\n${mapsLink}\n\n` +
    `Time: ${time}\n\n` +
    `Please respond immediately.`
  );
}
