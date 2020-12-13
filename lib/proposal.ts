export enum DocumentType {
    Game = 'game',
    Character = 'character',
    Move = 'move'
}

export enum Sentiment {
    Neutral = 'neutral',
    Positive = 'positive',
    Negative = 'negative',
}

export interface Attribute {
    title: string,
    value: string,
    sentiment: Sentiment
}

export interface Document {
    type: DocumentType,
    game?: string,
    character?: string,
    title: string,
    attributes: Array<Attribute>,
    media: unknown,
    names: Array<string>
}

export interface Proposal {
    target: string,
    importAs: string,
    document: Document
}

export function getApiPathForType(type: DocumentType): string {
    const MAP = new Map([
        [DocumentType.Game, 'games'],
        [DocumentType.Character, 'chars'],
        [DocumentType.Move, 'moves']
    ]);

    return MAP.get(type);
}