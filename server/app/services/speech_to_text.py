from deepgram import AsyncDeepgramClient

from app.config import settings


class SpeechToText:
    def __init__(self):
        self.client = AsyncDeepgramClient(
            api_key=settings.DEEPGRAM_API_KEY
        )

    def connect(self):
        return self.client.listen.v2.connect(
            model="flux-general-en",
            encoding="linear16",
            sample_rate=16000,
        )