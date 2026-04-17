/**
 * Kafka producer/consumer utilities
 */

export interface KafkaProducer {
  send(topic: string, messages: unknown[]): Promise<void>;
  disconnect(): Promise<void>;
}

export interface KafkaConsumer {
  subscribe(topic: string): Promise<void>;
  run(onMessage: (message: unknown) => Promise<void>): Promise<void>;
  disconnect(): Promise<void>;
}

// Stub implementations - actual Kafka clients will be implemented per service
export const createProducer = async (): Promise<KafkaProducer> => {
  return {
    send: async () => {},
    disconnect: async () => {},
  };
};

export const createConsumer = async (): Promise<KafkaConsumer> => {
  return {
    subscribe: async () => {},
    run: async () => {},
    disconnect: async () => {},
  };
};
