# RAG Implementation với MongoDB

## Tổng quan

Hệ thống RAG (Retrieval-Augmented Generation) này sử dụng MongoDB Local để lưu trữ persistent embeddings từ PDF documents. Embeddings được load vào memory khi server khởi động để thực hiện similarity search nhanh chóng.

## Kiến trúc

### Components

1. **DocumentEmbedding Model** (`models/DocumentEmbedding.js`)
   - Mongoose schema lưu trữ document chunks và embeddings
   - Mỗi document có: content, embedding vector (1536 dims), metadata, hash

2. **Document Retriever** (`services/langgraph/retriever.js`)
   - Singleton service quản lý vector store
   - Load embeddings từ MongoDB vào MemoryVectorStore
   - Thực hiện similarity search cho queries

3. **Indexing Script** (`scripts/indexDocuments.js`)
   - CLI tool để index PDF documents vào MongoDB
   - Hỗ trợ incremental indexing và force re-index

## Chiến lược RAG

### 1. Chunking Strategy

- **Method**: `RecursiveCharacterTextSplitter`
- **Chunk Size**: 1000 characters
- **Overlap**: 200 characters
- **Lý do**: Phù hợp với tài liệu tiếng Việt về sơ cấp cứu/PCCC có cấu trúc theo bước

### 2. Embedding Strategy

- **Model**: `text-embedding-3-small` (OpenAI)
- **Dimensions**: 1536
- **Ưu điểm**:
  - Tối ưu chi phí
  - Hỗ trợ tốt tiếng Việt
  - Chất lượng cao cho medical/emergency domain

### 3. Retrieval Strategy

- **Method**: Cosine similarity search
- **Top-k**: 3 documents (configurable)
- **Filtering**: Theo emergency type (FIRE_RESCUE, MEDICAL, SECURITY)

## Setup & Usage

### 1. Yêu cầu

```bash
# MongoDB phải đang chạy
# Windows: MongoDB service hoặc mongod.exe
# Linux/Mac: systemctl start mongod

# Environment variables (.env)
OPENAI_API_KEY=sk-...
MONGODB_URI=mongodb://localhost:27017/emergency_112
```

### 2. Index Documents lần đầu

```bash
# Vào thư mục backend
cd backend

# Index tất cả PDF trong reference_document/
node scripts/indexDocuments.js

# Hoặc force re-index (xóa embeddings cũ)
node scripts/indexDocuments.js --force
```

### 3. Xem thống kê

```bash
# Xem số lượng chunks đã index
node scripts/indexDocuments.js --stats
```

### 4. Clear embeddings

```bash
# Xóa tất cả embeddings (cẩn thận!)
node scripts/indexDocuments.js --clear
```

## Flow hoạt động

### Startup Flow

```
1. Server khởi động
2. LangGraph initialize retriever
3. Retriever check MongoDB:
   - Nếu có embeddings → Load vào MemoryVectorStore
   - Nếu chưa có → Index documents → Load
4. RAG ready to serve requests
```

### Query Flow

```
1. User gửi emergency message
2. LangGraph extract thông tin → Router → FirstAidRAG node
3. FirstAidRAG:
   - Build query từ description + emergency types
   - Retriever.retrieve(query, types, k=3)
4. Retriever:
   - Embed query với OpenAI
   - Similarity search trong MemoryVectorStore
   - Filter by emergency type
   - Return top-k chunks
5. FirstAidRAG:
   - Build context từ retrieved chunks
   - LLM generate guidance với context
   - Return response
```

## MongoDB Schema

```javascript
// Collection: documentembeddings
{
  _id: ObjectId("..."),
  content: "Nội dung chunk tiếng Việt...",
  embedding: [0.123, -0.456, ...], // 1536 numbers
  metadata: {
    source: "Cẩm nang PCCC trong gia đình",
    type: "FIRE_RESCUE",
    page: 5,
    chunkIndex: 12,
    pdf: {
      totalPages: 50,
      info: {...}
    }
  },
  documentHash: "abc123...", // SHA-256 of PDF file
  createdAt: ISODate("2024-...")
}
```

## Performance

### Startup Time

- **Cold start** (chưa có embeddings): ~30-60 giây
  - Load PDF: ~5s
  - Chunk: ~2s
  - Generate embeddings: ~20-40s (depends on file size)
  - Save to MongoDB: ~3s

- **Warm start** (đã có embeddings): ~2-5 giây
  - Load từ MongoDB: ~1-2s
  - Build VectorStore: ~1-3s

### Query Time

- **Embedding query**: ~100-200ms
- **Similarity search**: ~10-50ms (in-memory)
- **LLM generation**: ~2-5 seconds
- **Total**: ~2-5 seconds per request

## Monitoring & Debugging

### Check embeddings in MongoDB

```javascript
// Trong mongo shell hoặc MongoDB Compass
use emergency_112

// Đếm số embeddings
db.documentembeddings.countDocuments()

// Xem embeddings theo type
db.documentembeddings.aggregate([
  { $group: { 
    _id: "$metadata.type", 
    count: { $sum: 1 } 
  }}
])

// Xem sample chunk
db.documentembeddings.findOne()
```

### Check retriever status

```javascript
// Trong code hoặc console
const retriever = require('./services/langgraph/retriever');
const status = retriever.getStatus();
console.log(status);
/*
{
  initialized: true,
  hasVectorStore: true,
  documents: {
    FIRE_RESCUE: { loaded: true, chunkCount: 45, ... },
    MEDICAL: { loaded: true, chunkCount: 67, ... }
  }
}
*/
```

## Troubleshooting

### Problem: "No embeddings found in MongoDB"

**Solution**: Chạy indexing script
```bash
node scripts/indexDocuments.js
```

### Problem: "OpenAI API key not configured"

**Solution**: Thêm vào `.env`
```
OPENAI_API_KEY=sk-your-key-here
```

### Problem: "MongoDB connection error"

**Solution**: 
1. Check MongoDB đang chạy: `mongosh` hoặc MongoDB Compass
2. Check MONGODB_URI trong `.env`
3. Windows: Start MongoDB service

### Problem: Embeddings outdated after updating PDFs

**Solution**: Force re-index
```bash
node scripts/indexDocuments.js --force
```

## Migration từ MemoryVectorStore cũ

Hệ thống cũ lưu embeddings trong RAM và mất khi restart. Hệ thống mới:

1. ✅ Persistent storage trong MongoDB
2. ✅ Không cần re-embed mỗi lần restart
3. ✅ Detect file changes tự động
4. ✅ Có thể scale (chuyển sang MongoDB Atlas + Vector Search)
5. ✅ Backward compatible - không cần thay đổi LangGraph flow

## Future Improvements

1. **Incremental updates**: Chỉ re-index pages thay đổi
2. **Semantic chunking**: Chunk theo ý nghĩa thay vì character count
3. **Hybrid search**: Combine vector search + keyword search
4. **MongoDB Atlas**: Migrate to native Vector Search
5. **Multi-language**: Support English documents
6. **Metadata filtering**: Advanced filtering by date, author, etc.
7. **Compression**: Reduce embedding storage size
8. **Caching**: Cache frequent queries

## API Reference

### DocumentRetriever

```javascript
const retriever = require('./services/langgraph/retriever');

// Initialize (tự động gọi khi server start)
await retriever.initialize();

// Retrieve documents
const docs = await retriever.retrieve(
  query: string,           // Search query
  emergencyTypes: string[], // ['FIRE_RESCUE', 'MEDICAL']
  k: number                // Top-k results (default: 3)
);

// Force re-index
await retriever.reindexAll();

// Get status
const status = retriever.getStatus();
```

### DocumentEmbedding Model

```javascript
const DocumentEmbedding = require('./models/DocumentEmbedding');

// Get all embeddings by type
const medicalDocs = await DocumentEmbedding.getByType('MEDICAL');

// Check if document is indexed
const isIndexed = await DocumentEmbedding.isIndexed(fileHash);

// Get statistics
const stats = await DocumentEmbedding.getStats();

// Delete by hash
await DocumentEmbedding.deleteByHash(fileHash);
```

## Testing

Sau khi implement, test theo thứ tự:

1. **Test indexing**:
   ```bash
   node scripts/indexDocuments.js
   # Should see: ✓ Indexing complete
   ```

2. **Test MongoDB**:
   ```bash
   mongosh
   > use emergency_112
   > db.documentembeddings.countDocuments()
   # Should return > 0
   ```

3. **Test retrieval**:
   - Start server: `npm start`
   - Gửi emergency message qua chat
   - Check logs: `[Retriever] Retrieved X relevant documents`
   - Verify response có first aid guidance

4. **Test persistence**:
   - Restart server
   - Check startup logs: `[Retriever] ✓ Loaded from MongoDB`
   - Verify không re-embed (fast startup)

## License & Credits

- LangChain.js: https://js.langchain.com/
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- MongoDB: https://www.mongodb.com/





