import { sanitizeForId, capitalize, IMPORT_NAME } from './common.js';
import { buildMoveProposals } from './importMoves.js';
import { Proposal, DocumentType, Attribute, Sentiment } from '../lib/proposal.js';

const STAT_NAMES = new Map([
    ['health', 'Health'],
    ['stun', 'Stun'],
    ['fWalk', 'Forward Walk'],
    ['bWalk', 'Back Walk'],
    ['fDash', 'Forward Dash'],
    ['bDash', 'Back Dash'],
    ['vgauge1', 'V Gauge 1'],
    ['vgauge2', 'V Gauge 2'],
    ['throwHurt', 'Throw Damage'],
    ['throwRange', 'Throw Range']
]);

function createAttributes(stats: Record<string, string | number>): Array<Attribute> {
    const attributes: Array<Attribute> = [];
    STAT_NAMES.forEach((statName, statKey) => {
        const value = stats[statKey];
        if (value) {
            attributes.push(
                {
                    title: statName,
                    value: `${value}`,
                    sentiment: Sentiment.Neutral
                }
            );
        }
    });

    return attributes;
}

function buildCharProposals(gameId: string, dataSource: Record<string, unknown>): Array<Proposal> {
    const proposals: Array<Proposal> = [];
    for (const name in dataSource) {
        const charDataSource = dataSource[name] as Record<string, unknown>;
        const target = `${gameId}.${sanitizeForId(name)}`;
        const proposal: Proposal = {
            target,
            importAs: IMPORT_NAME,
            document: {
                game: gameId,
                type: DocumentType.Character,
                title: capitalize(name),
                attributes: createAttributes(charDataSource.stats as Record<string, string | number>),
                media: {},
                tags: []
            }
        };

        proposals.push(proposal);
        proposals.push(...buildMoveProposals(target, charDataSource.moves as Record<string, unknown>));
    }

    return proposals;
}

export { buildCharProposals };