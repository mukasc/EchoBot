import wave
import struct
import subprocess
from pathlib import Path

def generate_wav(filepath: Path, duration_sec: float = 2.0, sample_rate: int = 16000):
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(filepath), 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit PCM
        wav_file.setframerate(sample_rate)
        
        num_samples = int(duration_sec * sample_rate)
        # Write silence
        data = struct.pack('<h', 0) * num_samples
        wav_file.writeframesraw(data)
    print(f"Generated WAV: {filepath}")

def convert_audio(input_path: Path, output_path: Path):
    cmd = ["ffmpeg", "-y", "-i", str(input_path), str(output_path)]
    subprocess.run(cmd, capture_output=True, check=True)
    print(f"Converted to: {output_path}")

def main():
    scratch_dir = Path(__file__).parent
    
    wav_path1 = scratch_dir / "sample_rpg1.wav"
    wav_path2 = scratch_dir / "sample_rpg2.wav"
    
    # Generate WAV files
    generate_wav(wav_path1, duration_sec=1.5)
    generate_wav(wav_path2, duration_sec=2.0)
    
    # Convert WAV to MP3
    mp3_path = scratch_dir / "sample_rpg1.mp3"
    convert_audio(wav_path1, mp3_path)
    
    # Convert WAV to OGG
    ogg_path = scratch_dir / "sample_rpg2.ogg"
    convert_audio(wav_path2, ogg_path)
    
    print("All test audio files generated successfully!")

if __name__ == "__main__":
    main()
