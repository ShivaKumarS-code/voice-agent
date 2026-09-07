const PCM_SAMPLE_RATE = 16000;

/**
 * ElevenLabs sends raw PCM16 with no container, so decodeAudioData cannot
 * read it. Convert the samples by hand instead.
 */
export function pcm16ToAudioBuffer(
  context: AudioContext,
  data: ArrayBuffer,
  sampleRate = PCM_SAMPLE_RATE,
): AudioBuffer {
  // A trailing odd byte would break the Int16 view.
  const samples = new Int16Array(data, 0, Math.floor(data.byteLength / 2));
  const buffer = context.createBuffer(1, samples.length, sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < samples.length; i++) {
    channel[i] = samples[i] / (samples[i] < 0 ? 32768 : 32767);
  }

  return buffer;
}
