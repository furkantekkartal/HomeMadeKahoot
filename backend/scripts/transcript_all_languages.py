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
    
    # Strategy: Prioritize original language of the video
    # The original language is usually the first transcript in the list or manually created
    # 1. First, try to get any manually created transcript (usually the original language, most accurate)
    try:
        transcript_obj = transcript_list.find_manually_created_transcript([])
        transcript_language = transcript_obj.language_code
    except NoTranscriptFound:
        pass
    
    # 2. If no manual transcript, try the first available transcript (usually original language)
    if transcript_obj is None:
        try:
            # Get the first transcript from the list (usually the original language)
            for transcript_info in transcript_list:
                transcript_obj = transcript_info
                transcript_language = transcript_info.language_code
                break
        except Exception:
            pass
    
    # 3. If still nothing, try any generated transcript (fallback)
    if transcript_obj is None:
        try:
            transcript_obj = transcript_list.find_generated_transcript([])
            transcript_language = transcript_obj.language_code
        except NoTranscriptFound:
            pass
    
    # 4. Last resort: try English if original language not available
    if transcript_obj is None:
        try:
            transcript_obj = transcript_list.find_manually_created_transcript(['en'])
            transcript_language = transcript_obj.language_code
        except NoTranscriptFound:
            try:
                transcript_obj = transcript_list.find_generated_transcript(['en'])
                transcript_language = transcript_obj.language_code
            except NoTranscriptFound:
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


