/**
 * Telnyx webhook signature verification
 *
 * Verifies ED25519 signatures on incoming Telnyx webhooks.
 * See: https://developers.telnyx.com/docs/webhooks/signature-verification
 */
import { createPublicKey, verify } from 'crypto';
/** Maximum age of a webhook timestamp (5 minutes) */
const MAX_TIMESTAMP_AGE_SECONDS = 5 * 60;
/** Maximum future time tolerance (1 minute to account for clock skew) */
const MAX_TIMESTAMP_FUTURE_SECONDS = 60;
/**
 * Verify a Telnyx webhook signature
 *
 * @param body - The raw request body
 * @param signatureHeader - The telnyx-signature-ed25519 header (base64)
 * @param timestampHeader - The telnyx-timestamp header (unix timestamp string)
 * @param publicKeyPem - The Telnyx public key in PEM format
 * @returns true if signature is valid and timestamp is within tolerance
 * @throws Error if required parameters are missing or invalid
 */
export function verifyTelnyxSignature(body, signatureHeader, timestampHeader, publicKeyPem) {
    // Validate required inputs (fail-fast per CLAUDE.md)
    if (signatureHeader === '') {
        throw new Error('Webhook signature header is required');
    }
    if (timestampHeader === '') {
        throw new Error('Webhook timestamp header is required');
    }
    // Parse and validate timestamp
    const timestamp = parseInt(timestampHeader, 10);
    if (isNaN(timestamp)) {
        throw new Error('Webhook timestamp is invalid: not a number');
    }
    // Check timestamp is within acceptable window
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;
    if (age > MAX_TIMESTAMP_AGE_SECONDS) {
        // Timestamp too old - possible replay attack
        return false;
    }
    if (age < -MAX_TIMESTAMP_FUTURE_SECONDS) {
        // Timestamp too far in the future - clock skew or manipulation
        return false;
    }
    // Construct the signed payload (timestamp|body)
    const payload = `${timestampHeader}|${body}`;
    // Decode the base64 signature
    let signatureBuffer;
    try {
        signatureBuffer = Buffer.from(signatureHeader, 'base64');
    }
    catch {
        // Invalid base64 encoding
        return false;
    }
    // Verify the ED25519 signature
    try {
        const publicKey = createPublicKey(publicKeyPem);
        const isValid = verify(null, Buffer.from(payload), publicKey, signatureBuffer);
        return isValid;
    }
    catch {
        // Invalid public key or signature format
        // Re-throw if it's a key error (configuration issue)
        // Return false if it's a signature verification error
        throw new Error('Invalid public key format');
    }
}
//# sourceMappingURL=webhook-signature.js.map