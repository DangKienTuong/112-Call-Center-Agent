const { BaseCheckpointSaver } = require('@langchain/langgraph');
const ChatSession = require('../../models/ChatSession');

/**
 * MongoDB Checkpointer for LangGraph
 * Persists LangGraph state to MongoDB via ChatSession model
 * Supports both authenticated users (userId) and guest sessions (sessionId only)
 */
class MongoDBCheckpointer extends BaseCheckpointSaver {
  constructor() {
    super();
    this.cache = new Map(); // In-memory cache for faster reads
  }

  /**
   * Get the thread_id from config
   */
  _getThreadId(config) {
    return config?.configurable?.thread_id || config?.thread_id;
  }

  /**
   * Get a checkpoint tuple from storage
   */
  async getTuple(config) {
    const threadId = this._getThreadId(config);

    if (!threadId) {
      return undefined;
    }

    // Check cache first
    if (this.cache.has(threadId)) {
      return this.cache.get(threadId);
    }

    try {
      const session = await ChatSession.findOne({ sessionId: threadId });

      if (!session || !session.checkpoint) {
        return undefined;
      }

      const tuple = {
        config: {
          configurable: {
            thread_id: threadId,
            checkpoint_id: session.checkpoint.id || threadId
          }
        },
        checkpoint: session.checkpoint,
        metadata: session.checkpoint.metadata || {}
      };

      // Cache the result
      this.cache.set(threadId, tuple);

      return tuple;
    } catch (error) {
      console.error('[MongoDBCheckpointer] Error getting tuple:', error);
      return undefined;
    }
  }

  /**
   * List checkpoints for a thread
   */
  async *list(config, options = {}) {
    const threadId = this._getThreadId(config);

    if (!threadId) {
      return;
    }

    try {
      const session = await ChatSession.findOne({ sessionId: threadId });

      if (session && session.checkpoint) {
        yield {
          config: {
            configurable: {
              thread_id: threadId,
              checkpoint_id: session.checkpoint.id || threadId
            }
          },
          checkpoint: session.checkpoint,
          metadata: session.checkpoint.metadata || {}
        };
      }
    } catch (error) {
      console.error('[MongoDBCheckpointer] Error listing checkpoints:', error);
    }
  }

  /**
   * Save a checkpoint
   */
  async put(config, checkpoint, metadata = {}) {
    const threadId = this._getThreadId(config);

    if (!threadId) {
      throw new Error('thread_id is required for checkpointing');
    }

    try {
      // Prepare checkpoint data
      const checkpointData = {
        ...checkpoint,
        id: checkpoint.id || `${threadId}-${Date.now()}`,
        metadata: {
          ...metadata,
          savedAt: new Date()
        }
      };

      // Get or create session
      let session = await ChatSession.findOne({ sessionId: threadId });

      if (!session) {
        session = new ChatSession({
          sessionId: threadId,
          messages: [],
          status: 'active'
        });
      }

      // Save checkpoint
      session.checkpoint = checkpointData;
      session.langgraphState = checkpoint.channel_values;
      await session.save();

      // Update cache
      const tuple = {
        config: {
          configurable: {
            thread_id: threadId,
            checkpoint_id: checkpointData.id
          }
        },
        checkpoint: checkpointData,
        metadata: checkpointData.metadata
      };
      this.cache.set(threadId, tuple);

      return {
        configurable: {
          thread_id: threadId,
          checkpoint_id: checkpointData.id
        }
      };
    } catch (error) {
      console.error('[MongoDBCheckpointer] Error putting checkpoint:', error);
      throw error;
    }
  }

  /**
   * Save pending writes for a checkpoint
   */
  async putWrites(config, writes, taskId) {
    // For simplicity, we handle writes as part of the main checkpoint
    // This could be extended to store writes separately if needed
    const threadId = this._getThreadId(config);

    if (!threadId) {
      return;
    }

    try {
      const session = await ChatSession.findOne({ sessionId: threadId });

      if (session && session.checkpoint) {
        if (!session.checkpoint.pending_writes) {
          session.checkpoint.pending_writes = [];
        }

        session.checkpoint.pending_writes.push({
          taskId,
          writes,
          timestamp: new Date()
        });

        await session.save();

        // Update cache
        if (this.cache.has(threadId)) {
          const cached = this.cache.get(threadId);
          cached.checkpoint.pending_writes = session.checkpoint.pending_writes;
        }
      }
    } catch (error) {
      console.error('[MongoDBCheckpointer] Error putting writes:', error);
    }
  }

  /**
   * Clear checkpoint for a session
   */
  async clear(threadId) {
    try {
      await ChatSession.updateOne(
        { sessionId: threadId },
        {
          $unset: { checkpoint: 1, langgraphState: 1 },
          $set: { status: 'completed' }
        }
      );

      this.cache.delete(threadId);
    } catch (error) {
      console.error('[MongoDBCheckpointer] Error clearing checkpoint:', error);
    }
  }

  /**
   * Associate a session with a user (when they log in)
   */
  async linkToUser(threadId, userId) {
    try {
      await ChatSession.updateOne(
        { sessionId: threadId },
        { $set: { userId } }
      );
    } catch (error) {
      console.error('[MongoDBCheckpointer] Error linking to user:', error);
    }
  }

  /**
   * Save messages to session
   */
  async saveMessages(threadId, messages) {
    try {
      await ChatSession.updateOne(
        { sessionId: threadId },
        {
          $push: {
            messages: {
              $each: messages
            }
          }
        }
      );
    } catch (error) {
      console.error('[MongoDBCheckpointer] Error saving messages:', error);
    }
  }

  /**
   * Complete session with ticket
   */
  async completeSession(threadId, ticketId) {
    try {
      await ChatSession.updateOne(
        { sessionId: threadId },
        {
          $set: {
            ticketId,
            status: 'completed'
          }
        }
      );

      this.cache.delete(threadId);
    } catch (error) {
      console.error('[MongoDBCheckpointer] Error completing session:', error);
    }
  }
}

// Singleton instance
const mongoCheckpointer = new MongoDBCheckpointer();

module.exports = {
  MongoDBCheckpointer,
  mongoCheckpointer
};
