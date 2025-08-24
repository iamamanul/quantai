# AI Study Planner - Timetable Generator

## Overview

The AI Study Planner is a powerful feature that uses artificial intelligence to generate personalized study schedules based on your learning goals and available time. It integrates both **Google Gemini** and **Grok** APIs with automatic fallback for maximum reliability.

## Features

- 🤖 **AI-Powered Planning**: Uses advanced AI to create structured, day-by-day study schedules
- 🔄 **Dual API Support**: Gemini and Grok APIs with automatic fallback
- 📅 **Calendar Integration**: Generated tasks automatically appear in your calendar
- 🎯 **Goal-Oriented**: Tailored to specific learning objectives and timeframes
- 📚 **Resource Suggestions**: AI recommends relevant learning resources
- 📈 **Progress Tracking**: Track completion status of AI-generated tasks
- ⚡ **Smart Scheduling**: Considers realistic daily study hours and break times

## How It Works

1. **Describe Your Goal**: Tell the AI what you want to learn and your timeline
2. **AI Generation**: The system creates a detailed study plan with daily tasks
3. **Review & Customize**: Preview the generated schedule before adding to calendar
4. **Track Progress**: Monitor your learning journey with built-in progress tracking

## Setup Instructions

### 1. Get API Keys

#### For Google Gemini:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

#### For Grok (X.AI):
1. Visit [X.AI Console](https://console.x.ai/)
2. Sign up/login to your account
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the generated key

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and add your API keys:

```bash
# AI APIs for Timetable Generation
GEMINI_API_KEY="your_gemini_api_key_here"
GROK_API_KEY="your_grok_api_key_here"
```

**Note**: You need at least one API key for the system to work. Having both provides better reliability through fallback.

### 3. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to the Timetable page
3. Click "AI Study Planner" button
4. Test with a simple goal like "Learn React basics in 2 weeks"

## Usage Examples

### Example Prompts

**Data Structures & Algorithms**:
```
I want to master Data Structures and Algorithms for coding interviews. I have 3 months and can study 2-3 hours daily. Cover arrays, linkedlists, trees, graphs, dynamic programming, and practice on LeetCode.
```

**Web Development**:
```
Learn full-stack web development with React, Node.js, and MongoDB. I'm a complete beginner and have 4 months. Want to build 3 projects by the end.
```

**Machine Learning**:
```
Study machine learning from basics to advanced topics. Cover Python, statistics, scikit-learn, TensorFlow. Need to complete in 10 weeks with 3 hours daily study.
```

### Best Practices for Prompts

1. **Be Specific**: Include exact topics you want to cover
2. **Mention Timeline**: Specify deadline or duration
3. **State Daily Hours**: How much time you can dedicate daily
4. **Include Level**: Beginner, intermediate, or advanced
5. **Add Context**: Mention your goal (job interview, exam, project, etc.)

## API Fallback Logic

The system implements intelligent fallback between AI providers:

1. **Primary**: Attempts Gemini API first
2. **Fallback**: If Gemini fails, tries Grok API
3. **Error Handling**: Provides detailed error messages if both fail

## Generated Content Structure

Each AI-generated timetable includes:

- **Goal Summary**: Brief description of your learning objective
- **Duration**: Estimated time to complete
- **Daily Tasks**: Specific tasks with time slots
- **Weekly Goals**: Milestones to track progress
- **Difficulty Levels**: Beginner, intermediate, advanced
- **Resources**: Suggested learning materials
- **Study Tips**: AI-generated tips for success

## Calendar Features

Generated tasks include:

- 🕐 **Time Slots**: Specific study periods (e.g., "9:00 - 10:30")
- 📖 **Subject Labels**: Clear topic identification
- ✅ **Progress Tracking**: Mark tasks as completed
- 🤖 **AI Badge**: Visual indicator for AI-generated tasks
- 🏷️ **Difficulty Tags**: Easy identification of task complexity

## Troubleshooting

### Common Issues

**API Key Errors**:
- Verify keys are correctly added to `.env.local`
- Check that keys have proper permissions
- Ensure no extra spaces or quotes in environment variables

**Generation Failures**:
- Try shorter, more focused prompts
- Check if both APIs are configured
- Verify internet connection

**Tasks Not Saving**:
- Check authentication status
- Verify database connection
- Try manually saving after generation

### Error Messages

- `"AI services are currently unavailable"`: Both APIs failed, try again later
- `"API keys may not be configured properly"`: Check environment variables
- `"Prompt too long"`: Reduce prompt to under 2000 characters

## Technical Details

### File Structure

```
lib/
  ai-apis.js              # AI API utilities and fallback logic
app/api/
  generate-timetable/     # API endpoint for timetable generation
app/(main)/timetable/_components/
  ai-prompt.jsx           # UI component for AI interaction
  timetable.jsx           # Main timetable with AI integration
```

### Data Flow

1. User inputs goal → AI Prompt component
2. Component calls `/api/generate-timetable`
3. API uses `lib/ai-apis.js` for AI generation
4. Generated data converted to calendar format
5. Tasks added to user's timetable
6. Data saved to database via existing timetable API

## Performance Considerations

- API calls may take 5-15 seconds for generation
- Responses are cached for the session
- Large prompts (>1000 chars) may take longer
- Network timeouts handled gracefully

## Security

- API keys stored securely in environment variables
- User authentication required for all operations
- Input validation prevents malicious prompts
- Rate limiting prevents API abuse

## Future Enhancements

- [ ] Custom time slots preference
- [ ] Integration with external calendars
- [ ] Habit tracking and reminders
- [ ] Progress analytics and insights
- [ ] Team/group study plans
- [ ] Mobile app integration

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify your API keys and environment setup
3. Check the browser console for detailed error messages
4. Review the API endpoint health check: `/api/generate-timetable`
