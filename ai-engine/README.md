# AI engine integration plan

Adapters will run in a separate worker process, not the API request handler. Planned dependencies: Faster Whisper for Malayalam/English captions, Silero VAD for speech intervals, PySceneDetect for scene boundaries, DeepFilterNet for denoising, and Auto-Editor/FFmpeg for edit decisions. These are not installed or functioning in this commit.

Return editable decisions in timeline seconds, with source media IDs, source in/out times, confidence and model version. Preserve the original assets. Validate licenses for both code and model weights before distributing. Rembg is an image background tool; temporal video matting requires an additional pipeline. TTS language support depends on the selected voice model.
