export const memorySlots = ['opening', 'history'] as const;
export type MemorySlot = typeof memorySlots[number];
export const memoryLabels = {opening: 'Community memories', history: 'Shared worlds & moments'};

