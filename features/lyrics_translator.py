class LyricTranslationService:
    def __init__(self, translator_fn=None) -> None:
        self._translator_fn = translator_fn
        self._cache: dict[str, str] = {}

    def translate_line(self, line: str) -> str:
        clean = (line or "").strip()
        if not clean:
            return ""
        if clean in self._cache:
            return self._cache[clean]

        if self._translator_fn is not None:
            try:
                translated = (self._translator_fn(clean) or "").strip()
                if translated:
                    self._cache[clean] = translated
                    return translated
            except Exception:
                pass

        self._cache[clean] = ""
        return ""
