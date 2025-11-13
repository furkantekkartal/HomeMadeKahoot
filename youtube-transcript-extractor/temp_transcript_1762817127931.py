
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)
import sys
import json

video_id = "YxKALSesXiE"

ytt_api = YouTubeTranscriptApi()

try:
    transcript_list = ytt_api.list(video_id)
    
    transcript_obj = None
    transcript_language = None
    
    # Strategy: Try to get the best available transcript in any language
    # 1. First, try to get any manually created transcript (usually more accurate)
    try:
        transcript_obj = transcript_list.find_manually_created_transcript([])
        transcript_language = transcript_obj.language_code
    except NoTranscriptFound:
        pass
    
    # 2. If no manual transcript, try to get any generated transcript
    if transcript_obj is None:
        try:
            transcript_obj = transcript_list.find_generated_transcript([])
            transcript_language = transcript_obj.language_code
        except NoTranscriptFound:
            pass
    
    # 3. If still nothing, iterate through all available transcripts
    if transcript_obj is None:
        try:
            for transcript_info in transcript_list:
                transcript_obj = transcript_info
                transcript_language = transcript_info.language_code
                break
        except Exception:
            pass
    
    # If we found a transcript, fetch it
    if transcript_obj:
        transcript = transcript_obj.fetch()
        transcript_text = " ".join([snippet['text'] for snippet in transcript])
        result = {
            "success": True,
            "transcript": transcript_text,
            "language": transcript_language,
            "segments": len(transcript)
        }
        print(json.dumps(result))
    else:
        result = {"success": False, "error": "No transcripts available"}
        print(json.dumps(result))
        sys.exit(1)

except TranscriptsDisabled:
    result = {"success": False, "error": "Transcripts are disabled"}
    print(json.dumps(result))
    sys.exit(1)
    
except VideoUnavailable:
    result = {"success": False, "error": "Video is unavailable or private"}
    print(json.dumps(result))
    sys.exit(1)
    
except NoTranscriptFound:
    result = {"success": False, "error": "No transcripts found"}
    print(json.dumps(result))
    sys.exit(1)
    
except Exception as e:
    result = {"success": False, "error": str(e)}
    print(json.dumps(result))
    sys.exit(1)
