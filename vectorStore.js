const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const STORE_PATH = path.join(__dirname, 'vector_store.json');

// Initialize Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });

// Load existing store or return empty array
function loadStore() {
    if (fs.existsSync(STORE_PATH)) {
        const data = fs.readFileSync(STORE_PATH, 'utf8');
        return JSON.parse(data);
    }
    return [];
}

// Save store to disk
function saveStore(store) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// Helper: Calculate Cosine Similarity between two vectors
// This tells us how mathematically close two text meanings are
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate an embedding for a single piece of text
async function generateEmbedding(text) {
    const result = await embeddingModel.embedContent({
        content: { parts: [{ text }] },
        outputDimensionality: 768
    });
    return result.embedding.values;
}

// Chunk text into smaller pieces (~500 tokens = ~2000 chars, ~50 tokens overlap = ~200 chars)
function chunkText(text, chunkSize = 2000, overlap = 200) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        let end = i + chunkSize;
        // Try not to split words if possible
        if (end < text.length) {
            let lastSpace = text.lastIndexOf(' ', end);
            if (lastSpace > i) {
                end = lastSpace;
            }
        }
        const chunk = text.slice(i, end).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }
        i = end - overlap;
    }
    return chunks;
}

// Process a new document: Chunk it, Embed it, Store it
async function processAndStoreDocument(text, filename) {
    const chunks = chunkText(text);
    const store = loadStore();

    console.log(`[RAG DEBUG] Starting to process document: ${filename}`);
    console.log(`[RAG DEBUG] Document split into ${chunks.length} chunks.`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;
        console.log(`[RAG DEBUG] Generating embedding for chunk ${i + 1}/${chunks.length}...`);
        const embedding = await generateEmbedding(chunk);
        
        store.push({
            id: i,
            source: filename,
            text: chunk,
            embedding: embedding
        });
    }

    saveStore(store);
    console.log(`[RAG DEBUG] Successfully stored ${chunks.length} chunks from ${filename} into vector_store.json.`);
    return chunks.length;
}

// Search for the top K most similar chunks to a given query
async function searchSimilar(query, topK = 3) {
    const store = loadStore();
    if (store.length === 0) return []; // Nothing uploaded yet

    // 1. Embed the query
    console.log(`\n[RAG DEBUG] Received search query: "${query}"`);
    console.log(`[RAG DEBUG] Generating embedding for the query...`);
    const queryEmbedding = await generateEmbedding(query);

    // 2. Calculate similarity for all stored chunks
    const results = store.map(item => {
        return {
            id: item.id,
            text: item.text,
            source: item.source,
            similarity: cosineSimilarity(queryEmbedding, item.embedding)
        };
    });

    // 3. Sort by most similar (highest score first) and return top K
    results.sort((a, b) => b.similarity - a.similarity);
    
    const topResults = results.slice(0, topK);
    console.log(`[RAG DEBUG] Found ${topResults.length} relevant chunks:`);
    topResults.forEach((res, i) => {
        // Log a snippet of the text and the similarity score
        console.log(`   -> Match ${i + 1} (Score: ${res.similarity.toFixed(4)}): "${res.text.substring(0, 60).replace(/\n/g, ' ')}..."`);
    });
    
    return topResults;
}

module.exports = {
    processAndStoreDocument,
    searchSimilar
};
