# English Pronunciation Assessment System

A web application for English pronunciation assessment using Azure Speech API. This system helps non-native English speakers improve their pronunciation skills through free conversation and script reading exercises.

## Features

- **Two Practice Modes**:
  - Free Talk: Practice spontaneous conversation
  - Script Reading: Read pre-defined scripts with different difficulty levels
- **Real-time Speech Recognition**: Instant feedback on your spoken English
- **Pronunciation Assessment**:
  - Word-level accuracy scoring
  - Detailed pronunciation feedback
  - Pause analysis for natural speech rhythm
- **Multilingual Interface**: Instructions in both English and Japanese
- **TTS (Text-to-Speech)**: Listen to correct pronunciation of scripts

## Technology Stack

- Next.js
- TypeScript
- Tailwind CSS
- Azure Cognitive Services Speech SDK

## Setup

1. Clone the repository:
```bash
git clone https://github.com/mocchicc/enligsh-speech-ai.git
cd enligsh-speech-ai
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env.local` file with the following content:
```
NEXT_PUBLIC_AZURE_SPEECH_KEY=your_azure_speech_key_here
NEXT_PUBLIC_AZURE_SPEECH_REGION=your_azure_region_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage Instructions

### Free Talk Mode
1. Click the "Start Recording" button
2. Speak freely in English
3. Stop recording to see the transcription and pronunciation feedback
4. Review word-level pronunciation scores and suggestions

### Script Reading Mode
1. Select a script from the list (beginner, pre-intermediate, intermediate, or advanced)
2. Listen to the correct pronunciation (optional)
3. Click "Start Recording" and read the script
4. Get detailed feedback on your pronunciation accuracy
5. Practice focusing on highlighted problem areas

## Notes

- A valid Azure Speech API subscription key is required
- Browser microphone access permission is necessary
- Recommended browsers: Chrome, Edge, Firefox
- Internet connection is required for API communication

## Future Enhancements

- User accounts for progress tracking
- More script categories and difficulty levels
- Customizable practice sessions
- Downloadable pronunciation reports
- Mobile application support

## License

This project is open source and available under the MIT License.

## Acknowledgements

- Microsoft Azure for Speech Services
- Next.js team for the React framework
- All contributors and testers who helped improve this application 