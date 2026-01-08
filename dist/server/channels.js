/**
 * ChannelManager - orchestrates multiple notification channels
 *
 * Sends notifications to all enabled channels in parallel.
 * Aggregates responses from any channel.
 */
import { createLogger } from '../shared/logger.js';
const log = createLogger('channels');
/**
 * ChannelManager - manages multiple notification channels
 */
export class ChannelManager {
    channels = new Map();
    /**
     * Register a channel with the manager
     */
    register(channel) {
        if (this.channels.has(channel.name)) {
            throw new Error(`Channel '${channel.name}' is already registered`);
        }
        this.channels.set(channel.name, channel);
        log.info(`Registered channel: ${channel.name}`);
    }
    /**
     * Get a channel by name
     */
    get(name) {
        return this.channels.get(name);
    }
    /**
     * Initialize all registered channels
     * Throws on first failure (fail-fast)
     */
    async initializeAll() {
        for (const [name, channel] of this.channels) {
            log.info(`Initializing channel: ${name}`);
            await channel.initialize();
        }
        log.info(`All ${String(this.channels.size)} channels initialized`);
    }
    /**
     * Send a notification to all enabled channels in parallel
     */
    async sendToAll(notification) {
        const results = new Map();
        let successCount = 0;
        let failureCount = 0;
        const enabledChannels = this.getEnabledChannels();
        if (enabledChannels.length === 0) {
            log.warn('No enabled channels to send to');
            return { results, successCount, failureCount };
        }
        // Send to all channels in parallel
        const sendPromises = enabledChannels.map(async (channel) => {
            const result = await channel.send(notification);
            return { name: channel.name, result };
        });
        const sendResults = await Promise.all(sendPromises);
        for (const { name, result } of sendResults) {
            results.set(name, result);
            if (result.success) {
                successCount++;
                log.info(`Sent notification via ${name}`, {
                    sessionId: notification.sessionId,
                    messageId: result.data,
                });
            }
            else {
                failureCount++;
                log.error(`Failed to send via ${name}: ${result.error}`);
            }
        }
        return { results, successCount, failureCount };
    }
    /**
     * Start polling on all channels that support it
     */
    startAllPolling(callback) {
        for (const [name, channel] of this.channels) {
            if (channel.enabled) {
                log.info(`Starting polling on channel: ${name}`);
                channel.startPolling(callback);
            }
        }
    }
    /**
     * Stop polling on all channels
     */
    stopAllPolling() {
        for (const [name, channel] of this.channels) {
            log.info(`Stopping polling on channel: ${name}`);
            channel.stopPolling();
        }
    }
    /**
     * Dispose all channels (cleanup resources)
     */
    disposeAll() {
        for (const [name, channel] of this.channels) {
            log.info(`Disposing channel: ${name}`);
            channel.dispose();
        }
        this.channels.clear();
    }
    /**
     * Get all enabled channels
     */
    getEnabledChannels() {
        return Array.from(this.channels.values()).filter((c) => c.enabled);
    }
    /**
     * Get all registered channel names
     */
    getChannelNames() {
        return Array.from(this.channels.keys());
    }
    /**
     * Get status of all channels
     */
    getAllStatus() {
        return Array.from(this.channels.values()).map((c) => c.getStatus());
    }
    /**
     * Get the number of registered channels
     */
    get size() {
        return this.channels.size;
    }
}
//# sourceMappingURL=channels.js.map