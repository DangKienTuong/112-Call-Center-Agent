# Emergency 112 Call Center - Setup Guide

## Issue Fixed: "Error processing message"

### Problem Description
The application was showing "Error processing message" when users tried to send messages in the chat.

### Root Causes Identified and Fixed

1. **Missing OpenAI API Key** - The primary cause
   - The `.env` file had an empty `OPENAI_API_KEY` value
   - OpenAI API calls were failing silently

2. **Missing JWT Secret** - Security issue
   - JWT token was using a weak default secret
   - Generated a cryptographically secure JWT secret

3. **Improved Error Handling**
   - Enhanced `openaiService.js` to gracefully handle missing API keys
   - Added fallback response system when OpenAI is unavailable
   - Better error logging for debugging

### Changes Made

#### 1. Backend Environment Configuration (`backend/.env`)
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/emergency_112

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-... (configured by user)

# JWT Configuration
JWT_SECRET=vxtly4idOMhlnRsdhn1sqisnVL+hR0OPphqrlowc3uiGpVV29C+l+eBjD8AjUOw8cX69gaHv7DkjA7Oyuel8sQ==
JWT_EXPIRE=30d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 2. Frontend Environment Configuration (`frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

#### 3. Code Improvements in `backend/services/openaiService.js`

**Updated Constructor:**
- Added check for API key availability before initializing OpenAI
- Provides warning if API key is missing
- Service now works with fallback responses even without OpenAI

**Updated processMessage Method:**
- Added API key validation at the start
- Automatically uses fallback if API key is not configured
- Better error logging for debugging
- More robust error handling

### How to Verify the Fix

#### 1. Check Environment Variables
```powershell
# Backend
Get-Content backend\.env

# Frontend
Get-Content frontend\.env
```

#### 2. Start MongoDB
```powershell
# Make sure MongoDB is running
mongod
```

#### 3. Start Backend Server
```powershell
cd backend
npm install  # if not already done
npm start
# Or for development with auto-reload:
npm run dev
```

You should see:
```
Connected to MongoDB
System prompt loaded successfully
Server running on port 5000
```

#### 4. Start Frontend
```powershell
cd frontend
npm install  # if not already done
npm start
```

The app will open at `http://localhost:3000`

#### 5. Test the Chat
1. Navigate to the Chat page
2. Type any emergency message (e.g., "Help! There's a fire at 123 Main Street")
3. The system should now respond without errors

### Troubleshooting

#### If you still see "Error processing message":

1. **Check Backend Console for Errors**
   - Look for specific error messages
   - Check if MongoDB is connected
   - Verify OpenAI API key is valid

2. **Verify OpenAI API Key**
   ```powershell
   # Test the API key (replace with your key)
   curl https://api.openai.com/v1/models `
     -H "Authorization: Bearer YOUR_API_KEY_HERE"
   ```

3. **Check Network Connectivity**
   - Ensure backend is running on port 5000
   - Check if frontend can reach the backend
   - Look at browser console for network errors

4. **MongoDB Connection Issues**
   - Ensure MongoDB is running: `Get-Process -Name mongod`
   - Check MongoDB URI in `.env` file
   - Try connecting manually: `mongo mongodb://localhost:27017/emergency_112`

5. **CORS Issues**
   - Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
   - Check browser console for CORS errors

### Fallback Mode

The system now includes an intelligent fallback system that works even without OpenAI:

- **Location Detection**: Uses regex patterns to extract addresses
- **Emergency Type Classification**: Keyword matching for fire, medical, security, rescue
- **Severity Assessment**: Analyzes context for urgency level
- **Smart Responses**: Context-aware questions to gather necessary information

### Security Notes

1. **JWT Secret**: A cryptographically secure 512-bit secret has been generated
2. **API Keys**: Never commit `.env` files to version control
3. **Production**: Change all secrets before deploying to production
4. **HTTPS**: Use HTTPS in production for secure communication

### Additional Commands

```powershell
# Generate a new JWT secret (if needed)
$bytes = New-Object byte[] 64
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Check if ports are in use
Get-NetTCPConnection -LocalPort 5000
Get-NetTCPConnection -LocalPort 3000

# View backend logs
Get-Content backend\combined.log -Tail 50
Get-Content backend\error.log -Tail 50
```

### Next Steps

1. ✅ Environment variables configured
2. ✅ JWT secret generated
3. ✅ OpenAI integration fixed
4. ✅ Error handling improved
5. Test the application thoroughly
6. Consider adding more robust error messages
7. Set up monitoring and logging for production

### Support

If you continue to experience issues:
1. Check the backend console logs
2. Check the browser console for frontend errors
3. Verify all services (MongoDB, Backend, Frontend) are running
4. Review the error messages for specific clues

---

**Last Updated**: November 16, 2025
**Fixed By**: AI Assistant
**Status**: ✅ Ready for Testing

