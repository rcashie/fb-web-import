import { IMPORT_NAME } from './common.js'
import { Proposal, DocumentType, Sentiment } from '../lib/proposal.js'

export function getGameProposal(): Proposal {
    return {
        target: 'sfv',
        importAs: IMPORT_NAME,
        document: {
            title: 'Street Fighter V',
            type: DocumentType.Game,
            names: [],
            media: {},
            attributes: [
                {
                    title: 'Publisher',
                    value: 'Capcom',
                    sentiment: Sentiment.Neutral
                },
                {
                    title: 'Original Release',
                    value: 'February 16, 2016',
                    sentiment: Sentiment.Neutral
                }
            ]
        }
    }
}