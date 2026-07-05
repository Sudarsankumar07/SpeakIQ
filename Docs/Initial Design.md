# 🎙️ SpeakIQ AI
### AI-Powered Speaking Evaluation System

Version: 1.0

Author: Sudarsan K

---

# 📌 Project Overview

SpeakIQ AI is a modern AI-powered web application that evaluates a user's English-speaking ability. Users are given a speaking topic, record a response between 100 and 200 words, and receive an instant AI-generated evaluation including grammar, vocabulary, fluency, overall score, and personalized improvement suggestions.

This project is built as a **high-quality prototype** that demonstrates modern UI/UX, AI integration, authentication, and clean software architecture. It intentionally avoids unnecessary production infrastructure such as Redis, queues, and microservices to keep the implementation simple while remaining scalable in design.

---

# 🎯 Project Goals

- Beautiful and professional UI/UX
- Authentication (Login & Signup)
- Speech-to-text conversion
- AI-powered speaking evaluation
- Speaking history
- Responsive design
- Fast user experience
- Clean and maintainable codebase

---

# 👥 Target Users

- Students preparing for interviews
- English language learners
- IELTS / TOEFL practice
- Job seekers
- College students

---

# 💻 Technology Stack

## Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Shadcn UI
- Framer Motion
- React Router DOM
- React Hook Form
- Axios
- React Hot Toast
- Lucide Icons

### Why?

- Fast development
- Modern UI
- Type safety
- Excellent developer experience
- Responsive design

---

## Backend

- Node.js
- Express.js
- TypeScript
- JWT Authentication
- bcrypt
- CORS
- dotenv

### Why?

- Lightweight
- Fast
- Easy Gemini integration
- Easy authentication

---

## Database

Supabase

Tables

- users
- speaking_sessions
- evaluations

Why?

- Free tier
- Easy setup
- Authentication support
- PostgreSQL powered

---

## Authentication

Email + Password

Security

- JWT
- Password hashing (bcrypt)
- Protected Routes

---

# 🎤 Speech Recognition

Technology

Browser Web Speech API

Reason

- Completely free
- No Google Cloud required
- No additional API cost
- Good enough for prototype
- Real-time transcription

Flow

User Speech

↓

Browser Speech Recognition

↓

Transcript

↓

User Reviews Transcript

↓

Send to Backend

---

# 🤖 AI Model

Model

gemini-3.5-flash

Provider

Google AI Studio

API Key

Google AI Studio API Key

Reason

- Fast response
- Low token usage
- Excellent grammar analysis
- Good vocabulary evaluation
- Free tier available
- No Google Cloud required

---

# AI Evaluation

Gemini evaluates

- Grammar
- Vocabulary
- Fluency
- Sentence Structure
- Speaking Confidence
- Overall Score
- Suggestions
- Corrected Transcript

The backend requests JSON-only responses to simplify parsing and display.

Example Response

{
    grammar: 91,
    vocabulary: 87,
    fluency: 90,
    overall: 89,
    suggestions: [],
    correctedTranscript: "",
    feedback: ""
}

---

# Application Workflow

Login

↓

Dashboard

↓

Select Speaking Topic

↓

Start Recording

↓

Speech Recognition

↓

Transcript

↓

Edit Transcript (Optional)

↓

Submit

↓

Gemini Evaluation

↓

Store Result

↓

Display Report

---

# Folder Structure

client/

    src/

        assets/

        animations/

        components/

        hooks/

        layouts/

        pages/

        services/

        context/

        utils/

        types/

server/

    src/

        controllers/

        routes/

        middleware/

        services/

        gemini/

        auth/

        config/

        utils/

---

# UI / UX Design

Design Philosophy

Modern

Minimal

Professional

Clean

Apple + Linear + Notion inspired

---

# Color Palette

Primary

#4F46E5

Secondary

#06B6D4

Background

#F8FAFC

Dark

#0F172A

Success

#10B981

Warning

#F59E0B

Danger

#EF4444

Border

#E2E8F0

---

# Typography

Primary Font

Inter

Heading

Bold

Body

Medium

Letter Spacing

Normal

Border Radius

16px

---

# Animations

Framer Motion

Use

- Fade In
- Slide Up
- Scale
- Page Transition
- Hover Effects
- Button Ripple
- Microphone Pulse
- Loading Skeleton

Animation Speed

250ms–400ms

---

# UI Pages

## 1. Splash Screen

Features

Animated logo

Gradient background

Loading animation

Auto redirect

---

## 2. Login

Components

Logo

Email

Password

Remember Me

Forgot Password

Login Button

Google Login (Optional)

Sign Up Link

Design

Glassmorphism card

Animated background

Centered layout

---

## 3. Register

Components

Name

Email

Password

Confirm Password

Create Account

Already have account

---

## 4. Dashboard

Hero Card

Today's Speaking Challenge

Example

Describe your dream company.

Buttons

Start Speaking

View History

Statistics Cards

Average Score

Tests Completed

Grammar Average

Vocabulary Average

Recent Activity

---

## 5. Speaking Screen

Large microphone

Wave animation

Listening indicator

Recording timer

Word Counter

Minimum

100 words

Maximum

200 words

Buttons

Start

Pause

Stop

Cancel

---

## 6. Transcript Screen

Editable text area

Word Counter

Grammar warning

Continue Button

---

## 7. Evaluation Screen

Large Circular Score

Overall

90/100

Score Cards

Grammar

Vocabulary

Fluency

Sentence Structure

Accordion Sections

Grammar Mistakes

Vocabulary Improvements

Corrected Transcript

Feedback

Suggestions

Buttons

Download Report

Try Again

Dashboard

---

## 8. History

Cards

Topic

Date

Overall Score

View Report

Search

Pagination

---

## 9. Profile

Avatar

Name

Email

Statistics

Logout

---

# API Endpoints

POST

/api/auth/register

POST

/api/auth/login

GET

/api/user/profile

POST

/api/evaluation

GET

/api/history

GET

/api/history/:id

---

# Backend Flow

Frontend

↓

Express API

↓

Authentication

↓

Gemini Service

↓

Supabase

↓

Frontend

---

# Gemini Prompt Strategy

The application sends only the transcript.

Gemini returns structured JSON.

Evaluation includes

Grammar

Vocabulary

Fluency

Overall Score

Suggestions

Corrected Transcript

Positive Feedback

This reduces frontend parsing complexity.

---

# Error Handling

Frontend

Empty transcript

No microphone permission

Internet disconnected

Loading timeout

Backend

Invalid token

Gemini timeout

Invalid API key

Unexpected error

Database error

Every error returns consistent JSON.

---

# Security

JWT Authentication

Password hashing

Environment variables

Protected API routes

Input validation

CORS enabled

---

# Performance

Lazy loading pages

Code splitting

Reusable components

Optimized React rendering

Memoization where necessary

Compressed assets

---

# Responsive Design

Desktop

Laptop

Tablet

Mobile

Fully responsive

---

# Accessibility

Keyboard navigation

Focus states

ARIA labels

Proper contrast ratio

Screen-reader friendly forms

---

# Future Improvements

- Pronunciation analysis
- AI voice feedback
- Multiple languages
- IELTS band estimation
- Leaderboard
- PDF reports
- Admin dashboard
- Dark mode
- Voice replay
- Practice streaks
- Weekly analytics

---

# Prototype Scope

Included

✅ Authentication

✅ Speech Recognition

✅ Gemini AI Evaluation

✅ Speaking History

✅ Dashboard

✅ Responsive UI

✅ Modern Animations



---

# Development Principles

- Clean Architecture
- Reusable Components
- Responsive First
- Type Safety
- Simple Backend
- Maintainable Code
- Professional UI/UX
- Production-ready coding standards
- Prototype-friendly infrastructure