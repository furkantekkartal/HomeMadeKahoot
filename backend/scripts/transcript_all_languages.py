from youtube_transcript_api import (
    YouTubeTranscriptApi,
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)
import sys

# Get video_id and output_file from command-line arguments
if len(sys.argv) < 3:
    print("Usage: python transcript_all_languages.py <video_id> <output_file>")
    sys.exit(1)

video_id = sys.argv[1]
output_file = sys.argv[2]

ytt_api = YouTubeTranscriptApi()

try:
    # List all available transcripts for the video
    transcript_list = ytt_api.list(video_id)
    
    transcript_obj = None
    transcript_language = None
    
    # Strategy: Prefer English, then fallback to original language
    # 1. First, try to get English manually created transcript (most accurate)
    try:
        transcript_obj = transcript_list.find_manually_created_transcript(['en'])
        transcript_language = transcript_obj.language_code
    except NoTranscriptFound:
        pass
    
    # 2. If no English manual transcript, try English generated transcript
    if transcript_obj is None:
        try:
            transcript_obj = transcript_list.find_generated_transcript(['en'])
            transcript_language = transcript_obj.language_code
        except NoTranscriptFound:
            pass
    
    # 3. If no English transcript, try any manually created transcript (usually more accurate)
    if transcript_obj is None:
        try:
            transcript_obj = transcript_list.find_manually_created_transcript([])
            transcript_language = transcript_obj.language_code
        except NoTranscriptFound:
            pass
    
    # 4. If no manual transcript, try any generated transcript
    if transcript_obj is None:
        try:
            transcript_obj = transcript_list.find_generated_transcript([])
            transcript_language = transcript_obj.language_code
        except NoTranscriptFound:
            pass
    
    # 5. If still nothing, iterate through all available transcripts (fallback to original language)
    if transcript_obj is None:
        try:
            # Iterate through all available transcripts
            for transcript_info in transcript_list:
                transcript_obj = transcript_info
                transcript_language = transcript_info.language_code
                break
        except Exception:
            pass
    
    # If we found a transcript, fetch it
    if transcript_obj:
        transcript = transcript_obj.fetch()
        
        # Write transcript to file
        with open(output_file, "w", encoding="utf-8") as f:
            for snippet in transcript:
                f.write(snippet.text + "\n")
        
        print(f"Transcript saved successfully in language: {transcript_language}")
    else:
        # No transcript available - create empty file
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("")
        print("No transcripts available for this video. Empty file created.")

except TranscriptsDisabled:
    # Transcripts are disabled - create empty file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("")
    print("Transcripts are disabled for this video. Empty file created.")
    
except VideoUnavailable:
    # Video is unavailable - create empty file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("")
    print("Video is unavailable or private. Empty file created.")
    
except NoTranscriptFound:
    # No transcript found - create empty file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("")
    print("No transcripts found for this video. Empty file created.")
    
except Exception as e:
    # Any other error - create empty file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("")
    print(f"Error occurred: {str(e)}. Empty file created.")


