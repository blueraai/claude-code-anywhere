/**
 * Telnyx webhook signature verification
 *
 * Verifies ED25519 signatures on incoming Telnyx webhooks.
 * See: https://developers.telnyx.com/docs/webhooks/signature-verification
 */
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
export declare function verifyTelnyxSignature(body: string, signatureHeader: string, timestampHeader: string, publicKeyPem: string): boolean;
//# sourceMappingURL=webhook-signature.d.ts.map