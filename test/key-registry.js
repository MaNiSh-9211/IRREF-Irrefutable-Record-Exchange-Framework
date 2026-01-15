/**
 * Key Registry for IRREF
 * 
 * Simple registry to track which public keys belong to which entities.
 * In production, this would be a CA, blockchain, or trusted registry.
 */

const fs = require('fs');
const path = require('path');

class KeyRegistry {
    constructor(registryPath) {
        this.registryPath = registryPath;
        this.registry = this.loadRegistry();
    }

    /**
     * Load registry from file
     */
    loadRegistry() {
        if (fs.existsSync(this.registryPath)) {
            return JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        }
        return {
            keys: {},
            registrations: []
        };
    }

    /**
     * Save registry to file
     */
    saveRegistry() {
        fs.writeFileSync(
            this.registryPath,
            JSON.stringify(this.registry, null, 2),
            'utf8'
        );
    }

    /**
     * Register a public key with an identity
     */
    register(publicKeyHex, identity, metadata = {}) {
        const registration = {
            publicKeyHex,
            identity,
            registeredAt: new Date().toISOString(),
            metadata,
            registrationId: this.generateRegistrationId()
        };

        // Store in registry
        this.registry.keys[publicKeyHex] = registration;
        this.registry.registrations.push(registration);

        // Save
        this.saveRegistry();

        console.log(`✓ Registered public key for: ${identity}`);
        console.log(`  Public key: ${publicKeyHex.substring(0, 32)}...`);
        console.log(`  Registration ID: ${registration.registrationId}`);
        console.log(`  Registered at: ${registration.registeredAt}`);

        return registration;
    }

    /**
     * Verify if a public key is registered
     */
    verify(publicKeyHex) {
        const registration = this.registry.keys[publicKeyHex];
        
        if (!registration) {
            return {
                verified: false,
                error: 'Public key not found in registry'
            };
        }

        return {
            verified: true,
            identity: registration.identity,
            registeredAt: registration.registeredAt,
            registrationId: registration.registrationId,
            metadata: registration.metadata
        };
    }

    /**
     * Get all registrations for an identity
     */
    getRegistrationsForIdentity(identity) {
        return this.registry.registrations.filter(
            reg => reg.identity === identity
        );
    }

    /**
     * Generate registration ID
     */
    generateRegistrationId() {
        return `REG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Export registry (for public verification)
     */
    export() {
        return {
            registry: this.registry,
            exportedAt: new Date().toISOString(),
            totalKeys: Object.keys(this.registry.keys).length
        };
    }
}

module.exports = { KeyRegistry };

