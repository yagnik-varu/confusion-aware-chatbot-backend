require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const vectorStore = require('./vectorStore');

// In-memory session store
// Format: { 'sessionId': [ { role: 'user', text: 'hi' }, { role: 'model', text: 'hello' } ] }
const sessions = {};

// Configure multer to keep uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve HTML UI

// Basic test route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Chatbot Backend is running!' });
});

// Document upload endpoint for RAG
app.post('/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Key must be "document".' });
        }
        
        console.log(`\n[RAG DEBUG] --- NEW UPLOAD REQUEST ---`);
        console.log(`[RAG DEBUG] Received file: ${req.file.originalname}`);
        
        let text = '';
        
        // 1. Extract text from the uploaded file buffer
        if (req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) {
            console.log(`[RAG DEBUG] Parsing PDF file...`);
            const pdfData = await pdfParse(req.file.buffer);
            text = pdfData.text;
        } else {
            text = req.file.buffer.toString('utf8');
        }
        
        // 2. Process, chunk, embed, and store
        const numChunks = await vectorStore.processAndStoreDocument(text, req.file.originalname);
        
        res.status(200).json({ 
            message: 'Document processed successfully',
            chunksStored: numChunks
        });
    } catch (error) {
        console.error('Error in /upload:', error);
        res.status(500).json({ error: 'Failed to process document' });
    }
});

// Initialize Gemini API
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

// Chat endpoint with Server-Sent Events (SSE)
app.post('/chat', async (req, res) => {
    // 1. Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Flush headers to establish the connection immediately
    res.flushHeaders();

    try {
        const { message, sessionId = 'default-session' } = req.body;

        if (!message) {
            res.write(`data: ${JSON.stringify({ error: "Message is required" })}\n\n`);
            return res.end();
        }
        
        // Initialize session history if it doesn't exist
        if (!sessions[sessionId]) {
            sessions[sessionId] = [];
        }

        console.log(`\n[RAG DEBUG] --- NEW CHAT REQUEST ---`);
        console.log(`[RAG DEBUG] Session ID: ${sessionId}`);
        console.log(`[RAG DEBUG] User Message: "${message}"`);

        // 2. RAG Retrieval Step: Find relevant chunks from our Vector DB
        const relevantChunks = await vectorStore.searchSimilar(message);
        
        // Build the new prompt
        let prompt = "";
        
        if (relevantChunks.length > 0) {
            console.log(`[RAG DEBUG] Injecting context into the Gemini prompt...`);
            const contextText = relevantChunks.map(chunk => chunk.text).join('\n---\n');
            prompt += `Relevant context from the user's documents:\n---------------------\n${contextText}\n---------------------\n\n`;
        } else {
            console.log(`[RAG DEBUG] No context found. Sending standard prompt to Gemini.`);
        }
        
        // Inject conversation history (up to last 10 messages)
        const history = sessions[sessionId];
        if (history.length > 0) {
            const historyText = history.map(msg => `${msg.role.toUpperCase()}: ${msg.text}`).join('\n');
            prompt += `Conversation History:\n${historyText}\n\n`;
        }
        
        prompt += `USER: ${message}\nMODEL:`;
        
        console.log(`[RAG DEBUG] Final Prompt being sent to Gemini:\n${prompt}\n`);

        console.log(`[RAG DEBUG] Waiting for Gemini response stream...`);
        // 3. Call Gemini API with the enriched prompt (streaming)
        const result = await model.generateContentStream(prompt);

        // 3. Stream the response chunks back to the client and accumulate for history
        let fullResponse = "";
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
        
        // Update session memory with user query and model response
        sessions[sessionId].push({ role: 'user', text: message });
        sessions[sessionId].push({ role: 'model', text: fullResponse });
        
        // Enforce limit of last 10 messages
        if (sessions[sessionId].length > 10) {
            sessions[sessionId] = sessions[sessionId].slice(sessions[sessionId].length - 10);
        }

        // 4. Signal the end of the stream
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error("Error in /chat endpoint:", error);
        res.write(`data: ${JSON.stringify({ error: "An error occurred during generation" })}\n\n`);
        res.end();
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
