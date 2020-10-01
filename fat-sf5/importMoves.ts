import { sanitizeForId, capitalize, IMPORT_NAME } from './common.js';
import { Proposal, DocumentType, Attribute, Sentiment } from '../lib/proposal.js';

const STAT_NAMES = new Map([
    ['startup', 'Startup'],
    ['active', 'Active'],
    ['onBlock', 'On Block'],
    ['recovery', 'Recovery'],
    ['onHit', 'On Hit'],
    ['damage', 'Damage'],
    ['stun', 'Stun']
]);

function parseStatement(value: string): number {
    // Matches operator and operand
    // 10   - Implied add operator
    // * 10 - Explicit add operator
    // x 10 - Explicit multiply operator
    const regex = /([x*])?\s*(?<!\([\s|\d]*)(\d+)(?![\s|\d]*\))/g;

    interface Cmd {
        op: string,
        arg: number
    }

    const cmds: Array<Cmd> = [];
    let match: RegExpExecArray;
    while ((match = regex.exec(value)) !== null) {
        cmds.push({
            op: match[1] || '*',
            arg: parseInt(match[2])
        });
    }

    // Do all the multiplications first
    for (let i = 0; i < cmds.length; ++i) {
        const cmd = cmds[i];
        if (cmd.op === 'x') {
            const prevCmd = cmds[i - 1];
            cmds[i - 1] = {
                op: prevCmd.op,
                arg: prevCmd.arg * cmd.arg
            };

            cmds.splice(i, 1);
            --i;
        }
    }

    // Add them
    let result = 0;
    cmds.forEach(cmd => result += cmd.arg);
    return result;
}

function parseValue(value: string, stat: string): string {
    let result: string;
    if (stat === 'damage' || stat === 'stun') {
        // Matches formats:
        // a * b (c)
        // a x b (c)
        // a x b * c (d)
        const regex = /^\d+(?:(?:\s*[*|x]\s*\d+)+)?(?:\s*\(\d+\))?$/g;
        result = regex.exec(value) ? parseStatement(value).toString() : value;
    } else if (stat === 'onHit' || stat === 'onBlock') {
        // Just take the last non-bracketed number
        const regex = /(?<!\([\s|\d]*)(-?\d+)(?![\s|\d]*\))/g;
        let match: RegExpExecArray;
        let lastValue: string;
        while ((match = regex.exec(value)) !== null) {
            lastValue = match[0];
        }

        const asInt = parseInt(lastValue);
        result = isNaN(asInt) ? value : asInt.toString();
    } else {
        result = value;
    }

    return result;
}

function createAttributes(stats: Record<string, string | number>): Array<Attribute> {
    const attributes: Array<Attribute> = [];
    STAT_NAMES.forEach((statName, stat) => {
        const src = stats[stat] && stats[stat].toString().trim();
        if (!src || src === '~') {
            return;
        }

        const value = parseValue(src, stat);
        let sentiment: Sentiment;
        if (stat === 'onBlock' || stat === 'onHit') {
            const asInt = parseInt(value);
            sentiment = !isNaN(asInt) && asInt < 0
                ? Sentiment.Negative
                : Sentiment.Positive;
        } else {
            sentiment = Sentiment.Neutral;
        }

        attributes.push({
            title: statName,
            value,
            sentiment
        });
    });

    return attributes;
}

function buildCommonNameTags(title: string): Array<string> {
    const tags: Array<string> = [];
    const items = [
        { regex: /(?<=\s+|^)LP(?=\s+|$)/gi, tags: ['Light Punch', 'Jab']},
        { regex: /(?<=\s+|^)MP(?=\s+|$)/gi, tags: ['Medium Punch', 'Strong']},
        { regex: /(?<=\s+|^)HP(?=\s+|$)/gi, tags: ['Hard Punch', 'Fierce']},
        { regex: /(?<=\s+|^)LK(?=\s+|$)/gi, tags: ['Light Kick', 'Short']},
        { regex: /(?<=\s+|^)MK(?=\s+|$)/gi, tags: ['Medium Kick', 'Forward']},
        { regex: /(?<=\s+|^)HK(?=\s+|$)/gi, tags: ['Hard Kick', 'Roundhouse']},
    ];

    items.forEach( item => {
        let result = title.match(item.regex);
        if (result) {
            tags.push(...item.tags);
        }
    });

    return tags;
}

function buildProposalsForSet(charId: string, setName: string, set: Record<string, unknown>): Array<Proposal> {
    const proposals: Array<Proposal> = [];
    for (const move in set) {
        // Remove any v-trigger related strings as we add those ourselves
        let name = move.replace(/\((?:(?:v-trigger\s+\d)|(?:vt))\)/gi, '');
        let title = capitalize(name).trim();
        let target = `${charId}.${sanitizeForId(name)}`;

        if (setName) {
            title = `${setName} | ${title}`;
            target = `${target}__${setName === 'V-Trigger 1' ? 'vt1' : 'vt2'}`;
        }

        const attributes = createAttributes(set[move] as Record<string, string | number>);

        // Skip empty moves
        if (!attributes.length) {
            console.warn(`Skipping ${target}: No attributes`);
            continue;
        }

        proposals.push({
            target,
            importAs: IMPORT_NAME,
            document: {
                type: DocumentType.Move,
                character: charId,
                title,
                attributes,
                media: {},
                tags: buildCommonNameTags(title)
            }
        });
    }

    return proposals;
}

function buildMoveProposals(charId: string, dataSource: Record<string, unknown>): Array<Proposal> {
    const proposals = buildProposalsForSet(charId, null, dataSource.normal as Record<string, unknown>);
    proposals.push(...buildProposalsForSet(charId, 'V-Trigger 1', dataSource.vtOne as Record<string, unknown>));
    proposals.push(...buildProposalsForSet(charId, 'V-Trigger 2', dataSource.vtTwo as Record<string, unknown>));
    return proposals;
}

export { buildMoveProposals };
