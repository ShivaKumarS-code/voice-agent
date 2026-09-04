import base64
import json
import websockets

from app.config import settings


class TextToSpeech:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY

        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY is not set")

        self.voice_id = "cgSgspJ2msm6clMCkdW9"
        self.model_id = "eleven_flash_v2_5"

    async def synthesize(self, text: str) -> bytes:
        # Raw PCM16 at 16 kHz: the format Simli's avatar expects, so the
        # browser can forward these bytes straight to sendAudioData.
        url = (
            f"wss://api.elevenlabs.io/v1/text-to-speech/"
            f"{self.voice_id}/stream-input"
            f"?model_id={self.model_id}"
            f"&output_format=pcm_16000"
        )

        audio_chunks = []

        async with websockets.connect(
            url,
            additional_headers={
                "xi-api-key": self.api_key,
            },
        ) as websocket:

            # Initialize the ElevenLabs connection
            await websocket.send(json.dumps({
                "text": " ",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.8,
                    "use_speaker_boost": False,
                },
            }))

            # Send the agent response.
            # flush=True makes ElevenLabs generate the audio
            # immediately instead of waiting for more text.
            await websocket.send(json.dumps({
                "text": text,
                "flush": True,
            }))

            # Tell ElevenLabs there is no more text.
            await websocket.send(json.dumps({
                "text": "",
            }))

            # Receive audio chunks
            async for message in websocket:

                data = json.loads(message)

                if data.get("audio"):
                    audio_chunks.append(
                        base64.b64decode(data["audio"])
                    )

                if data.get("isFinal"):
                    break

                if data.get("is_final"):
                    break

                if data.get("error"):
                    raise RuntimeError(
                        f"ElevenLabs error: {data['error']}"
                    )

        audio = b"".join(audio_chunks)

        print("TTS generated:", len(audio), "bytes")

        return audio