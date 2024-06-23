export interface OutboundMessage {
    /**
     * Transforms the message into the API representation.
     * @returns An object representing the message in the API format.
     */
    transformToApiRepresentation(): object

    /**
     * Returns the API type for the message.
     * @returns The string indicating the message type.
     */
    getApiType(): string
}